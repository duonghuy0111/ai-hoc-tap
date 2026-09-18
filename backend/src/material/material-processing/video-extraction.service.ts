import { Injectable, Logger } from "@nestjs/common";
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from "fluent-ffmpeg";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { retryAsync } from "src/shared/retry.util";


@Injectable()
export class VideoExtractionService {
    private readonly logger = new Logger(VideoExtractionService.name);
    private readonly client: OpenAI;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.client = new OpenAI({ apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY') });
    }
    async transcribe(audioPath: string): Promise<string> {
        const MAX_WHISPER_SIZE = 25 * 1024 * 1024;
        const stats = fs.statSync(audioPath);
        if (stats.size > MAX_WHISPER_SIZE) {
            throw new Error(`File audio quá lớn (${(stats.size / 1024 / 1024).toFixed(1)}MB, giới hạn 25MB) - video quá dài, vui lòng dùng video ngắn hơn`,);
        }

        const response = await retryAsync(() =>
            this.client.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: 'whisper-1',
                language: 'vi',
                response_format: 'text',
            }),
        );

        return response as unknown as string;
    }

    async hasAudioStream(videoPath: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    this.logger.error(
                        `Không thể đọc metadata video: ${err.message}`,
                    );
                    reject(err);
                    return;
                }
                const hasAudio = metadata.streams?.some(
                    (stream) => stream.codec_type === 'audio',
                ) ?? false;
                this.logger.log(
                    `Video ${path.basename(videoPath)} có audio: ${hasAudio}`,
                );
                resolve(hasAudio);
            });
        })
    }

    async extractTextFromVideo(videoPath: string): Promise<string> {

        const hasAudio = await this.hasAudioStream(videoPath);

        if (!hasAudio) {
            this.logger.warn(
                `Video không có audio: ${videoPath}. Bỏ qua Whisper.`,
            );

            return "";
        }
        const audioPath = await this.extractAudio(videoPath);
        try {
            return await this.transcribe(audioPath);
        } finally {
            if (fs.existsSync(audioPath)) {
                fs.promises.unlink(audioPath);
                this.logger.log(`Đã xóa file audio tạm: ${audioPath}`);
            }
        }
    }

    async extractAudio(videoPath: string): Promise<string> {
        const audioPath = videoPath.replace(path.extname(videoPath), '-audio.mp3');

        return new Promise((resolve, reject) => {
            ffmpeg(videoPath).noVideo().audioCodec('libmp3lame').audioBitrate('64k').audioFrequency(16000).audioChannels(1).on('end', () => {
                this.logger.log(`Trích audio thành công: ${audioPath}`);
                resolve(audioPath);
            })
                .on('error', (err) => {
                    this.logger.error(`Trích audio thất bại: ${err.message}`);
                    reject(err);
                })
                .save(audioPath);
        });
    }
}