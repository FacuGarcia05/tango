import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { UploadsService } from "../../common/upload/uploads.service";
import { MediaController } from "./media.controller";

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [MediaController],
  providers: [UploadsService],
})
export class MediaModule {}
