import { Injectable } from "@nestjs/common";

@Injectable()
export class ChunkingService {
    private readonly chunkSize = 400; // số từ mỗi chunk
    private readonly overLap = 50; // số từ chồng lẫn giữa 2 chunk liên tiếp

    chunkText(text: string): string[] {
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0 ) return [];

        const chunks: string[] = [];
        const step = this.chunkSize - this.overLap; // bước nhảy = 350 từ
        for(let start = 0 ; start< words.length; start += step) {
            const end = Math.min(start  + this.chunkSize, words.length);
            const chunkWords =  words.slice(start,end);
            chunks.push(chunkWords.join(' '));

            if(end === words.length) break; // nếu chạm cuối văn bản thì dừng (tránh chunk rỗng/trùng lặp thừa)
        }
        return chunks;
    }
}