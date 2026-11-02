import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { campusFaculties } from "./taxonomy";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL wajib diatur sebelum menjalankan seeder.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const sampleCourses = [
  { department: "Informatika", name: "Algoritma dan Pemrograman", code: "IF-101", semester: 1 },
  { department: "Informatika", name: "Kalkulus", code: "IF-102", semester: 1 },
  { department: "Informatika", name: "Matematika Diskrit", code: "IF-201", semester: 2 },
  { department: "Informatika", name: "Struktur Data", code: "IF-202", semester: 2 },
  { department: "Informatika", name: "Basis Data", code: "IF-301", semester: 3 },
  { department: "Informatika", name: "Sistem Operasi", code: "IF-401", semester: 4 }
] as const;

async function main() {
  const departmentCount = campusFaculties.reduce((total, faculty) => total + faculty.departments.length, 0);
  if (campusFaculties.length !== 7 || departmentCount !== 29) {
    throw new Error(`Taksonomi kampus tidak sesuai: ditemukan ${campusFaculties.length} fakultas dan ${departmentCount} program studi.`);
  }

  await prisma.$transaction(async (transaction) => {
    const retiredAt = new Date();
    await transaction.department.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: retiredAt }
    });
    await transaction.faculty.updateMany({
      where: { deletedAt: null },
      data: { deletedAt: retiredAt }
    });

    const departments = new Map<string, { id: string; facultyCode: string }>();

    for (const item of campusFaculties) {
      const faculty = await transaction.faculty.upsert({
        where: { code: item.code },
        update: { name: item.name, deletedAt: null },
        create: { code: item.code, name: item.name }
      });

      for (const name of item.departments) {
        const department = await transaction.department.upsert({
          where: { facultyId_name: { facultyId: faculty.id, name } },
          update: { deletedAt: null },
          create: { facultyId: faculty.id, name },
          select: { id: true }
        });
        departments.set(name, { id: department.id, facultyCode: item.code });
      }
    }

    for (const course of sampleCourses) {
      const department = departments.get(course.department);
      if (!department || department.facultyCode !== "FT") {
        throw new Error(`Program studi contoh tidak ditemukan di Fakultas Teknik: ${course.department}.`);
      }
      await transaction.course.upsert({
        where: { code: course.code },
        update: {
          name: course.name,
          semester: course.semester,
          departmentId: department.id,
          deletedAt: null
        },
        create: {
          name: course.name,
          code: course.code,
          semester: course.semester,
          departmentId: department.id
        }
      });
    }
  });

  console.log(`Seed berhasil: 7 fakultas, 29 program studi, dan ${sampleCourses.length} mata kuliah contoh Informatika.`);
}

main()
  .catch((error: unknown) => {
    console.error("Gagal mengisi data fakultas dan program studi:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
