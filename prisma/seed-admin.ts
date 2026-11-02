import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { argon2id, hash } from "argon2";

if (process.env.NODE_ENV === "production") {
  throw new Error("Seeder admin lokal tidak boleh dijalankan pada lingkungan produksi.");
}

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} wajib diatur sebelum menjalankan seeder.`);
  return value;
}

const connectionString = readRequiredEnv("DATABASE_URL");
const password = readRequiredEnv("ADMIN_SEED_PASSWORD");
if (password.length < 12 || password.length > 128) {
  throw new Error("ADMIN_SEED_PASSWORD wajib memiliki panjang 12–128 karakter.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await hash(password, { type: argon2id });
  const admin = await prisma.user.upsert({
    where: { email: "admin@siapujian.local" },
    update: { name: "Admin Siap Ujian", passwordHash, role: UserRole.ADMIN },
    create: {
      name: "Admin Siap Ujian",
      email: "admin@siapujian.local",
      passwordHash,
      role: UserRole.ADMIN
    },
    select: { email: true, role: true }
  });
  console.log(`Akun admin lokal siap: ${admin.email} (${admin.role}).`);
}

main()
  .catch((error: unknown) => {
    console.error("Gagal membuat akun admin lokal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
