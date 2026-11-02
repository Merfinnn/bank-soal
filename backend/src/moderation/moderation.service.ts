import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ModerationStatus, StorageUploadStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ApproveExamPaperDto } from "./dto/approve-exam-paper.dto";
import { RejectExamPaperDto } from "./dto/reject-exam-paper.dto";

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async getPendingQueue() {
    const papers = await this.prisma.examPaper.findMany({
      where: { status: ModerationStatus.PENDING },
      orderBy: { submittedAt: "asc" },
      take: 100,
      select: {
        id: true,
        examYear: true,
        examType: true,
        topicName: true,
        sourceName: true,
        submittedAt: true,
        course: {
          select: {
            name: true,
            code: true,
            department: {
              select: {
                name: true,
                faculty: { select: { name: true } }
              }
            }
          }
        },
        contributor: { select: { name: true } },
        questions: { select: { prompt: true, explanation: true } },
        uploads: {
          where: { status: StorageUploadStatus.ATTACHED },
          select: {
            id: true,
            kind: true,
            originalName: true,
            contentType: true,
            sizeBytes: true
          }
        }
      }
    });

    return papers.map((paper) => ({
      id: paper.id,
      namaMataKuliah: paper.course.name,
      kodeMataKuliah: paper.course.code,
      programStudi: paper.course.department.name,
      namaFakultas: paper.course.department.faculty.name,
      tahunUjian: paper.examYear,
      jenisUjian: paper.examType,
      topikRps: paper.topicName,
      namaPengunggah: paper.contributor.name,
      namaBerkasSoal: paper.sourceName,
      dikirimPada: paper.submittedAt,
      soal: paper.questions.map((question) => ({
        teks: question.prompt,
        pembahasan: question.explanation
      })),
      berkas: paper.uploads.map((upload) => ({
        id: upload.id,
        jenis: upload.kind,
        nama: upload.originalName,
        tipeKonten: upload.contentType,
        ukuran: upload.sizeBytes
      }))
    }));
  }

  async approve(paperId: string, moderatorId: string, input: ApproveExamPaperDto) {
    if (!input.confirmNoActiveLeak) {
      throw new BadRequestException("Pastikan dokumen bukan bocoran ujian aktif sebelum menyetujui.");
    }
    const paper = await this.prisma.examPaper.findUnique({
      where: { id: paperId },
      select: {
        id: true,
        status: true,
        uploads: {
          where: { status: StorageUploadStatus.ATTACHED },
          select: { id: true }
        }
      }
    });
    if (!paper || paper.status !== ModerationStatus.PENDING) {
      throw new NotFoundException("Arsip menunggu moderasi tidak ditemukan.");
    }

    await Promise.all(
      paper.uploads.map((upload) =>
        this.storage.verifyAttachedUploadForModeration(paper.id, upload.id)
      )
    );

    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.examPaper.updateMany({
        where: { id: paper.id, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.APPROVED,
          moderatorId,
          moderatedAt: new Date(),
          moderatorNote: input.note?.trim() || null
        }
      });
      if (result.count !== 1) {
        throw new ConflictException("Arsip sudah diproses moderator lain.");
      }
      return { id: paper.id, status: ModerationStatus.APPROVED };
    });
  }

  async reject(paperId: string, moderatorId: string, input: RejectExamPaperDto) {
    const note = input.note.trim();
    if (!note) throw new BadRequestException("Alasan penolakan wajib diisi.");
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.examPaper.updateMany({
        where: { id: paperId, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.REJECTED,
          moderatorId,
          moderatedAt: new Date(),
          moderatorNote: note
        }
      });
      if (result.count !== 1) {
        throw new NotFoundException("Arsip menunggu moderasi tidak ditemukan.");
      }
      await transaction.storageUpload.updateMany({
        where: { paperId, status: StorageUploadStatus.ATTACHED },
        data: { status: StorageUploadStatus.REJECTED }
      });
      return { id: paperId, status: ModerationStatus.REJECTED };
    });
  }
}
