import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [StorageModule],
  controllers: [ModerationController],
  providers: [ModerationService]
})
export class ModerationModule {}
