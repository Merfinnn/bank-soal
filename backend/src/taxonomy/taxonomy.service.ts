import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveTaxonomy() {
    const faculties = await this.prisma.faculty.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        departments: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            courses: {
              where: { deletedAt: null },
              orderBy: { name: "asc" },
              select: { id: true, name: true, code: true, semester: true }
            }
          }
        }
      }
    });

    return {
      fakultas: faculties.map((faculty) => ({
        id: faculty.id,
        kode: faculty.code,
        nama: faculty.name,
        programStudi: faculty.departments.map((department) => ({
          id: department.id,
          nama: department.name
        }))
      })),
      mataKuliah: faculties.flatMap((faculty) =>
        faculty.departments.flatMap((department) =>
          department.courses.map((course) => ({
            id: course.id,
            nama: course.name,
            kode: course.code,
            semester: course.semester,
            departmentId: department.id,
            programStudi: department.name,
            kodeFakultas: faculty.code
          }))
        )
      )
    };
  }
}
