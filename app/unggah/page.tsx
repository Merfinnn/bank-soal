"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UnggahDokumenModal } from "../../components/UnggahDokumenModal";
import type { PilihanFakultas, PilihanMataKuliah } from "../../components/EksplorasiSoal";
import { ApprovedArchiveCount } from "../../components/HomeAnalytics";
import { useAuth } from "../auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type Taxonomy = { fakultas: PilihanFakultas[]; mataKuliah: PilihanMataKuliah[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string") throw new Error("Data taksonomi tidak lengkap.");
  return value[key];
}

function readNumber(value: Record<string, unknown>, key: string): number {
  if (typeof value[key] !== "number") throw new Error("Data taksonomi tidak lengkap.");
  return value[key];
}

function parseTaxonomy(value: unknown): Taxonomy {
  if (!isRecord(value) || !Array.isArray(value.fakultas) || !Array.isArray(value.mataKuliah)) {
    throw new Error("Data taksonomi dari server tidak valid.");
  }
  const fakultas = value.fakultas.map((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.programStudi)) {
      throw new Error("Data fakultas tidak lengkap.");
    }
    return {
      id: readString(entry, "id"),
      kode: readString(entry, "kode"),
      nama: readString(entry, "nama"),
      programStudi: entry.programStudi.map((program) => {
        if (!isRecord(program)) throw new Error("Data program studi tidak valid.");
        return { id: readString(program, "id"), nama: readString(program, "nama") };
      })
    };
  });
  const mataKuliah = value.mataKuliah.map((entry) => {
    if (!isRecord(entry)) throw new Error("Data mata kuliah tidak valid.");
    return {
      id: readString(entry, "id"),
      kodeFakultas: readString(entry, "kodeFakultas"),
      departmentId: readString(entry, "departmentId"),
      programStudi: readString(entry, "programStudi"),
      nama: readString(entry, "nama"),
      kode: readString(entry, "kode"),
      semester: readNumber(entry, "semester")
    };
  });
  return { fakultas, mataKuliah };
}

export default function UnggahPage() {
  const { pengguna, status } = useAuth();
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ fakultas: [], mataKuliah: [] });
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [modeKontribusi, setModeKontribusi] = useState<"dokumen" | "manual">("dokumen");
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/taxonomy`, {
          cache: "no-store",
          signal: controller.signal
        });
        const value: unknown = await response.json();
        if (!response.ok) throw new Error("Data fakultas dan mata kuliah gagal dimuat.");
        setTaxonomy(parseTaxonomy(value));
      } catch (error) {
        if (!controller.signal.aborted) {
          setGalat(error instanceof Error ? error.message : "Taksonomi gagal dimuat.");
        }
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <main className="page-shell contribution-shell">
      <div className="breadcrumb">
        <Link className="breadcrumb-back" href="/">Beranda</Link><span>/</span><span>Unggah Soal</span>
      </div>
      <header className="contribution-heading">
        <span className="section-kicker">BANTU BELAJAR LEBIH MERATA</span>
        <h1>Bagikan arsip, bantu teman siap ujian.</h1>
        <p>Unggah scan lembar ujian, PDF, atau tulis soal beserta pembahasannya.</p>
      </header>
      <div className="contribution-layout">
        <section className="upload-card" aria-labelledby="judul-kartu-unggah">
          <div className="upload-mode-switch" role="tablist" aria-label="Format kontribusi">
            <button
              aria-selected={modeKontribusi === "dokumen"}
              className={`upload-mode${modeKontribusi === "dokumen" ? " active" : ""}`}
              onClick={() => setModeKontribusi("dokumen")}
              role="tab"
              type="button"
            >Unggah PDF / Foto</button>
            <button
              aria-selected={modeKontribusi === "manual"}
              className={`upload-mode${modeKontribusi === "manual" ? " active" : ""}`}
              onClick={() => setModeKontribusi("manual")}
              role="tab"
              type="button"
            >Tulis Soal Manual</button>
          </div>
          <div className="upload-notice">
            <span aria-hidden="true">ⓘ</span>
            <p>Berkas PDF yang diunggah akan diverifikasi oleh moderator sebelum dipublikasikan.</p>
          </div>
          <div className="form-step-heading">
            <span>PORTAL KONTRIBUSI</span>
            <h2 id="judul-kartu-unggah">Mulai berbagi arsip</h2>
            <p>Lengkapi metadata dan sertakan pembahasan agar arsip mudah ditemukan dan dipelajari.</p>
          </div>
          <ul className="upload-format-list" aria-label="Format berkas yang didukung">
            <li>PDF</li><li>PNG</li><li>JPG</li><li>Maksimal 15 MB per berkas</li>
          </ul>
          {status === "memuat" && <p className="account-loading">Memeriksa sesi akun...</p>}
          {status === "galat" && <p className="notice notice-error" role="alert">Sesi belum dapat diperiksa. Muat ulang halaman atau coba lagi nanti.</p>}
          {status === "tamu" && (
            <div className="upload-auth-prompt">
              <p>Masuk sebagai kontributor untuk mengirim arsip.</p>
              <Link className="button button-dark" href="/login">Masuk ke akun</Link>
            </div>
          )}
          {pengguna && (
            <div className="upload-auth-prompt">
              <p>Siap berbagi, <strong>{pengguna.name}</strong>?</p>
              <button
                className="button button-dark"
                disabled={!taxonomy.mataKuliah.length}
                onClick={() => setModalTerbuka(true)}
                type="button"
              >
                {taxonomy.mataKuliah.length ? "Mulai unggah" : "Memuat mata kuliah..."}
              </button>
            </div>
          )}
          {galat && <p className="notice notice-error" role="alert">{galat}</p>}
          {pesan && <p className="notice" role="status">{pesan}</p>}
        </section>
        <aside className="contribution-aside">
          <div className="impact-card">
            <div className="impact-art" aria-hidden="true">✳</div>
            <span className="section-kicker">BERBAGI DOKUMEN</span>
            <h2>Satu arsip bisa membuka banyak kesempatan.</h2>
            <p>Metadata yang tepat membantu teman menemukan dokumen belajar tanpa bergantung pada jaringan pertemanan.</p>
            <ApprovedArchiveCount />
          </div>
          <div className="moderation-card">
            <div className="moderation-card-heading">
              <span className="moderation-icon" aria-hidden="true">✓</span>
              <div><b>Alur Verifikasi</b><small>Transparan dan terstruktur</small></div>
            </div>
            <div className="moderation-timeline">
              <div className="timeline-item done"><i /><div><b>Dokumen dikirim</b><small>Metadata &amp; berkas lengkap</small></div><span>01</span></div>
              <div className="timeline-item active"><i /><div><b>Ditinjau moderator</b><small>Dokumen diperiksa sebelum tayang</small></div><span>02</span></div>
              <div className="timeline-item"><i /><div><b>Tayang di katalog</b><small>Dapat dipelajari mahasiswa</small></div><span>03</span></div>
            </div>
          </div>
          <div className="quality-tip">
            <span aria-hidden="true">✦</span>
            <div><b>Jaga kualitas arsip</b><p>Pastikan soal terbaca, metadata sesuai, dan pembahasan menjelaskan proses penyelesaian.</p></div>
          </div>
        </aside>
      </div>
      <UnggahDokumenModal
        terbuka={modalTerbuka}
        modeAwal={modeKontribusi}
        fakultas={taxonomy.fakultas}
        mataKuliah={taxonomy.mataKuliah}
        saatTutup={() => setModalTerbuka(false)}
        saatKirim={(hasil) => {
          setModalTerbuka(false);
          setPesan(`Arsip ${hasil.id} berhasil dikirim dan menunggu verifikasi moderator.`);
        }}
      />
    </main>
  );
}
