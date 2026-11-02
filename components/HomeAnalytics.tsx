"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const WARNA_KARTU_ARSIP = ["mint", "blue", "violet", "peach", "lavender"] as const;

type PopularPaper = {
  id: string;
  namaMataKuliah: string;
  kodeMataKuliah: string;
  jenisUjian: "UTS" | "UAS";
  tahunUjian: number;
  kaliDipelajari: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ApprovedArchiveCount() {
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/exams/stats/approved-count`, {
          cache: "no-store",
          signal: controller.signal
        });
        const value: unknown = await response.json();
        if (!response.ok || !isRecord(value) || typeof value.total !== "number") {
          throw new Error("Jumlah arsip belum dapat dimuat.");
        }
        setTotal(value.total);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Jumlah arsip belum dapat dimuat.");
        }
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="impact-stat" aria-live="polite">
      <strong>{total === null ? "—" : new Intl.NumberFormat("id-ID").format(total)}</strong>
      <span>arsip ujian terverifikasi</span>
      {error && <small className="analytics-inline-error" role="alert">{error}</small>}
    </div>
  );
}

export function PopularExamList() {
  const router = useRouter();
  const [items, setItems] = useState<PopularPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/exams/stats/popular`, {
          cache: "no-store",
          signal: controller.signal
        });
        const value: unknown = await response.json();
        if (!response.ok || !isRecord(value) || !Array.isArray(value.items)) {
          throw new Error("Paket soal populer belum dapat dimuat.");
        }
        const papers = value.items.map((entry): PopularPaper => {
          if (
            !isRecord(entry)
            || typeof entry.id !== "string"
            || typeof entry.namaMataKuliah !== "string"
            || typeof entry.kodeMataKuliah !== "string"
            || (entry.jenisUjian !== "UTS" && entry.jenisUjian !== "UAS")
            || typeof entry.tahunUjian !== "number"
            || typeof entry.kaliDipelajari !== "number"
          ) throw new Error("Data paket soal populer tidak valid.");
          return {
            id: entry.id,
            namaMataKuliah: entry.namaMataKuliah,
            kodeMataKuliah: entry.kodeMataKuliah,
            jenisUjian: entry.jenisUjian,
            tahunUjian: entry.tahunUjian,
            kaliDipelajari: entry.kaliDipelajari
          };
        });
        setItems(papers);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Paket soal populer gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="popular-paper-list" aria-live="polite">
      {loading && <p className="analytics-loading">Memuat paket soal populer...</p>}
      {error && <p className="analytics-error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="analytics-empty">Belum ada data soal yang dipelajari.</p>
      )}
      {!loading && !error && items.map((paper, index) => (
        <button
          className="popular-paper"
          key={paper.id}
          onClick={() => router.push(`/soal/${encodeURIComponent(paper.id)}`)}
          type="button"
        >
          <span className={`home-popular-icon ${WARNA_KARTU_ARSIP[index % WARNA_KARTU_ARSIP.length]}`} aria-hidden="true">{["⌘", "⌥", "∑", "⌖", "⌕"][index % 5]}</span>
          <span>
            <b>{paper.namaMataKuliah}</b>
            <small>{paper.jenisUjian} {paper.tahunUjian} · {paper.kaliDipelajari} kali dipelajari</small>
          </span>
          <span className="popular-arrow" aria-hidden="true">→</span>
        </button>
      ))}
    </div>
  );
}
