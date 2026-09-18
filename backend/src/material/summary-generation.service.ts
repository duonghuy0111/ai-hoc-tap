import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { retryAsync } from "src/shared/retry.util";

@Injectable()
export class SummaryGenerationService {
    private readonly logger = new Logger(SummaryGenerationService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });
    }
    async generateSummary(fullText: string, materialTitle: string): Promise<string> {
        const truncatedText = fullText.length > 40000 ? fullText.slice(0, 40000) + '\n\n[... nội dung bị cắt bớt do quá dài ...]' : fullText;
        const prompt = `Bạn là trợ lý học tập. Hãy tóm tắt nội dung tài liệu "${materialTitle}" dưới đây thành bản tóm tắt ngắn gọn, dễ hiểu bằng Tiếng Việt.
       
        
        Nội dung tài liệu:
        ${truncatedText}`;
        const response = await retryAsync(() =>
            this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system', content: `Bạn là trợ lý học tập. Hãy tóm tắt tài liệu ngắn gọn, dễ hiểu bằng Tiếng Việt (300-500 từ), sử dụng gạch đầu dòng và tuyệt đối không thêm kiến thức bên ngoài.
                                            Yêu cầu: 
                                            - Nêu rõ các ý chính, khái niệm quan trọng theo đúng cấu trúc tài liệu (không đảo lộn thứ tự).
                                            - Độ dài khoảng 300-500 từ - đủ để nắm nhanh nội dung mà không cần đọc hết tài liệu gốc.
                                            - Dùng gạch đầu dòng cho các ý chính nếu phù hợp.
                                            - Chỉ tóm tắt dựa trên nội dung được cung cấp, không thêm kiến thức ngoài.`,
                    },
                    {
                        role: 'user', content: `Tên tài liệu: "${materialTitle}"\n\nNội dung tài liệu:\n${truncatedText}`
                    }
                ],
            }),
        );
        const text = response.choices[0]?.message?.content;
        if (!text) {
            throw new Error('Không nhận được nội dung tóm tắt từ AI');
        }
        return text;
    }
}