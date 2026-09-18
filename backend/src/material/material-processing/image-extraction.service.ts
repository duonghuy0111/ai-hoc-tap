import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { retryAsync } from "src/shared/retry.util";
import { readFile } from "fs/promises";

@Injectable()
export class ImageExtractionService {
    private readonly logger = new Logger(ImageExtractionService.name);
    private readonly client: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private readonly configService: ConfigService) {
        this.client = new OpenAI({ apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY') });
    }

    async extractText(filePath: string, mimeType: string): Promise<string> {
        const imageBuffer = await readFile(filePath);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const response = await retryAsync(() =>
            this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Hãy trích xuất TOÀN BỘ nội dung văn bản có trong ảnh này, giữ nguyên thứ tự và cấu trúc (tiêu đề, gạch đầu dòng...) nếu có.
                                    Nếu ảnh có sơ đồ, biểu đồ, hoặc hình minh họa, hãy mô tả ngắn gọn nội dung của nó bằng 1-2 câu ngay sau phần văn bản liên quan.
                                    Chỉ trả về nội dung trích xuất dạng văn bản thuần, không thêm bình luận hay giải thích nào khác.
                                    Nếu ảnh không có nội dung học thuật gì (ảnh trống, ảnh không liên quan), trả về đúng câu: "Không có nội dung văn bản trong ảnh này."`,
                            },
                            {
                                type: 'image_url',
                                image_url: { url: dataUrl },
                            },
                        ],
                    },
                ],
            }),
        );

        const text = response.choices[0]?.message?.content;
        if (!text) {
            throw new Error('Không trích xuất được nội dung từ ảnh');
        }
        return text;
    }
}