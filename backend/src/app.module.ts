import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { RolesGuard } from "./auth/roles.guard";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { ExamPapersModule } from "./exam-papers/exam-papers.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { ModerationModule } from "./moderation/moderation.module";
import { DiscussionsModule } from "./discussions/discussions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    StorageModule,
    ExamPapersModule,
    TaxonomyModule,
    ModerationModule,
    DiscussionsModule
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}
