import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, mkdirSync, promises as fs } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { memoryStorage } from "multer";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import type { Express } from "express";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiOptions } from "cloudinary";

export interface UploadResult {
  url: string;
  provider: "local" | "cloudinary";
  providerId: string;
}

@Injectable()
export class UploadsService {
  readonly maxFileSize = 5 * 1024 * 1024;
  private readonly uploadsRoot = join(process.cwd(), "uploads");
  private readonly useCloudinary: boolean;

  constructor(private readonly config: ConfigService) {
    this.ensureDir(this.uploadsRoot);

    const cloudName = this.config.get<string>("CLOUDINARY_CLOUD_NAME");
    const cloudKey = this.config.get<string>("CLOUDINARY_API_KEY");
    const cloudSecret = this.config.get<string>("CLOUDINARY_API_SECRET");
    this.useCloudinary = Boolean(cloudName && cloudKey && cloudSecret);

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: cloudKey,
        api_secret: cloudSecret,
      });
    }
  }

  getMulterConfig(): MulterOptions {
    return {
      storage: memoryStorage(),
      limits: { fileSize: this.maxFileSize },
    };
  }

  async handleUpload(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    if (this.useCloudinary) {
      return this.uploadToCloudinary(file, folder);
    }

    const extension = extname(file.originalname) || ".jpg";
    const filename = `${randomUUID()}${extension}`;
    const directory = join(this.uploadsRoot, folder);
    this.ensureDir(directory);

    await fs.writeFile(join(directory, filename), file.buffer);

    const publicBase = this.config.get<string>("PUBLIC_UPLOADS_BASE") ?? "http://localhost:3001/uploads";
    return {
      url: `${publicBase}/${folder}/${filename}`,
      provider: "local",
      providerId: filename,
    };
  }

  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOpts: UploadApiOptions = { folder };
      const uploadStream = cloudinary.uploader.upload_stream(uploadOpts, (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Upload fallido"));
        }
        resolve({ url: result.secure_url, provider: "cloudinary", providerId: result.public_id });
      });

      uploadStream.end(file.buffer);
    });
  }

  private ensureDir(path: string) {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }
}
