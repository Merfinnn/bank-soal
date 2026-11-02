"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../auth-context";

const tautanUtama = [
  { href: "/", label: "Beranda" },
  { href: "/eksplorasi", label: "Eksplorasi Soal" },
  { href: "/unggah", label: "Unggah Soal" }
];

export function Navbar() {
  const { pengguna, status, pesanGalat, keluar } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [galatKeluar, setGalatKeluar] = useState("");

  async function handleKeluar() {
    setGalatKeluar("");
    try {
      await keluar();
      router.push("/");
      router.refresh();
    } catch (error) {
      setGalatKeluar(error instanceof Error ? error.message : "Gagal keluar dari akun.");
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-inner mx-auto w-full max-w-7xl">
        <Link className="brand" href="/" aria-label="Siap Ujian, beranda">
          <span className="brand-mark" aria-hidden="true">s.</span>
          <span>siap<span className="brand-strong">ujian</span></span>
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          {tautanUtama.map((tautan) => (
            <Link
              aria-current={pathname === tautan.href ? "page" : undefined}
              className={pathname === tautan.href ? "nav-link active" : "nav-link"}
              href={tautan.href}
              key={tautan.href}
            >
              {tautan.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-actions" aria-live="polite">
        {status === "memuat" && <span className="account-loading">Memeriksa sesi...</span>}
        {status === "galat" && (
          <span className="account-error" title={pesanGalat}>Sesi tidak dapat diperiksa</span>
        )}
        {status === "tamu" && (
          <div className="auth-actions">
            <Link className="button button-outline" href="/login">Masuk</Link>
            <Link className="button button-dark" href="/register">Daftar</Link>
          </div>
        )}
        {pengguna && (
          <div className="auth-actions">
            {(pengguna.role === "MODERATOR" || pengguna.role === "ADMIN") && (
              <Link className="account-moderation" href="/moderasi">Moderasi</Link>
            )}
            <span className="profile-name">{pengguna.name}</span>
            <button className="button button-outline" onClick={() => void handleKeluar()} type="button">Keluar</button>
          </div>
        )}
        {galatKeluar && <span className="account-error" role="alert">{galatKeluar}</span>}
        </div>
      </div>
    </header>
  );
}
