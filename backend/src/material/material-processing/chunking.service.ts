import { Injectable } from "@nestjs/common";

@Injectable()
export class ChunkingService {
    private readonly chunkSize = 400; 
    private readonly overLap = 50; 

    chunkText(text: string): string[] {
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0 ) return [];

        const chunks: string[] = [];
        const step = this.chunkSize - this.overLap; 
        for(let start = 0 ; start< words.length; start += step) {
            const end = Math.min(start  + this.chunkSize, words.length);
            const chunkWords =  words.slice(start,end);
            chunks.push(chunkWords.join(' '));

            if(end === words.length) break; 
        }
        return chunks;
    }
}