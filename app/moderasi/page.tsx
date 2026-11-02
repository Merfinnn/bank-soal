"use client";

import Link from "next/link";
import { ModerasiAntrian } from "../../components/ModerasiAntrian";
import { useAuth } from "../auth-context";

export default function ModerasiPage() {
  const { pengguna, status } = useAuth();
  if (status === "memuat") {
    return <main className="page-shell"><p>Memeriksa hak akses...</p></main>;
  }
  if (status === "galat") {
    return <main className="page-shell"><p className="notice notice-error">Sesi akun gagal diperiksa. Silakan muat ulang halaman.</p></main>;
  }
  if (!pengguna) {
    return (
      <main className="page-shell">
        <div className="panel">
          <h1>Masuk untuk melanjutkan</h1>
          <p>Antrean moderasi hanya tersedia bagi Moderator dan Admin.</p>
          <Link className="button button-primary" href="/login">Masuk</Link>
        </div>
      </main>
    );
  }
  if (pengguna.role !== "MODERATOR" && pengguna.role !== "ADMIN") {
    return (
      <main className="page-shell">
        <div className="panel">
          <h1>Akses terbatas</h1>
          <p>Akun ini tidak memiliki peran Moderator atau Admin.</p>
        </div>
      </main>
    );
  }
  return <ModerasiAntrian />;
}
