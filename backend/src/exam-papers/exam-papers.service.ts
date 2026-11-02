import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  Prisma,
  ModerationStatus,
  QuestionType,
  StorageUploadKind,
  StorageUploadStatus
} from "@prisma/client";
import { createHash } from "node:crypto";
import { PublicUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ListExamPapersDto } from "./dto/list-exam-papers.dto";
import { SubmitExamPaperDto } from "./dto/submit-exam-paper.dto";

@Injectable()
export class ExamPapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async getApprovedCount() {
    const total = await this.prisma.examPaper.count({
      where: {
        status: ModerationStatus.APPROVED,
        course: {
          is: {
            deletedAt: null,
            department: {
              is: { deletedAt: null, faculty: { is: { deletedAt: null } } }
            }
          }
        }
      }
    });
    return { total };
  }

  async getPopularPapers() {
    const activeApprovedPaper = {
      status: ModerationStatus.APPROVED,
      course: {
        is: {
          deletedAt: null,
          department: {
            is: { deletedAt: null, faculty: { is: { deletedAt: null } } }
          }
        }
      }
    } satisfies Prisma.ExamPaperWhereInput;
    const ranked = await this.prisma.paperView.groupBy({
      by: ["paperId"],
      where: { paper: { is: activeApprovedPaper } },
      _sum: { viewCount: true },
      orderBy: { _sum: { viewCount: "desc" } },
      take: 5
    });
    if (!ranked.length) return { items: [] };

    const papers = await this.prisma.examPaper.findMany({
      where: { id: { in: ranked.map((item) => item.paperId) }, ...activeApprovedPaper },
      select: {
        id: true,
        examYear: true,
        examType: true,
        course: { select: { name: true, code: true } }
      }
    });
    const byId = new Map(papers.map((paper) => [paper.id, paper]));
    return {
      items: ranked.flatMap((item) => {
        const paper = byId.get(item.paperId);
        if (!paper) return [];
        return [{
          id: paper.id,
          namaMataKuliah: paper.course.name,
          kodeMataKuliah: paper.course.code,
          jenisUjian: paper.examType,
          tahunUjian: paper.examYear,
          kaliDipelajari: item._sum.viewCount ?? 0
        }];
      })
    };
  }

  async recordApprovedView(paperId: string, userId: string | undefined, anonymousId: string | undefined) {
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
    if (!userId && !anonymousId) {
      throw new BadRequestException("Identitas pengunjung tidak tersedia.");
    }

    const visitorKey = createHash("sha256")
      .update(userId ? `user:${userId}` : `visitor:${anonymousId}`)
      .digest("hex");
    const now = new Date();
    const batasDeduplikasi = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const updated = await this.prisma.paperView.updateMany({
      where: { paperId, visitorKey, viewedAt: { lte: batasDeduplikasi } },
      data: { viewedAt: now, viewCount: { increment: 1 }, userId: userId ?? null }
    });
    if (updated.count) return { recorded: true };

    try {
      await this.prisma.paperView.create({
        data: { paperId, visitorKey, userId: userId ?? null, viewedAt: now }
      });
      return { recorded: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2002"
      ) {
        return { recorded: false };
      }
      throw error;
    }
  }

  async listApproved(query: ListExamPapersDto) {
    const conditions: Prisma.ExamPaperWhereInput[] = [];
    const search = query.q?.trim();
    if (search) {
      conditions.push({
        OR: [
          { topicName: { contains: search, mode: "insensitive" } },
          { sourceName: { contains: search, mode: "insensitive" } },
          { course: { is: { name: { contains: search, mode: "insensitive" } } } },
          { course: { is: { code: { contains: search, mode: "insensitive" } } } },
          { course: { is: { professorName: { contains: search, mode: "insensitive" } } } },
          { department: { is: { name: { contains: search, mode: "insensitive" } } } },
          { faculty: { is: { name: { contains: search, mode: "insensitive" } } } }
        ]
      });
    }
    if (query.kodeFakultas) {
      conditions.push({ faculty: { is: { code: query.kodeFakultas } } });
    }
    if (query.departmentId) {
      conditions.push({ departmentId: query.departmentId });
    }
    if (query.semester) {
      conditions.push({ course: { is: { semester: query.semester } } });
    }
    if (query.statusPembahasan === "ada") {
      conditions.push({
        OR: [
          { answerUrl: { not: null } },
          { questions: { some: { explanation: { not: null } } } }
        ]
      });
    } else if (query.statusPembahasan === "mentah") {
      conditions.push({
        answerUrl: null,
        questions: { none: { explanation: { not: null } } }
      });
    }

    const where: Prisma.ExamPaperWhereInput = {
      status: ModerationStatus.APPROVED,
      course: {
        is: {
          deletedAt: null,
          department: {
            is: {
              deletedAt: null,
              faculty: { is: { deletedAt: null } }
            }
          }
        }
      },
      AND: conditions
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const [papers, total] = await this.prisma.$transaction([
      this.prisma.examPaper.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          examYear: true,
          examType: true,
          topicName: true,
          pdfUrl: true,
          answerUrl: true,
          submittedAt: true,
          course: {
            select: {
              name: true,
              code: true,
              semester: true,
              department: { select: { name: true } }
            }
          },
          faculty: { select: { name: true } },
          questions: { select: { explanation: true } }
        }
      }),
      this.prisma.examPaper.count({ where })
    ]);

    return {
      items: papers.map((paper) => ({
        id: paper.id,
        namaMataKuliah: paper.course.name,
        kodeMataKuliah: paper.course.code,
        namaFakultas: paper.faculty.name,
        programStudi: paper.course.department.name,
        semester: paper.course.semester,
        tahunUjian: paper.examYear,
        jenisUjian: paper.examType,
        topikRps: paper.topicName,
        memilikiPembahasan: Boolean(
          paper.answerUrl || paper.questions.some((question) => question.explanation?.trim())
        ),
        memilikiPdf: Boolean(paper.pdfUrl),
        terverifikasi: true
      })),
      total,
      page,
      limit
    };
  }

  async getApprovedDownloadUrl(paperId: string, jenis: "soal" | "pembahasan") {
    const paper = await this.prisma.examPaper.findUnique({
      where: { id: paperId },
      select: {
        status: true,
        uploads: {
          where: { status: StorageUploadStatus.ATTACHED },
          select: { id: true, kind: true }
        }
      }
    });
    if (!paper || paper.status !== ModerationStatus.APPROVED) {
      throw new NotFoundException("Arsip yang disetujui tidak ditemukan.");
    }
    const expectedKind = jenis === "soal"
      ? StorageUploadKind.EXAM_DOCUMENT
      : StorageUploadKind.ANSWER_KEY;
    const upload = paper.uploads.find((item) => item.kind === expectedKind);
    if (!upload) throw new NotFoundException("Berkas arsip tidak ditemukan.");
    return this.storage.createApprovedDownloadUrl(upload.id);
  }

  async getApprovedDetail(paperId: string) {
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
      select: {
        id: true,
        examYear: true,
        examType: true,
        topicName: true,
        pdfUrl: true,
        answerUrl: true,
        course: {
          select: {
            name: true,
            code: true,
            semester: true,
            department: { select: { name: true } }
          }
        },
        faculty: { select: { name: true } },
        questions: {
          orderBy: { sequence: "asc" },
          select: { id: true, prompt: true, answerKey: true, explanation: true }
        }
      }
    });
    if (!paper) throw new NotFoundException("Arsip yang disetujui tidak ditemukan.");
    return {
      id: paper.id,
      namaMataKuliah: paper.course.name,
      kodeMataKuliah: paper.course.code,
      semester: paper.course.semester,
      programStudi: paper.course.department.name,
      namaFakultas: paper.faculty.name,
      tahunUjian: paper.examYear,
      jenisUjian: paper.examType,
      topikRps: paper.topicName,
      memilikiPdf: Boolean(paper.pdfUrl),
      memilikiPembahasan: Boolean(
        paper.answerUrl || paper.questions.some((question) => question.explanation?.trim())
      ),
      soal: paper.questions.map((question) => ({
        id: question.id,
        teks: question.prompt,
        kunciJawaban: question.answerKey,
        pembahasan: question.explanation
      }))
    };
  }

  async submit(user: PublicUser, input: SubmitExamPaperDto) {
    const questionText = input.questionText?.trim() ?? "";
    const explanation = input.explanation?.trim() ?? "";
    if (!input.distributionRightsConfirmed) {
      throw new BadRequestException("Konfirmasi hak distribusi wajib disetujui.");
    }
    if (!input.topicName.trim()) {
      throw new BadRequestException("Topik RPS wajib diisi.");
    }
    if (!input.examUploadId && !questionText) {
      throw new BadRequestException("Unggah dokumen ujian atau isi teks soal.");
    }
    if (!input.answerUploadId && !explanation) {
      throw new BadRequestException("Sertakan pembahasan atau PDF kunci jawaban.");
    }
    if (
      input.examUploadId
      && input.answerUploadId
      && input.examUploadId === input.answerUploadId
    ) {
      throw new BadRequestException("Berkas soal dan kunci jawaban harus berbeda.");
    }

    const course = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      include: { department: { include: { faculty: true } } }
    });
    if (
      !course
      || course.deletedAt
      || course.department.deletedAt
      || course.department.faculty.deletedAt
    ) {
      throw new NotFoundException("Mata kuliah aktif tidak ditemukan.");
    }

    const [examUpload, answerUpload] = await Promise.all([
      input.examUploadId
        ? this.storage.verifyUploadForSubmission(user.id, input.examUploadId, StorageUploadKind.EXAM_DOCUMENT)
        : Promise.resolve(null),
      input.answerUploadId
        ? this.storage.verifyUploadForSubmission(user.id, input.answerUploadId, StorageUploadKind.ANSWER_KEY)
        : Promise.resolve(null)
    ]);

    const question = questionText || explanation
      ? {
          create: {
            type: QuestionType.ESAI_TERSTRUKTUR,
            prompt: questionText || "Soal tersedia pada dokumen ujian terlampir.",
            explanation: explanation || null
          }
        }
      : undefined;
    const uploadIds = [examUpload?.id, answerUpload?.id].filter(
      (id): id is string => Boolean(id)
    );

    return this.prisma.$transaction(async (transaction) => {
      const paper = await transaction.examPaper.create({
        data: {
          facultyId: course.department.facultyId,
          departmentId: course.departmentId,
          courseId: course.id,
          contributorId: user.id,
          examYear: input.examYear,
          examType: input.examType,
          topicName: input.topicName.trim(),
          pdfUrl: examUpload?.objectKey ?? null,
          answerUrl: answerUpload?.objectKey ?? null,
          sourceName: examUpload?.originalName ?? null,
          distributionConfirmedAt: new Date(),
          status: ModerationStatus.PENDING,
          questions: question
        },
        select: { id: true, status: true }
      });

      if (uploadIds.length) {
        const attached = await transaction.storageUpload.updateMany({
          where: {
            id: { in: uploadIds },
            ownerId: user.id,
            status: StorageUploadStatus.UPLOADED,
            paperId: null
          },
          data: { paperId: paper.id, status: StorageUploadStatus.ATTACHED }
        });
        if (attached.count !== uploadIds.length) {
          throw new ConflictException("Salah satu berkas sudah dipakai pada arsip lain.");
        }
      }

      return paper;
    });
  }
}
