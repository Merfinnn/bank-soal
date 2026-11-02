"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PopularExamList } from "../components/HomeAnalytics";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type ProgramStudi = { id: string; nama: string };
type Fakultas = {
  id: string;
  kode: string;
  nama: string;
  programStudi: ProgramStudi[];
};
type MataKuliah = {
  id: string;
  kodeFakultas: string;
  departmentId: string;
  programStudi: string;
  nama: string;
  kode: string;
  semester: number;
};
type Taksonomi = { fakultas: Fakultas[]; mataKuliah: MataKuliah[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string {
  if (typeof value[key] !== "string") throw new Error("Data taksonomi tidak lengkap.");
  return value[key];
}

function parseTaxonomy(value: unknown): Taksonomi {
  if (!isRecord(value) || !Array.isArray(value.fakultas) || !Array.isArray(value.mataKuliah)) {
    throw new Error("Data taksonomi kampus tidak valid.");
  }
  const fakultas = value.fakultas.map((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.programStudi)) {
      throw new Error("Data fakultas tidak lengkap.");
    }
    return {
      id: readString(entry, "id"),
      kode: readString(entry, "kode"),
      nama: readString(entry, "nama"),
      programStudi: entry.programStudi.map((program: unknown) => {
        if (!isRecord(program)) throw new Error("Data program studi tidak valid.");
        return { id: readString(program, "id"), nama: readString(program, "nama") };
      })
    };
  });
  const mataKuliah = value.mataKuliah.map((entry) => {
    if (!isRecord(entry) || typeof entry.semester !== "number") {
      throw new Error("Data mata kuliah tidak lengkap.");
    }
    return {
      id: readString(entry, "id"),
      kodeFakultas: readString(entry, "kodeFakultas"),
      departmentId: readString(entry, "departmentId"),
      programStudi: readString(entry, "programStudi"),
      nama: readString(entry, "nama"),
      kode: readString(entry, "kode"),
      semester: entry.semester
    };
  });
  return { fakultas, mataKuliah };
}

export default function BerandaPage() {
  const router = useRouter();
  const [taksonomi, setTaksonomi] = useState<Taksonomi>({ fakultas: [], mataKuliah: [] });
  const [kodeFakultas, setKodeFakultas] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [kataKunci, setKataKunci] = useState("");
  const [galat, setGalat] = useState("");
  const [memuat, setMemuat] = useState(true);
  const [saranTerbuka, setSaranTerbuka] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/taxonomy`, {
          cache: "no-store",
          signal: controller.signal
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error("Taksonomi kampus gagal dimuat.");
        setTaksonomi(parseTaxonomy(body));
      } catch (error) {
        if (!controller.signal.aborted) {
          setGalat(error instanceof Error ? error.message : "Taksonomi kampus gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setMemuat(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const fakultasDipilih = taksonomi.fakultas.find((item) => item.kode === kodeFakultas);
  const coursePilihan = useMemo(
    () => taksonomi.mataKuliah.filter(
      (item) => item.kodeFakultas === kodeFakultas && item.departmentId === departmentId
    ),
    [taksonomi.mataKuliah, kodeFakultas, departmentId]
  );
  const saran = useMemo(() => {
    const query = kataKunci.trim().toLocaleLowerCase("id");
    if (!query) return [];
    return taksonomi.mataKuliah
      .filter((course) =>
        `${course.nama} ${course.kode} ${course.programStudi}`.toLocaleLowerCase("id").includes(query)
      )
      .slice(0, 5);
  }, [taksonomi.mataKuliah, kataKunci]);

  function jelajahi(query: string) {
    setSaranTerbuka(false);
    router.push(`/eksplorasi?q=${encodeURIComponent(query)}`);
  }

  function kirimPencarian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kataKunci.trim()) jelajahi(kataKunci.trim());
  }

  function cariMataKuliahTerpilih() {
    const course = coursePilihan.find((item) => item.id === courseId);
    if (course) jelajahi(course.nama);
  }

  return (
    <main id="konten-utama">
      <div className="page-shell home-shell">
        <section className="hero-grid" aria-labelledby="judul-beranda">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />BANK SOAL KAMPUS · TERBUKA UNTUK SEMUA</div>
            <h1 id="judul-beranda">Belajar lebih siap,<br /><span>mulai dari satu soal.</span></h1>
            <p className="hero-description">
              Temukan arsip ujian yang tertata, pembahasan yang jelas, dan latihan yang sesuai program studimu.
            </p>
            <form className="search-wrap hero-search" role="search" onSubmit={kirimPencarian}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
              <input
                type="search"
                placeholder="Cari Mata Kuliah, Kode Matkul, atau Topik RPS..."
                autoComplete="off"
                aria-label="Cari mata kuliah, kode mata kuliah, atau topik RPS"
                value={kataKunci}
                onChange={(event) => {
                  setKataKunci(event.target.value);
                  setSaranTerbuka(true);
                }}
                onFocus={() => setSaranTerbuka(true)}
                onBlur={() => window.setTimeout(() => setSaranTerbuka(false), 120)}
              />
              {saranTerbuka && kataKunci.trim() && (
                <div className="suggestions open" role="listbox" aria-label="Saran pencarian">
                  {saran.length ? saran.map((course) => (
                    <button
                      className="suggestion-option"
                      key={course.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => jelajahi(course.nama)}
                      type="button"
                      role="option"
                    >
                      <span className="suggestion-icon mint">⌕</span>
                      <span><b>{course.nama}</b><small>{course.kode} · {course.programStudi}</small></span>
                      <span className="suggestion-arrow">→</span>
                    </button>
                  )) : (
                    <button
                      className="suggestion-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => jelajahi(kataKunci.trim())}
                      type="button"
                    >
                      <span className="suggestion-icon mint">⌕</span>
                      <span><b>Cari “{kataKunci.trim()}”</b><small>Cari pada katalog soal</small></span>
                      <span className="suggestion-arrow">→</span>
                    </button>
                  )}
                </div>
              )}
            </form>
            <div className="search-hints">
              <span>Sering dicari:</span>
              {["Struktur Data", "Manajemen", "Pendidikan Matematika"].map((item) => (
                <button className="search-chip" key={item} onClick={() => jelajahi(item)} type="button">{item}</button>
              ))}
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div>
            <div className="art-card art-card-back">
              <span className="mini-tag">ARSIP TERSTRUKTUR</span>
              <div className="art-lines"><i /><i /><i /></div>
              <div className="art-diagram"><b /><b /><b /></div>
            </div>
            <div className="art-card art-card-front">
              <span className="art-card-head"><span className="mini-tag">LATIHAN SOAL</span><span className="art-check">✓</span></span>
              <strong>Belajar langkah<br />demi langkah</strong>
              <span className="art-progress"><i /></span>
              <small>Soal terverifikasi komunitas</small>
            </div>
            <div className="art-sticker"><span>✦</span><b>Akses belajar<br />lebih setara</b></div>
          </div>
        </section>

        <section className="selector-panel" aria-labelledby="selector-title">
          <div className="selector-heading">
            <div><span className="section-kicker">PENCARIAN TERARAH</span><h2 id="selector-title">Pilih mata kuliah dalam tiga langkah</h2></div>
            <span className="step-hint">FAKULTAS <i>→</i> PROGRAM STUDI <i>→</i> MATA KULIAH</span>
          </div>
          <div className="selector-row guided-selector">
            <label className="select-field">
              <span>1 · Fakultas</span>
              <select
                value={kodeFakultas}
                disabled={memuat}
                onChange={(event) => {
                  setKodeFakultas(event.target.value);
                  setDepartmentId("");
                  setCourseId("");
                }}
              >
                <option value="">Pilih fakultas</option>
                {taksonomi.fakultas.map((item) => <option key={item.id} value={item.kode}>{item.nama}</option>)}
              </select>
            </label>
            <span className="selector-arrow">›</span>
            <label className="select-field">
              <span>2 · Program Studi</span>
              <select
                value={departmentId}
                disabled={!kodeFakultas}
                onChange={(event) => {
                  setDepartmentId(event.target.value);
                  setCourseId("");
                }}
              >
                <option value="">Pilih program studi</option>
                {fakultasDipilih?.programStudi.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
              </select>
            </label>
            <span className="selector-arrow">›</span>
            <label className="select-field">
              <span>3 · Mata Kuliah</span>
              <select value={courseId} disabled={!departmentId} onChange={(event) => setCourseId(event.target.value)}>
                <option value="">Pilih mata kuliah</option>
                {coursePilihan.map((item) => <option key={item.id} value={item.id}>{item.nama} · {item.kode}</option>)}
              </select>
            </label>
            <button className="button button-dark selector-go" disabled={!courseId} onClick={cariMataKuliahTerpilih} type="button">
              Temukan soal <span>→</span>
            </button>
          </div>
          {galat && <p className="home-load-error" role="alert">{galat}</p>}
        </section>

        <section className="faculty-section" aria-labelledby="faculty-title">
          <div className="section-heading">
            <div><span className="section-kicker">JELAJAHI KAMPUS</span><h2 id="faculty-title">Pilih fakultasmu</h2></div>
            <span className="updated-label">{taksonomi.fakultas.length || 7} fakultas · program studi terdaftar</span>
          </div>
          <div className="faculty-grid">
            {taksonomi.fakultas.map((item, index) => (
              <Link className={`faculty-card faculty-tone-${(index % 7) + 1}`} href={`/eksplorasi?kodeFakultas=${encodeURIComponent(item.kode)}`} key={item.id}>
                <span className="faculty-card-mark">{item.kode}</span>
                <b>{item.nama}</b>
                <small>{item.programStudi.length} program studi <span>→</span></small>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-content-grid home-analytics-grid" aria-label="Paket soal populer">
          <article className="activity-card">
            <div className="activity-heading">
              <div><span className="section-kicker">REKOMENDASI KOMUNITAS</span><h2>Paket soal populer</h2></div>
              <span className="activity-badge">Banyak dipelajari</span>
            </div>
            <PopularExamList />
            <Link className="module-link" href="/eksplorasi">Lihat semua arsip <span>→</span></Link>
          </article>
        </section>
        <footer className="footer">
          <span>© 2026 Siap Ujian</span><span>Belajar yang merata dimulai dari akses yang setara.</span>
          <Link href="/unggah">Bagikan soalmu <span>→</span></Link>
        </footer>
      </div>
    </main>
  );
}
