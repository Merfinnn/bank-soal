"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "../../auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type Question = { id: string; teks: string; kunciJawaban: string | null; pembahasan: string | null };
type ExamPaper = {
  id: string;
  namaMataKuliah: string;
  kodeMataKuliah: string;
  semester: number;
  programStudi: string;
  namaFakultas: string;
  tahunUjian: number;
  jenisUjian: "UTS" | "UAS";
  topikRps: string;
  memilikiPdf: boolean;
  memilikiPembahasan: boolean;
  soal: Question[];
};
type Comment = { id: string; isi: string; dibuatPada: string; penulis: { id: string; name: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error("Data arsip tidak lengkap.");
  return field;
}

function nullableString(value: Record<string, unknown>, key: string): string | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "string") throw new Error("Data pembahasan tidak valid.");
  return field;
}

function parsePaper(value: unknown): ExamPaper {
  if (!isRecord(value) || !Array.isArray(value.soal)) throw new Error("Data arsip tidak valid.");
  const type = stringField(value, "jenisUjian");
  if (type !== "UTS" && type !== "UAS") throw new Error("Jenis ujian tidak valid.");
  const questions = value.soal.map((entry) => {
    if (!isRecord(entry)) throw new Error("Data soal tidak valid.");
    return {
      id: stringField(entry, "id"),
      teks: stringField(entry, "teks"),
      kunciJawaban: nullableString(entry, "kunciJawaban"),
      pembahasan: nullableString(entry, "pembahasan")
    };
  });
  const semester = value.semester;
  const year = value.tahunUjian;
  if (typeof semester !== "number" || typeof year !== "number") throw new Error("Metadata arsip tidak valid.");
  if (typeof value.memilikiPdf !== "boolean" || typeof value.memilikiPembahasan !== "boolean") {
    throw new Error("Status kelengkapan arsip tidak valid.");
  }
  return {
    id: stringField(value, "id"),
    namaMataKuliah: stringField(value, "namaMataKuliah"),
    kodeMataKuliah: stringField(value, "kodeMataKuliah"),
    semester,
    programStudi: stringField(value, "programStudi"),
    namaFakultas: stringField(value, "namaFakultas"),
    tahunUjian: year,
    jenisUjian: type,
    topikRps: stringField(value, "topikRps"),
    memilikiPdf: value.memilikiPdf,
    memilikiPembahasan: value.memilikiPembahasan,
    soal: questions
  };
}

function parseComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) throw new Error("Data diskusi tidak valid.");
  return value.map((entry) => {
    if (
      !isRecord(entry)
      || !isRecord(entry.penulis)
      || typeof entry.dibuatPada !== "string"
    ) throw new Error("Data komentar tidak lengkap.");
    return {
      id: stringField(entry, "id"),
      isi: stringField(entry, "isi"),
      dibuatPada: entry.dibuatPada,
      penulis: {
        id: stringField(entry.penulis, "id"),
        name: stringField(entry.penulis, "name")
      }
    };
  });
}

async function bacaJson(response: Response): Promise<unknown> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(value) && typeof value.message === "string" ? value.message : `Permintaan gagal (${response.status}).`;
    throw new Error(message);
  }
  return value;
}

async function tokenCsrf(): Promise<string> {
  const value = await bacaJson(await fetch(`${API_BASE}/csrf`, {
    credentials: "include",
    cache: "no-store"
  }));
  if (!isRecord(value) || typeof value.csrfToken !== "string") {
    throw new Error("Token keamanan sesi tidak tersedia.");
  }
  return value.csrfToken;
}

function inisialNama(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toLocaleUpperCase("id-ID");
}

export default function DetailSoalPage() {
  const params = useParams<{ id: string }>();
  const paperId = params.id;
  const { pengguna } = useAuth();
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [tabAktif, setTabAktif] = useState<"pembahasan" | "diskusi">("pembahasan");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [paperResponse, commentsResponse] = await Promise.all([
          fetch(`${API_BASE}/exam-papers/${encodeURIComponent(paperId)}`, {
            cache: "no-store",
            signal: controller.signal
          }),
          fetch(`${API_BASE}/exam-papers/${encodeURIComponent(paperId)}/comments`, {
            cache: "no-store",
            signal: controller.signal
          })
        ]);
        setPaper(parsePaper(await bacaJson(paperResponse)));
        setComments(parseComments(await bacaJson(commentsResponse)));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Arsip gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [paperId]);

  useEffect(() => {
    if (!paper || paper.id !== paperId) return;
    const controller = new AbortController();
    void fetch(`${API_BASE}/exams/${encodeURIComponent(paperId)}/view`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal
    }).then(async (response) => {
      if (!response.ok) {
        const value: unknown = await response.json();
        const message = isRecord(value) && typeof value.message === "string"
          ? value.message
          : "Kunjungan arsip tidak dapat dicatat.";
        throw new Error(message);
      }
    }).catch((viewError: unknown) => {
      if (!controller.signal.aborted) {
        console.error("Gagal mencatat kunjungan arsip.", viewError);
      }
    });
    return () => controller.abort();
  }, [paper, paperId]);

  async function kirimKomentar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const csrf = await tokenCsrf();
      const response = await fetch(`${API_BASE}/exam-papers/${encodeURIComponent(paperId)}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ content: commentText })
      });
      const created = parseComments([await bacaJson(response)])[0];
      setComments((current) => [...current, created]);
      setCommentText("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Komentar gagal dikirim.");
    } finally {
      setSending(false);
    }
  }

  async function bukaDokumen(kind: "soal" | "pembahasan") {
    setError("");
    try {
      const response = await fetch(
        `${API_BASE}/exam-papers/${encodeURIComponent(paperId)}/download-url?jenis=${kind}`,
        { cache: "no-store" }
      );
      const value = await bacaJson(response);
      if (!isRecord(value) || typeof value.downloadUrl !== "string") {
        throw new Error("Tautan dokumen tidak tersedia.");
      }
      window.open(value.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Dokumen gagal dibuka.");
    }
  }

  if (loading) return <main className="page-shell"><p>Memuat arsip dan diskusi...</p></main>;
  if (!paper) {
    return <main className="page-shell"><p className="notice notice-error" role="alert">{error || "Arsip tidak ditemukan."}</p></main>;
  }

  return (
    <main className="page-shell study-shell">
      <div className="breadcrumb"><Link href="/eksplorasi">Eksplorasi Soal</Link><span>/</span><span>Mode Belajar</span></div>
      <header className="study-heading">
        <div>
          <span className="section-kicker">{paper.jenisUjian} · {paper.tahunUjian}</span>
          <h1>{paper.namaMataKuliah}</h1>
          <p>{paper.namaFakultas} · {paper.programStudi} · Semester {paper.semester} · Topik: {paper.topikRps}</p>
        </div>
        <div className="study-heading-actions">
          {paper.memilikiPdf && <button className="button button-outline whitespace-nowrap flex items-center gap-2" onClick={() => void bukaDokumen("soal")} type="button"><span>Buka dokumen soal</span><ExternalLink aria-hidden="true" /></button>}
          {paper.memilikiPembahasan && <button className="button button-dark whitespace-nowrap flex items-center gap-2" onClick={() => void bukaDokumen("pembahasan")} type="button">Buka lampiran pembahasan</button>}
        </div>
      </header>
      <div className="study-meta">
        <span className="verified-badge"><i>✓</i> Terverifikasi</span><span className="meta-dot" />
        <span>Dokumen arsip</span><span className="meta-dot" /><span>Pembahasan ditinjau moderator</span>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="study-layout">
        <article className="problem-panel">
          <div className="problem-header">
            <span className="question-label">DOKUMEN UJIAN <span>·</span> PRATINJAU SOAL</span>
          </div>
          <div className="study-document">
            <div className="problem-content">
              <h2>{paper.soal.length ? paper.namaMataKuliah : "Dokumen soal"}</h2>
              {paper.soal.length ? paper.soal.map((item, index) => (
                <div className="subquestion" key={item.id}>
                  <span className="subquestion-mark">{index + 1}.</span><p>{item.teks}</p>
                </div>
              )) : (
                <p>Soal tersedia pada dokumen ujian terlampir.</p>
              )}
              {paper.memilikiPdf && (
                <div className="document-placeholder">
                  <span aria-hidden="true">▤</span>
                  <h3>Pratinjau dokumen soal</h3>
                  <p>Buka berkas untuk melihat dokumen ujian lengkap.</p>
                  <button className="button button-outline" onClick={() => void bukaDokumen("soal")} type="button">Buka dokumen</button>
                </div>
              )}
            </div>
          </div>
          <div className="question-navigation">
            <Link href="/eksplorasi">← Kembali ke arsip</Link>
            <span>Dokumen <i>·</i> soal terstruktur</span>
            <Link href="/unggah">Bagikan soal →</Link>
          </div>
        </article>

        <aside className="solution-panel">
          <div className="solution-tabs" role="tablist" aria-label="Materi soal">
            <button
              className={`solution-tab${tabAktif === "pembahasan" ? " active" : ""}`}
              id="tab-button-pembahasan"
              type="button"
              role="tab"
              aria-selected={tabAktif === "pembahasan"}
              aria-controls="tab-pembahasan"
              onClick={() => setTabAktif("pembahasan")}
            >Pembahasan</button>
            <button
              className={`solution-tab${tabAktif === "diskusi" ? " active" : ""}`}
              id="tab-button-diskusi"
              type="button"
              role="tab"
              aria-selected={tabAktif === "diskusi"}
              aria-controls="tab-diskusi"
              onClick={() => setTabAktif("diskusi")}
            >Diskusi Soal <span className="discussion-count">{comments.length}</span></button>
          </div>
          {tabAktif === "pembahasan" ? (
            <div className="solution-body" id="tab-pembahasan" role="tabpanel" aria-labelledby="tab-button-pembahasan">
              <div className="solution-title">
                <span className="solution-check">✓</span>
                <div><h2>Kunci Jawaban &amp; Pembahasan Langkah demi Langkah</h2><p>Ditinjau oleh moderator mata kuliah</p></div>
              </div>
              {paper.soal.map((item, index) => (
                <section key={item.id}>
                  {item.kunciJawaban && <div className="answer-key"><span>KUNCI JAWABAN · SOAL {index + 1}</span><p>{item.kunciJawaban}</p></div>}
                  {item.pembahasan && (
                    <div className="solution-step">
                      <span className="step-number">{index + 1}</span>
                      <div><h3>Pembahasan soal {index + 1}</h3><p>{item.pembahasan}</p></div>
                    </div>
                  )}
                </section>
              ))}
              {!paper.memilikiPembahasan && <p className="muted">Pembahasan terstandardisasi belum tersedia untuk arsip ini.</p>}
              <div className="helpful-row"><span>Pembahasan terverifikasi oleh moderator</span></div>
            </div>
          ) : (
            <div className="discussion-body" id="tab-diskusi" role="tabpanel" aria-labelledby="tab-button-diskusi">
              <div className="discussion-header">
                <div><h2>Diskusi Soal</h2><p>Tanya dan berbagi cara berpikir dengan teman.</p></div>
              </div>
              {comments.length === 0 && <p className="muted">Belum ada diskusi. Jadilah yang pertama bertanya atau berbagi cara belajar.</p>}
              <div className="comment-list" aria-live="polite">
                {comments.map((comment, index) => (
                  <article className="comment" key={comment.id}>
                    <span className={`avatar ${["avatar-blue", "avatar-purple", "avatar-yellow"][index % 3]}`} aria-hidden="true">{inisialNama(comment.penulis.name)}</span>
                    <div>
                      <div className="comment-meta">
                        <b>{comment.penulis.name}</b>
                        <span>{new Date(comment.dibuatPada).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                      </div>
                      <p>{comment.isi}</p>
                    </div>
                  </article>
                ))}
              </div>
              {pengguna ? (
                <form className="comment-form" onSubmit={(event) => void kirimKomentar(event)}>
                  <label className="sr-only" htmlFor="comment-input">Tulis komentar</label>
                  <textarea
                    id="comment-input"
                    maxLength={3000}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Tulis pertanyaan atau tanggapan..."
                    required
                    rows={2}
                    value={commentText}
                  />
                  <button aria-label={sending ? "Mengirim komentar" : "Kirim komentar"} disabled={sending || !commentText.trim()} type="submit">{sending ? "…" : "↑"}</button>
                </form>
              ) : (
                <p className="notice"><Link className="inline-link" href="/login">Masuk</Link> untuk ikut berdiskusi.</p>
              )}
            </div>
          )}
          <div className="source-note"><span>ⓘ</span> Pembahasan terverifikasi · Dokumen arsip ditinjau moderator</div>
        </aside>
      </div>
    </main>
  );
}
