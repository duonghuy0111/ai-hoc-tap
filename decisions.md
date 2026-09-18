## Backend
Chọn NestJS vì:
 - Có cấu trúc rõ ràng, module hóa dễ mở rộng
 - Phù hợp dự án lớn, tách rõ AuthModule, SubjectModule, RagModule,...
 - Hỗ trợ Dependency Injection có sẵn

## Frontend
Chọn ReactJS vì:
 - Component dễ tái sử dụng
 - Hệ sinh thái lớn
 - Dễ tích hợp AI (chat UI, streaming response ....)

## Database
Chọn PostgreSQL vì:
 - Mạnh, ổn định
 - Prisma hỗ trợ tốt
 - Hỗ trợ extension pgvector, không cần thêm database riêng cho vector

## Vector Database
Chọn pgvector thay vì Chroma/Pinecone vì: 
 - Không cần thêm service riêng, giảm độ phức tạp hạ tầng
 - Dữ liệu quan hệ và vector nằm cùng một database, dễ join truy vấn 
 - Phù hợp quy mô đồ án cá nhân (dữ liệu không quá lớn) 

## Dữ liệu cần
Môn Kiểm thử phần mềm:
 - Có nhiều tài liệu
 - Hiểu kiến thức
 - Dễ kiểm tra AI trả lời đúng sai 
    
## Sửa lỗi thiết kế 
 - Phát hiện Subject ban đầu thiếu userId, dẫn đến mọi user sẽ thấy chung danh sách môn học. 
 --> Đã bổ sung quan hệ User 1-N Subject để đảm bảo dữ liệu cá nhân hóa đúng. 

# Auth
 - Dùng bcrypt hash password (salt rounds = 10) vì đây là chuẩn phổ biến, cân bằng giữa bảo mật và hiệu năng
 - Tách Access Token (ngắn hạn) và Refresh Token (dài hạn) để giảm rủi ro khi Access Token bị lộ, đồng thời giúp người dùng không phải đăng nhập lại thường xuyên
 - Áp dụng ownership check bằng cách gộp điều kiện {id,userId} ngay trong truy vấn Prisma (findFirst), giúp ngăn chặn lỗi IDOR và tránh việc quên kiểm tra quyền sở hữu sau khi truy vấn dữ liệu

## Upload PDF
Quyết định
- Sử dụng `FileInterceptor` của NestJS kết hợp Multer để upload tài liệu PDF.

Lý do
- Tích hợp sẵn với NestJS.
- Hỗ trợ `multipart/form-data`.
- Dễ giới hạn loại file và kích thước file.
- Phù hợp với quy mô đồ án.

## Lưu file vật lý
Quyết định
- Lưu file vào thư mục `uploads/`, chỉ lưu metadata trong PostgreSQL.

Lý do
- Giảm dung lượng database.
- Thuận tiện cho việc xử lý PDF và extract text.
- Dễ quản lý file và mở rộng sau này.

## Ownership Check

Quyết định
- Kiểm tra `subjectId` có thuộc về user hiện tại trước khi tạo Material bằng cách tái sử dụng `SubjectService.findOne(userId, subjectId)`.

Lý do
- Ngăn người dùng upload tài liệu vào Subject của người khác.
- Không lặp lại logic kiểm tra quyền.

Kết quả
Đã kiểm thử:
- User A upload vào Subject A → Thành công.
- User B upload vào Subject A → Trả về `404 - Không tìm thấy môn học`.

## Background Processing
Quyết định
- Sau khi upload, trả response ngay cho client và dùng `setImmediate()` để extract PDF ở background.

Lý do
- Không block request.
- Tránh timeout khi upload file lớn.
- Có thể thay thế bằng BullMQ khi hệ thống mở rộng.

Flow

Upload PDF --> Material.status = processing --> Trả response cho client --> Background extract text --> Material.status = ready / failed

## PDF Extraction
Quyết định
- Sử dụng `pdfjs-dist` để extract text từ PDF.

Lý do
- Thử nghiệm thực tế trên các file PDF tiếng Việt.
- `pdf-parse` làm mất khoảng trắng giữa các từ, ảnh hưởng đến chất lượng dữ liệu.
- `pdfjs-dist` giữ khoảng trắng tốt hơn, phù hợp cho bước Chunking và Embedding.

Quan sát
- Một số PDF vẫn còn lỗi encoding ở một vài ký tự đặc biệt do font được nhúng trong PDF.
- Chấp nhận được vì nội dung vẫn đọc được và không ảnh hưởng đáng kể đến chất lượng RAG.

## Material Status
Quyết định
- Material có 3 trạng thái:
  - `processing`
  - `ready`
  - `failed`

Lý do
- Frontend có thể theo dõi tiến trình xử lý tài liệu.
- AI chỉ sử dụng tài liệu khi trạng thái là `ready`.

## API
Đã hoàn thành:
- `POST /subjects/:subjectId/materials`
- `GET /materials/:id`

## Testing
Đã kiểm thử thành công:

- Upload PDF.
- Lưu file vào thư mục `uploads/`.
- Lưu Material vào PostgreSQL.
- Background processing hoạt động.
- Status chuyển `processing → ready`.
- Extract text thành công bằng `pdfjs-dist`.
- `GET /materials/:id` trả đúng trạng thái.
- Ownership check hoạt động đúng.
- User không thể upload vào Subject của người khác.

## Future Improvements
- Chuẩn hóa khoảng trắng và xuống dòng tốt hơn dựa trên tọa độ text của `pdfjs-dist`.
- Xóa file vật lý nếu upload thất bại hoặc ownership check không thành công.
- Chuyển background processing sang BullMQ khi hệ thống có nhiều tài liệu xử lý đồng thời.
- Bổ sung cơ chế retry khi extract PDF thất bại.

## Bài học: migrate dev tự động xóa ivfflat index
 - Vấn đề: prisma migrate dev (không có --create-only) tự động diff schema.prisma với DB và tự áp dụng thay đổi ngay lập tức. Vì schema.prisma không thể khai báo đầy đủ index kiểu ivfflat (đặc thù pgvector), Prisma liên tục hiểu nhầm index này là "thừa" và tự tạo migration xóa nó.
 - Xử lý: reset lại database để đồng bộ hoàn toàn theo migration files trên ổ đĩa (nơi index vẫn còn nguyên từ migration gốc).
 - Quy trình mới, áp dụng từ nay: luôn dùng `migrate dev --create-only --name <tên>` để soạn migration, đọc kỹ file .sql sinh ra, rồi mới `migrate deploy` để áp dụng. Không dùng `migrate dev` trần (không cờ) cho dự án này nữa.

## Chunking + Lưu chunk vào DB
Quyết định
- Chunk theo từ trên toàn bộ text, không tách riêng theo trang PDF — đơn giản hoá cho đồ án, field `page` để null
- chunkSize = 400 từ, overlap = 50 từ (bước nhảy 350 từ/lần) — đủ giữ ngữ cảnh qua ranh giới chunk
- Dùng `createMany` thay vì loop `create` — giảm số round-trip tới DB
- Validate loại file (chỉ nhận PDF) ngay ở controller — chặn sớm, tránh tạo Material/chunk rác cho file không hợp lệ

Kết quả test
- File 04-Selenium.pdf: 6 chunk, chunkIndex đúng thứ tự 0-5
- File Kiểm thử hộp trắng: 17 chunk
- File Kiểm thử hộp đen: 18 chunk
- Tất cả overlap hoạt động đúng (chunk sau bắt đầu bằng đoạn cuối chunk trước)
- Upload file .png → bị chặn 400 Bad Request, không tạo record rác

## Lưu trùng extractedText và MaterialChunk
- Cố ý giữ cả 2: extractedText làm bản gốc dự phòng, cho phép re-chunk với tham số khác (đổi chunkSize/overlap) mà không cần extract lại PDF từ đầu.
   
## Hoàn thiện Auth refresh token
- Thêm endpoint /auth/refresh và claim `type` (access/refresh) để phân biệt 2 loại token, chặn refresh token bị dùng để gọi API thường qua JwtStrategy. Trước đó access/refresh token dùng chung secret và không phân biệt loại — đã phát hiện và vá trong quá trình review lại kiến trúc trước khi làm Frontend.

## Tách trạng thái lỗi Material Processing
- Thêm status `ready_embedding_failed` để phân biệt với `failed` hoàn toàn — tránh phải extract lại PDF khi chỉ bước embedding lỗi (thường do lỗi mạng/API tạm thời, không phải lỗi dữ liệu).

## Thêm rate limiting cho RAG endpoints
- Dùng @nestjs/throttler giới hạn 5 request/phút cho endpoint /ask — trả lời trực tiếp cho câu hỏi "xử lý sao nếu chi phí API tăng cao khi nhiều user" đã đặt ra từ đầu đồ án.


## Embedding
Quyết định 
- Gemini `gemini-embedding-001`, 768 chiều, dùng asymmetric embedding: `taskType: RETRIEVAL_DOCUMENT` khi embed tài liệu, `taskType: RETRIEVAL_QUERY` khi embed câu hỏi.

Lý do 
- Đây là best practice của Gemini embedding cho bài toán retrieval — tối ưu chất lượng matching giữa câu hỏi và tài liệu hơn so với dùng chung 1 task type.

- Lưu vector qua `$executeRaw` (Prisma chưa hỗ trợ native kiểu `vector`), dùng tagged template nên tự động parameterize, an toàn khỏi SQL injection dù phải nối chuỗi vector literal vào câu lệnh.

## Kết quả embedding
 - Verified: 13/13 chunk của file 04-Selenium.pdf đều có embedding thành công (768 chiều), không có lỗi hay chunk bị bỏ sót.
 - Pipeline hoàn chỉnh: Upload -> Extract (pdfjs-dist) -> Chunk (400 từ, overlap 50) -> Embedding (gemini-embedding-001, RETRIEVAL_DOCUMENT) -> Lưu vector qua $executeRaw.

## RAG Q&A 
### Rerank — thêm tầng chấm điểm relevance trước khi trả context cho LLM
Quyết định 
- Sau khi lấy top ứng viên bằng vector similarity search (`candidateK = max(topK*3, 15)`), đưa qua `RerankService` dùng Gemini `gemini-3.5-flash` chấm điểm relevance 0-10 cho từng chunk so với câu hỏi, rồi sắp xếp lại theo điểm rerank thay vì chỉ theo similarity thô.

Lý do 
- Vector similarity đơn thuần dễ bị nhiễu (2 đoạn văn có thể giống nhau về mặt từ vựng nhưng không thực sự trả lời được câu hỏi). Rerank bằng LLM cho kết quả relevance chính xác hơn nhiều so với chỉ dùng cosine similarity.

- Cơ chế phòng thủ nếu rerank lỗi (parse JSON fail, model lỗi, timeout...) → tự động fallback về thứ tự similarity gốc, không làm gián đoạn cả pipeline.

### Answer Generation — tách service riêng cho bước sinh câu trả lời
Quyết định
- Tạo `AnswerGenerationService` riêng biệt (không gộp vào `RagService`), nhận câu hỏi + các chunk liên quan (kèm số trang), build prompt yêu cầu model chỉ trả lời dựa trên ngữ cảnh được cung cấp, nói rõ khi không đủ thông tin thay vì suy diễn, gọi Gemini `generateContent` sinh câu trả lời cuối cùng bằng tiếng Việt.

Lý do tách service riêng 
- Giữ nguyên tắc mỗi service 1 trách nhiệm (đã áp dụng nhất quán từ `EmbeddingService`/`RerankService`/`ChunkingService`) — dễ test độc lập, dễ đổi model/prompt sau này mà không ảnh hưởng logic retrieval.

### Cơ chế chặn hallucination (ngưỡng threshold)
Quyết định 
- Dùng `rerankScore` (thang 0-10) làm tiêu chí chính quyết định "đủ thông tin để trả lời", fallback về `similarity` (thang 0-1) khi rerank không chạy được. Giá trị khởi điểm: `RERANK_THRESHOLD = 5`, `SIMILARITY_THRESHOLD = 0.5`.

### Lưu lịch sử chat
Quyết định 
- Lưu cả câu hỏi (`role=user`) và câu trả lời (`role=assistant`) vào `ChatMessage` ngay sau mỗi lần gọi `/ask`, có API `GET /subjects/:id/chat-history` lấy lại theo thứ tự thời gian.
**Kết quả kiểm thử:** gọi `/ask` nhiều lần liên tiếp, `chat-history` trả đúng thứ tự, đúng nội dung.

### Vấn đề phát hiện khi review lại kiến trúc trước khi làm Frontend
- Refresh token được sinh ra nhưng chưa từng có endpoint sử dụng nó — user vẫn phải đăng nhập lại sau mỗi 15 phút, đúng vấn đề refresh token sinh ra để giải quyết nhưng chưa giải quyết được. Ngoài ra, access token và refresh token đang dùng chung 1 secret, cùng payload, chỉ khác thời hạn — không có cách phân biệt 2 loại token.

Quyết định
- Thêm endpoint `POST /auth/refresh`.
- Thêm claim `type: 'access' | 'refresh'` vào payload JWT khi sign, để phân biệt rõ 2 loại.
- `JwtStrategy.validate()` chặn thẳng nếu `payload.type === 'refresh'` — ngăn refresh token bị dùng để gọi API thường.
- `AuthService.refresh()` verify refresh token, xác nhận user còn tồn tại trong DB, cấp lại cặp token mới.

Kết quả kiểm thử (đầy đủ 6 case)
- Refresh token hợp lệ → nhận token mới, dùng gọi API thành công.
- Đưa nhầm access token vào chỗ refresh token → 401 đúng message.
- Refresh token rác/hỏng → 401, không crash.
- Thiếu field trong body → 400 (DTO validate).
- Dùng refresh token gọi thẳng API thường (`GET /subjects`) → 401 (xác nhận đúng phần vá bảo mật quan trọng nhất).
- Access token thật vẫn hoạt động bình thường, không bị ảnh hưởng.

## Material Processing
- Vấn đề phát hiện `process()` bọc toàn bộ pipeline (extract → chunk → save → embed) trong 1 try-catch, set `status = 'failed'` nếu bất kỳ bước nào lỗi — không phân biệt được "lỗi extract/chunk" (nghiêm trọng, cần làm lại từ đầu) với "lỗi embedding" (thường do mạng/API tạm thời, phần khó — extract PDF tiếng Việt — đã xong).

Quyết định 
- Thêm trạng thái `ready_embedding_failed`, tách try-catch riêng cho bước embedding. `reprocess()` khi gặp status này chỉ gọi lại bước embedding, không extract lại từ đầu.

### Lỗi âm thầm phát hiện thêm khi test: `embedBatch` nuốt exception
- Trong lúc test case lỗi embedding, phát hiện try-catch bên trong `embedBatch()` tự nuốt lỗi và trả về mảng `null` thay vì throw — khiến `material-processing.service.ts` không bao giờ bắt được lỗi để set đúng status, Material vẫn bị đánh dấu `ready` dù toàn bộ embedding là `null`. Đây là lỗi âm thầm nguy hiểm hơn crash rõ ràng, vì hệ thống báo "thành công" trong khi dữ liệu thực chất không dùng được cho RAG.

Quyết định 
- Bỏ try-catch trong `embedBatch`, để lỗi (kể cả trường hợp response thiếu field `embeddings`) throw ra ngoài; bọc thêm `retryAsync` để tự phục hồi với lỗi mạng tạm thời trước khi thực sự throw. `material-processing.service.ts` là nơi duy nhất quyết định status cuối cùng.

### Kết quả kiểm thử
10:50:03 - Sinh ra 17 chunk cho material ...
10:50:05 - ERROR: Embedding thất bại ... 401 UNAUTHENTICATED (test bằng API key sai)
10:51:44 - Material ... chỉ lỗi embedding - chỉ embed lại, không extract lại
10:51:46 - Đã embedding xong
Status chuyển đúng `ready_embedding_failed` khi embedding lỗi (~2s, khớp với retry 3 lần trước khi bỏ cuộc). Reprocess sau đó chỉ embed lại, không extract lại — đúng thiết kế.

### Retry cho lời gọi Gemini API
Quyết định 
- Viết `retryAsync` dùng chung (retry tối đa 2 lần, delay tăng dần), áp dụng cho `embedQuery`, `embedBatch`, `rerank`, `generateAnswer`.
Lý do 
- API bên thứ 3 có thể lỗi tạm thời (rate limit, timeout ngẫu nhiên) — retry giảm đáng kể tỷ lệ thất bại giả, đặc biệt quan trọng lúc demo trực tiếp trước hội đồng.

Kết quả kiểm thử
- `embedQuery`/`embedBatch` (giả lập bằng API key sai): retry đúng ~2s trước khi throw.
- `rerank` (giả lập bằng model không tồn tại): fail nhanh (~vài trăm ms, lỗi 404 trả nhanh), tự fallback về similarity gốc, `/ask` vẫn trả 200/201 bình thường — xác nhận rerank có chiến lược lỗi "êm" có chủ đích.
- `generateAnswer` (giả lập bằng model không tồn tại): lỗi throw ra ngoài qua `retryAsync` → `AllExceptionsFilter` bắt đúng, trả 500 generic — xác nhận answer-generation có chiến lược lỗi "báo thẳng" có chủ đích (khác rerank vì đây là bước cuối, không có gì để fallback thêm).

- Stack trace lúc test (`generateAnswer thất bại`) xác nhận đúng luồng: `retryAsync` --> `AnswerGenerationService.generateAnswer` --> `RagService.askQuestion` --> `RagController.ask` --> `AllExceptionsFilter`.

### Rate limiting
Quyết định 
- Dùng `@nestjs/throttler`, giới hạn chung 20 request/phút/IP toàn app, riêng endpoint `/ask` giới hạn chặt hơn — 5 request/phút (vì đây là endpoint tốn chi phí API thật nhất, gọi tối thiểu 3 lượt Gemini/lần).
Lý do 
- Trả lời trực tiếp cho câu hỏi tự đặt ra từ đầu đồ án ("nếu chi phí LLM API tăng cao khi nhiều user, xử lý sao?") bằng code thật, không chỉ nói suông.

### Global Exception Filter
Quyết định 
- Thêm `AllExceptionsFilter` chuẩn hoá format lỗi trả về client (`{statusCode, timestamp, path, message}`), chỉ generic hoá message cho lỗi 500 (không lộ stack trace ra ngoài), giữ nguyên message gốc cho lỗi 400/401/404. Stack trace đầy đủ vẫn được ghi log phía server qua `Logger.error`.
Kết quả kiểm thử 
- lỗi 500 (giả lập bằng model sai) trả đúng format generic; lỗi 401 khi login sai vẫn giữ message cụ thể "Email hoặc mật khẩu không đúng" — xác nhận filter không ghi đè nhầm các lỗi nghiệp vụ.

### DTO Validation cho RAG endpoints
Quyết định 
- Thêm `AskQuestionDto` (`query`: string, bắt buộc, 3-1000 ký tự) cho cả `/ask` và `/test-search`, nhất quán với chuẩn `class-validator` đã áp dụng ở AuthModule/SubjectModule.
Lý do 
- Trước đó endpoint nhận `query` thô không qua validate — request thiếu/rỗng/quá dài đều lọt tới tận `EmbeddingService` mới báo lỗi, có thể gọi API tốn phí với input vô nghĩa.


## [Sự cố thực tế] Chạm giới hạn quota free tier khi upload nhiều file cùng lúc
- Upload 4 file PDF gần như đồng thời, material đầu tiên (100 chunk) dùng hết quota free tier (100 request/phút cho embed_content), 3 material còn lại bị 429 Quota exceeded. Xác nhận cơ chế `ready_embedding_failed` hoạt động đúng thiết kế trong tình huống lỗi thật (không phải chỉ giả lập)  extract/chunk vẫn giữ nguyên, chỉ cần reprocess lại sau khi quota reset (~1-2 phút), không mất công xử lý lại từ đầu. Bài học: nên upload file cách nhau vài chục giây khi số lượng nhiều, tránh dồn cùng lúc.

## Kết quả test threshold RAG 
Test 9/10 câu hỏi đã lên kế hoạch (1 câu bị bỏ do chạm giới hạn quota giữa chừng), threshold RERANK_THRESHOLD=5 giữ nguyên giá trị mặc định ban đầu vì dữ liệu cho thấy hoạt động đúng:
- 5 câu trong phạm vi: rerankScore cao nhất luôn = 10, nguồn phụ dao động 5-9, không có case nào gần ngưỡng 5 mà bị từ chối oan.
- 1 câu ngoài phạm vi thật (câu 7): toàn bộ candidate bị rerank dưới 5, không có source nào lọt qua, từ chối đúng.
- Phát hiện: 1 câu ban đầu định xếp "ngoài phạm vi" (về Performance/ Load/Stress Testing) thực chất nằm trong tài liệu (trang 50-55) — hệ thống trả lời đúng, không phải lỗi, chỉ là gán nhầm nhóm lúc chuẩn bị bộ test.
- Phát hiện quan trọng: hệ thống có 2 lớp chống hallucination độc lập — (1) threshold rerank/similarity chặn từ vòng retrieval, (2) LLM tự đánh giá lại trong answer-generation, từ chối trả lời dù chunk đã qua threshold nếu nội dung không thực sự đủ cụ thể để trả lời đúng câu hỏi (case câu hỏi so sánh V-Model vs thác nước - chunk nói chung về V-Model nhưng không so sánh trực tiếp, model tự nhận ra và từ chối thay vì suy diễn).
- Lưu ý: field `hasEnoughContext` phản ánh việc có chunk vượt threshold hay không, không phản ánh việc câu trả lời cuối có thực sự đủ nội dung — 2 khái niệm độc lập, cần phân biệt khi đọc log.
- Việc còn lại: bổ sung 2-3 câu ngoài phạm vi thật sự khác lĩnh vực để củng cố thêm bằng chứng vùng threshold thấp trước khi coi hoàn tất 100%.

### FRONTEND
## Xác nhận cơ chế auto-refresh hoạt động đúng
- Test bằng cách xóa accessToken, F5 trang /subjects. Do React StrictMode gọi useEffect 2 lần (chỉ ở dev), có 2 request /subjects cùng lúc bị 401, nhưng interceptor chỉ gọi /auth/refresh đúng 1 lần nhờ cơ chế hàng đợi (isRefreshing/refreshSubscribers) - xác nhận không có race condition gọi refresh trùng lặp. Cả 2 request gốc retry thành công sau khi có token mới, trang không bị đá về /login.

## Free tier giới hạn embedding 100 đơn vị/phút
- Tài liệu lớn (800+ chunk) cần nhiều phút để embed xong trên free tier do giới hạn 100 embedding request/phút (không phải 100 lần gọi API, mà 100 đơn vị text). Đã thêm delay ~61s giữa các batch con (100 item/batch) để tránh 429 liên tục. Khuyến nghị: dùng tài liệu ngắn hơn (<100 chunk, tương đương file 10-20 trang) khi demo trực tiếp để tránh chờ lâu; tài liệu dài vẫn xử lý được nhưng cần thời gian, chấp nhận được vì chạy nền không chặn UI.

## Quota ngày ảnh hưởng trực tiếp tới trải nghiệm demo
- Test Chat UI bị chặn hoàn toàn do hết quota generateContent (20/ngày, dùng chung rerank + answer-generation, mỗi câu /ask tốn 2 request). UI hiển thị "AI đang trả lời..." kéo dài do retryAsync đợi đúng thời gian Google đề xuất (~59s) trước khi trả lỗi cuối cùng - trải nghiệm người dùng không tốt khi hết quota (đợi gần 1 phút mới biết lỗi). 

- Rủi ro nghiêm trọng cho buổi bảo vệ: nếu vô tình dùng hết quota ngày trước giờ demo, hệ thống sẽ không trả lời được trong suốt phần còn lại của ngày hôm đó. Cần: (1) nâng cấp lên gói trả phí trước ngày bảo vệ, hoặc (2) hạn chế tối đa số lần test không cần thiết trong ngày bảo vệ, dành quota cho phần demo thật.

- Hướng cải tiến nếu có thời gian: giảm thời gian chờ khi biết chắc là lỗi quota (retryDelay quá dài, vd >10s) bằng cách không retry nữa mà trả lỗi ngay kèm thông báo rõ ràng "Hệ thống đang quá tải, vui lòng thử lại sau" thay vì để user chờ gần 1 phút.

## Chuyển đổi sang OpenAI hoàn tất, embedding thành công
- Sau khi active billing OpenAI, reprocess-all chạy thành công, không còn lỗi 429. Material 100 chunk embed xong trong 6 giây (nhanh hơn đáng kể so với Gemini free tier vốn cần delay ~61s/batch do giới hạn
RPM chặt). Cần re-test threshold rerank vì đổi model chấm điểm (gemini-3.5-flash -> gpt-4.1-mini) có thể cho thang điểm khác, không đảm bảo ngưỡng 5 cũ vẫn đúng.

## Chat UI hoàn tất, test đầy đủ với OpenAI
- Test 7 kịch bản: validate độ dài, trả lời đúng/từ chối đúng qua UI, lưu lịch sử chat đúng theo từng subject, rate limit hiển thị message thân thiện, điều hướng giữa các trang hoạt động đúng. Không còn bị giới hạn bởi quota ngày như lúc dùng Gemini, tốc độ phản hồi nhanh hơn đáng kể.

## Quiz Module
## Nới lỏng điều kiện status cho phép tạo quiz
- Material 'ready_embedding_failed' vẫn có đủ MaterialChunk.content (chỉ thiếu cột embedding) nên vẫn cho phép tạo quiz - quiz generation chỉ đọc text, không phụ thuộc embedding như RAG. Đã test: quiz sinh thành công từ material ở trạng thái này.

## Test validate zod — xác nhận cơ chế retry hoạt động đúng
### Lần 1 (sabotage bằng mâu thuẫn ngôn ngữ) — không tạo ra lỗi như mong đợi
- Thử ép LLM trả về "câu chào tiếng Anh, không phải JSON" bằng cách thêm dòng chỉ dẫn mâu thuẫn ở đầu prompt. Kết quả: response_format json_object là ràng buộc cấp API (OpenAI), không phải gợi ý trong prompt, nên model vẫn bắt buộc trả JSON hợp lệ đúng schema yêu cầu - chỉ "nghe theo" một phần chỉ dẫn sai (đổi ngôn ngữ câu hỏi sang tiếng Anh) trong khi vẫn giữ đúng cấu trúc JSON. Bài học: sabotage prompt không đủ mạnh nếu ràng buộc ở tầng API (response_format) vẫn giữ nguyên - cần cô lập đúng biến muốn test (cấu trúc) thay vì đổi nội dung (ngôn ngữ) nếu muốn ép lỗi validate thật sự.

- Hệ quả phụ hữu ích: phát hiện prompt gốc chưa từng yêu cầu tường minh tiếng Việt (dựa hoàn toàn vào model tự suy luận từ ngữ cảnh) - đã bổ sung dòng yêu cầu rõ ràng để tránh rủi ro tương tự khi demo.

### Lần 2 (đổi tên field JSON) — ép lỗi thành công
- Đổi "questions" thành "cauhoi" trong yêu cầu định dạng JSON của prompt, giữ nguyên mọi thứ khác. Kết quả: zod báo đúng lỗi cụ thể (expected array, received undefined tại path "questions"), retry đúng 2 lần (log cách nhau 14s, xác nhận retryAsync tầng trong cũng hoạt động), throw lỗi rõ ràng sau khi hết lượt thử, AllExceptionsFilter bắt đúng và trả response chuẩn hóa (500, không lộ stack trace). Xác nhận toàn bộ chuỗi phòng thủ (zod -> retry 2 lớp -> exception filter) hoạt động liên kết đúng với nhau.

## Ownership check Quiz + Test chấm điểm
- 4 endpoint (generate/list/detail/submit) với user khác → đúng 404 cả 4, nhất quán pattern toàn dự án.
Test submit: trộn 3 đúng/2 sai → `score=60` khớp đối chiếu tay; làm lại 100% → 2 `QuizAttempt` độc lập, không ghi đè.

## Quiz Frontend + Mastery Score

### Liên kết Quiz-Material
- Thêm materialId (optional) vào Quiz qua migration --create-only, cho phép truy vết quiz thuộc material nào để cập nhật đúng StudyTopic. Quiz cũ tạo trước migration có materialId = null, vẫn hoạt động bình thường (chấm điểm được) nhưng không cập nhật mastery score - chấp nhận được vì đây là dữ liệu test cũ, không phải dữ liệu chính thức.

### Công thức tính Mastery Score
- masteryScore_mới = masteryScore_cũ × 0.6 + score_lần_này × 0.4 (trung bình trọng số ưu tiên điểm gần đây). Lần đầu làm quiz cho 1 topic, khởi tạo bằng chính điểm lần đó.

### Phạm vi cố ý giới hạn trong tuần này
- Chưa implement nextReviewAt (thuật toán SM-2 quyết định khoảng cách ôn tập tiếp theo), tránh làm 2 việc cùng lúc gây khó test riêng biệt từng phần.

### Kết quả kiểm thử
- Test 2 lần làm quiz liên tiếp cùng material (sai nhiều -> đúng hết), xác nhận masteryScore tính đúng công thức, chỉ 1 StudyTopic được tạo (không trùng lặp), lastReviewedAt cập nhật đúng thời điểm.

## Spaced Repetition + Reminder
### Thuật toán SM-2 đơn giản hóa
- Thêm intervalDays vào StudyTopic. Công thức: masteryScore >= 80 -> tăng gấp đôi (trần 30 ngày); 50-79 -> giữ 3 ngày; <50 -> reset 1 ngày. Đơn giản hóa so với SM-2 gốc (bỏ ease factor phức tạp) - đủ thể hiện tinh thần ôn tập giãn cách theo mức độ nắm vững, phù hợp phạm vi đồ án.

Kết quả kiểm thử
- 4 lần submit liên tiếp cùng material, interval tăng đúng 1->2->4->8 khi điểm cao liên tục, reset về 3 khi điểm sụt xuống mức trung bình - khớp hoàn toàn công thức thiết kế.

### Email (Nodemailer + Gmail SMTP)
- Chọn Gmail App Password thay vì dịch vụ email chuyên dụng (SendGrid, Resend) vì miễn phí, đủ dùng cho quy mô đồ án, không cần đăng ký thêm tài khoản mới.

### Web Push (VAPID + web-push)
- Tự động dọn subscription hết hạn khi nhận status 410 từ push service, tránh tích tụ dữ liệu rác theo thời gian.

### Nguyên tắc lỗi 1 kênh không sập toàn hệ thống
- sendReviewReminder/sendToUser trả về boolean thay vì throw - lỗi gửi 1 user không làm dừng vòng lặp xử lý các user/topic khác trong cùng lần chạy cron. Nhất quán với nguyên tắc phòng thủ đã áp dụng xuyên suốt đồ án (rerank fallback, retry theo dịch vụ).

### Endpoint test thủ công /reminders/trigger-now
- Thêm để test không phải đợi cron chạy đúng giờ thật - hữu ích cho demo trước hội đồng (trigger ngay lập tức thay vì chờ 8h sáng).


## Test tổng thể + Edge case
### Kết quả regression test
- Test lại đầy đủ Auth/Subject/Material/RAG/Quiz/Reminder sau 5 tuần phát triển, không phát hiện regression bug. [Điền case mới phát hiện thật sự, ví dụ: file PDF giả đổi đuôi vượt qua fileFilter nhưng vẫn được xử lý an toàn ở bước extract].

### Bảo mật
- Ownership check nhất quán trên toàn bộ 4 module chính - user khác luôn nhận 404. SQL injection cơ bản không có tác dụng nhờ Prisma tự parameterize. .gitignore xác nhận hoạt động đúng, không còn .env bị Git track.

## Xử lý ảnh
### Quyết định công nghệ: Vision model thay vì OCR riêng
- Dùng gpt-4.1-mini (multimodal) thay vì OCR chuyên dụng (Tesseract, Google Vision). Lý do: tận dụng client OpenAI có sẵn, không cần thêm provider/API key mới; vision model còn hiểu được sơ đồ/hình minh họa, không chỉ trích chữ thuần như OCR.

### Thiết kế tái sử dụng pipeline có sẵn
- Chỉ thay bước "lấy text từ đâu" - toàn bộ chunking/embedding/state machine/RAG/Quiz phía sau không đổi. Minh chứng giá trị của việc tách rời pipeline theo từng bước độc lập từ Tuần 1.

### Giới hạn kích thước ảnh
- 8MB (thấp hơn PDF 10MB) để kiểm soát chi phí vision API.

### Kết quả kiểm thử
- [Điền số liệu thật: độ chính xác qua vài ảnh test, chi phí thực tế quan sát qua OpenAI dashboard, kết quả test tích hợp RAG/Quiz với material từ ảnh không cần sửa code ở 2 module đó].

### Hạn chế đã biết
- Ảnh mờ/chụp nghiêng có thể trích xuất sai sót một phần - giới hạn tự nhiên của vision model với ảnh chất lượng thấp. Ảnh chỉ có 1 "trang" cố định khác với PDF nhiều trang - label "trang X" khi nguồn từ ảnh có thể gây hiểu nhầm nhẹ, chưa tinh chỉnh UI để phân biệt rõ.

## Xử lý video
### Pipeline: ffmpeg (trích+nén audio) -> Whisper API -> pipeline text có sẵn
- Trích audio riêng vì Whisper chỉ nhận audio, và audio nén giảm dung lượng đáng kể so với video gốc, giúp nằm trong giới hạn 25MB của Whisper cho video ~50 phút với cấu hình nén đã chọn.

### Đơn giản hóa: không giữ timestamp theo đoạn
- Chunk toàn bộ transcript theo từ (page=null), không giữ mốc thời gian dù Whisper hỗ trợ (verbose_json có segments). Giữ timestamp đòi hỏi thêm schema + sửa RAG/Quiz prompt hiển thị định dạng thời gian - độ phức tạp tăng nhiều so với giá trị tăng thêm ở quy mô đồ án.

### Giới hạn triển khai: không deploy tính năng này lên production
- ffmpeg không có sẵn trên Render Web Service mặc định. Demo bằng máy local khi bảo vệ, không Docker hóa backend chỉ để phục vụ 1 tính năng bonus.

### Hạn chế đã biết
- Giới hạn độ dài video theo dung lượng audio nén (~50 phút).
- Không giữ timestamp, không trích dẫn "phút:giây" như "trang X".
- File audio tạm tự dọn (try/finally), video gốc vẫn giữ trong
  uploads/ - cùng hạn chế ephemeral filesystem đã ghi nhận.