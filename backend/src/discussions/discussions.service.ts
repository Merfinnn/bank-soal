import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ModerationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listApprovedComments(paperId: string) {
    await this.assertApprovedPaper(paperId);
    const comments = await this.prisma.discussionComment.findMany({
      where: { paperId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } }
      }
    });
    return comments.reverse().map((comment) => ({
      id: comment.id,
      isi: comment.content,
      dibuatPada: comment.createdAt,
      penulis: comment.user
    }));
  }

  async createComment(paperId: string, userId: string, input: CreateCommentDto) {
    const content = input.content.trim();
    if (!content) throw new BadRequestException("Komentar tidak boleh kosong.");
    await this.assertApprovedPaper(paperId);
    const comment = await this.prisma.discussionComment.create({
      data: { paperId, userId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true } }
      }
    });
    return {
      id: comment.id,
      isi: comment.content,
      dibuatPada: comment.createdAt,
      penulis: comment.user
    };
  }

  private async assertApprovedPaper(paperId: string): Promise<void> {
    const paper = await this.prisma.examPaper.findFirst({
      where: {
        id: paperId,
        status: ModerationStatus.APPROVED,
        course: {
          is: {
            deletedAt: null,
            department: {
              is: { deletedAt: null, faculty: { is: { deletedAt: null } } }
            }
          }
        }
      },
      select: { id: true }
    });
    if (!paper) throw new NotFoundException("Arsip yang disetujui tidak ditemukan.");
  }
}
