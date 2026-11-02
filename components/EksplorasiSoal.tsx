"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const WARNA_KARTU_ARSIP = ["mint", "blue", "violet", "peach", "lavender"] as const;

export type ProgramStudi = { id: string; nama: string };
export type PilihanFakultas = {
  id: string;
  kode: string;
  nama: string;
  programStudi: ProgramStudi[];
};
export type PilihanMataKuliah = {
  id: string;
  kodeFakultas: string;
  departmentId: string;
  programStudi: string;
  nama: string;
  kode: string;
  semester: number;
};

export type ArsipUjian = {
  id: string;
  namaMataKuliah: string;
  kodeMataKuliah: string;
  namaFakultas: string;
  programStudi: string;
  semester: number;
  tahunUjian: number;
  jenisUjian: "UTS" | "UAS";
  topikRps: string;
  memilikiPembahasan: boolean;
  memilikiPdf: boolean;
  terverifikasi: boolean;
};

type Props = { saatArsipDipilih: (id: string) => void };
type DataKatalog = { items: ArsipUjian[]; total: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringDari(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error("Data katalog tidak lengkap.");
  return field;
}

function angkaDari(value: Record<string, unknown>, key: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error("Data katalog tidak lengkap.");
  }
  return field;
}

function booleanDari(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") throw new Error("Data katalog tidak lengkap.");
  return field;
}

function pesanGalat(value: unknown, fallback: string): string {
  if (!isRecord(value) || !("message" in value)) return fallback;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === "string")) {
    return value.message.join(" ");
  }
  return fallback;
}

async function bacaJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(pesanGalat(body, `Permintaan gagal (${response.status}).`));
  return body;
}

function parseFakultas(value: unknown): PilihanFakultas[] {
  if (!isRecord(value) || !Array.isArray(value.fakultas)) {
    throw new Error("Data fakultas belum tersedia.");
  }
  return value.fakultas.map((item) => {
    if (!isRecord(item) || !Array.isArray(item.programStudi)) {
      throw new Error("Data program studi tidak lengkap.");
    }
    return {
      id: stringDari(item, "id"),
      kode: stringDari(item, "kode"),
      nama: stringDari(item, "nama"),
      programStudi: item.programStudi.map((program) => {
        if (!isRecord(program)) throw new Error("Data program studi tidak valid.");
        return { id: stringDari(program, "id"), nama: stringDari(program, "nama") };
      })
    };
  });
}

function parseKatalog(value: unknown): DataKatalog {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error("Data katalog tidak valid.");
  }
  return {
    total: angkaDari(value, "total"),
    items: value.items.map((item) => {
      if (!isRecord(item)) throw new Error("Data arsip tidak valid.");
      const jenisUjian = stringDari(item, "jenisUjian");
      if (jenisUjian !== "UTS" && jenisUjian !== "UAS") {
        throw new Error("Jenis ujian tidak valid.");
      }
      return {
        id: stringDari(item, "id"),
        namaMataKuliah: stringDari(item, "namaMataKuliah"),
        kodeMataKuliah: stringDari(item, "kodeMataKuliah"),
        namaFakultas: stringDari(item, "namaFakultas"),
        programStudi: stringDari(item, "programStudi"),
        semester: angkaDari(item, "semester"),
        tahunUjian: angkaDari(item, "tahunUjian"),
        jenisUjian,
        topikRps: stringDari(item, "topikRps"),
        memilikiPembahasan: booleanDari(item, "memilikiPembahasan"),
        memilikiPdf: booleanDari(item, "memilikiPdf"),
        terverifikasi: booleanDari(item, "terverifikasi")
      };
    })
  };
}

export function EksplorasiSoal({ saatArsipDipilih }: Props) {
  const [kataKunci, setKataKunci] = useState("");
  const [kodeFakultas, setKodeFakultas] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semester, setSemester] = useState("");
  const [statusPembahasan, setStatusPembahasan] = useState("");
  const [page, setPage] = useState(1);
  const [urutan, setUrutan] = useState<"newest" | "oldest">("newest");
  const [fakultas, setFakultas] = useState<PilihanFakultas[]>([]);
  const [arsip, setArsip] = useState<ArsipUjian[]>([]);
  const [jumlahArsip, setJumlahArsip] = useState(0);
  const [memuatFakultas, setMemuatFakultas] = useState(true);
  const [memuatArsip, setMemuatArsip] = useState(true);
  const [pesanGalat, setPesanGalat] = useState("");

  const pilihanFakultas = fakultas.find((item) => item.kode === kodeFakultas);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    const facultyCode = params.get("kodeFakultas");
    if (query) setKataKunci(query);
    if (facultyCode) setKodeFakultas(facultyCode);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/taxonomy`, {
          cache: "no-store",
          signal: controller.signal
        });
        setFakultas(parseFakultas(await bacaJson(response)));
      } catch (error) {
        if (!controller.signal.aborted) {
          setPesanGalat(error instanceof Error ? error.message : "Data fakultas gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setMemuatFakultas(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setMemuatArsip(true);
        setPesanGalat("");
        const params = new URLSearchParams();
        if (kataKunci.trim()) params.set("q", kataKunci.trim());
        if (kodeFakultas) params.set("kodeFakultas", kodeFakultas);
        if (departmentId) params.set("departmentId", departmentId);
        if (semester) params.set("semester", semester);
        if (statusPembahasan) params.set("statusPembahasan", statusPembahasan);
        params.set("page", String(page));
        try {
          const response = await fetch(`${API_BASE}/exam-papers?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal
          });
          const data = parseKatalog(await bacaJson(response));
          setArsip(data.items);
          setJumlahArsip(data.total);
        } catch (error) {
          if (!controller.signal.aborted) {
            setPesanGalat(error instanceof Error ? error.message : "Katalog soal gagal dimuat.");
          }
        } finally {
          if (!controller.signal.aborted) setMemuatArsip(false);
        }
      })();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [kataKunci, kodeFakultas, departmentId, semester, statusPembahasan, page]);

  const semesterPilihan = useMemo(
    () => Array.from({ length: 8 }, (_, index) => index + 1),
    []
  );
  const arsipTerurut = useMemo(
    () => [...arsip].sort((a, b) => urutan === "newest" ? b.tahunUjian - a.tahunUjian : a.tahunUjian - b.tahunUjian),
    [arsip, urutan]
  );

  function pilihFakultas(nilai: string) {
    setKodeFakultas(nilai);
    setDepartmentId("");
    setPage(1);
  }

  return (
    <main className="page-shell catalog-shell">
      <header className="page-intro">
        <div>
          <div className="breadcrumb"><Link href="/">Beranda</Link><span>/</span>Eksplorasi Soal</div>
          <span className="section-kicker">KATALOG SOAL KAMPUS</span>
          <h1>Temukan arsip ujianmu.</h1>
          <p>Cari berdasarkan fakultas, program studi, semester, atau topik RPS.</p>
        </div>
        <Link className="button button-dark" href="/unggah">＋ Unggah soal</Link>
      </header>
      <div className="catalog-search-row">
        <label className="search-wrap catalog-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Cari soal</span>
          <input
            type="search"
            value={kataKunci}
            onChange={(event) => { setKataKunci(event.target.value); setPage(1); }}
            placeholder="Cari mata kuliah, kode matkul, atau topik RPS..."
          />
        </label>
        <button className="text-button" onClick={() => {
          setKataKunci("");
          setKodeFakultas("");
          setDepartmentId("");
          setSemester("");
          setStatusPembahasan("");
          setPage(1);
        }} type="button">Atur ulang filter</button>
      </div>
      <div className="filter-pills" aria-label="Filter katalog">
        <label className="filter-pill"><span>Fakultas</span>
          <select value={kodeFakultas} onChange={(event) => pilihFakultas(event.target.value)} disabled={memuatFakultas}>
            <option value="">Semua fakultas</option>
            {fakultas.map((item) => <option key={item.id} value={item.kode}>{item.nama}</option>)}
          </select>
        </label>
        <label className="filter-pill"><span>Program Studi</span>
          <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} disabled={!pilihanFakultas}>
            <option value="">Semua program studi</option>
            {pilihanFakultas?.programStudi.map((program) => <option key={program.id} value={program.id}>{program.nama}</option>)}
          </select>
        </label>
        <label className="filter-pill"><span>Semester</span>
          <select value={semester} onChange={(event) => { setSemester(event.target.value); setPage(1); }}>
            <option value="">Semua semester</option>
            {semesterPilihan.map((nilai) => <option key={nilai} value={nilai}>Semester {nilai}</option>)}
          </select>
        </label>
        <label className="filter-pill"><span>Status Pembahasan</span>
          <select value={statusPembahasan} onChange={(event) => { setStatusPembahasan(event.target.value); setPage(1); }}>
            <option value="">Semua soal</option>
            <option value="ada">Ada Pembahasan</option>
            <option value="mentah">Soal Mentah</option>
          </select>
        </label>
      </div>
      {pesanGalat && <p className="notice notice-error" role="alert">{pesanGalat}</p>}
      <section className="catalog-results" aria-label="Hasil eksplorasi soal">
        <div className="catalog-toolbar">
          <div>
            <h2>Arsip ujian <span>{memuatArsip ? "…" : jumlahArsip}</span></h2>
            <p>{memuatArsip ? "Memuat arsip..." : `${jumlahArsip} arsip ditemukan`}</p>
          </div>
          <label className="sort-label">Urutkan
            <select aria-label="Urutkan hasil" value={urutan} onChange={(event) => {
              if (event.target.value === "newest" || event.target.value === "oldest") setUrutan(event.target.value);
            }}>
              <option value="newest">Tahun terbaru</option>
              <option value="oldest">Tahun terlama</option>
            </select>
          </label>
        </div>
        {memuatArsip ? (
          <p className="empty-state" role="status">Memuat arsip soal...</p>
        ) : (
          <div className="question-grid">
            {arsipTerurut.map((item, index) => (
              <article className="catalog-card" key={item.id}>
                <div className="catalog-card-top">
                  <span className={`course-symbol ${WARNA_KARTU_ARSIP[index % WARNA_KARTU_ARSIP.length]}`} aria-hidden="true">⌘</span>
                  <span className="paper-type">{item.jenisUjian} · {item.tahunUjian}</span>
                  <span className="course-code">{item.kodeMataKuliah}</span>
                </div>
                <div className="catalog-card-title"><h3>{item.namaMataKuliah}</h3></div>
                <p className="catalog-card-topic">{item.topikRps}</p>
                <div className="paper-path">
                  <span>{item.namaFakultas}</span><span>{item.programStudi}</span><span>Semester {item.semester}</span>
                </div>
                <div className="catalog-tags">
                  <span>{item.memilikiPembahasan ? "Tersedia Pembahasan" : "Soal Mentah"}</span>
                  <span>{item.memilikiPdf ? "PDF Dokumen" : "Soal Digital"}</span>
                </div>
                <div className="catalog-card-bottom">
                  <div className="card-quality">
                    {item.terverifikasi && <span className="verified-badge"><i>✓</i> Terverifikasi</span>}
                    <span className="paper-year">Tahun {item.tahunUjian}</span>
                  </div>
                </div>
                <div className="catalog-card-footer">
                  <span>{item.kodeMataKuliah} · {item.jenisUjian}</span>
                  <button className="open-question" onClick={() => saatArsipDipilih(item.id)} type="button">Buka arsip <span>→</span></button>
                </div>
              </article>
            ))}
            {arsip.length === 0 && (
              <div className="empty-state">
                <span aria-hidden="true">⌕</span>
                <h3>Soal belum ditemukan</h3>
                <p>Ubah filter atau kata kunci pencarianmu.</p>
                <button className="button button-outline" onClick={() => {
                  setKataKunci("");
                  setKodeFakultas("");
                  setDepartmentId("");
                  setSemester("");
                  setStatusPembahasan("");
                  setPage(1);
                }} type="button">Atur ulang pencarian</button>
              </div>
            )}
          </div>
        )}
        {!memuatArsip && jumlahArsip > 0 && (
          <nav className="catalog-toolbar" aria-label="Navigasi halaman katalog">
            <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Sebelumnya</button>
            <span>Halaman {page} dari {Math.ceil(jumlahArsip / 24)}</span>
            <button className="button button-outline" type="button" disabled={page * 24 >= jumlahArsip} onClick={() => setPage((current) => current + 1)}>Berikutnya</button>
          </nav>
        )}
      </section>
    </main>
  );
}
