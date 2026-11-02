"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, ShieldCheck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

type BerkasModerasi = {
  id: string;
  jenis: "EXAM_DOCUMENT" | "ANSWER_KEY";
  nama: string;
  tipeKonten: string;
  ukuran: number;
};

type ArsipModerasi = {
  id: string;
  namaMataKuliah: string;
  kodeMataKuliah: string;
  programStudi: string;
  namaFakultas: string;
  tahunUjian: number;
  jenisUjian: "UTS" | "UAS";
  topikRps: string;
  namaPengunggah: string;
  namaBerkasSoal: string | null;
  dikirimPada: string;
  soal: { teks: string; pembahasan: string | null }[];
  berkas: BerkasModerasi[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") throw new Error("Data antrean moderasi tidak lengkap.");
  return field;
}

function number(value: Record<string, unknown>, key: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isFinite(field)) {
    throw new Error("Data antrean moderasi tidak lengkap.");
  }
  return field;
}

function message(value: unknown, fallback: string): string {
  if (!isRecord(value) || !("message" in value)) return fallback;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === "string")) {
    return value.message.join(" ");
  }
  return fallback;
}

async function responseJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(message(body, `Permintaan gagal (${response.status}).`));
  return body;
}

function parseJenisBerkas(value: string): BerkasModerasi["jenis"] {
  if (value === "EXAM_DOCUMENT" || value === "ANSWER_KEY") return value;
  throw new Error("Jenis lampiran tidak valid.");
}

function parseQueue(value: unknown): ArsipModerasi[] {
  if (!Array.isArray(value)) throw new Error("Respons antrean moderasi tidak valid.");
  return value.map((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.berkas) || !Array.isArray(entry.soal)) {
      throw new Error("Data arsip moderasi tidak valid.");
    }
    const examType = text(entry, "jenisUjian");
    if (examType !== "UTS" && examType !== "UAS") throw new Error("Jenis ujian tidak valid.");
    const files = entry.berkas.map((file) => {
      if (!isRecord(file)) throw new Error("Data lampiran tidak valid.");
      return {
        id: text(file, "id"),
        jenis: parseJenisBerkas(text(file, "jenis")),
        nama: text(file, "nama"),
        tipeKonten: text(file, "tipeKonten"),
        ukuran: number(file, "ukuran")
      };
    });
    const questions = entry.soal.map((question) => {
      if (!isRecord(question)) throw new Error("Data pembahasan tidak valid.");
      const pembahasan = question.pembahasan;
      if (pembahasan !== null && typeof pembahasan !== "string") {
        throw new Error("Data pembahasan tidak valid.");
      }
      return { teks: text(question, "teks"), pembahasan };
    });
    const sourceName = entry.namaBerkasSoal;
    if (sourceName !== null && typeof sourceName !== "string") {
      throw new Error("Nama berkas tidak valid.");
    }
    return {
      id: text(entry, "id"),
      namaMataKuliah: text(entry, "namaMataKuliah"),
      kodeMataKuliah: text(entry, "kodeMataKuliah"),
      programStudi: text(entry, "programStudi"),
      namaFakultas: text(entry, "namaFakultas"),
      tahunUjian: number(entry, "tahunUjian"),
      jenisUjian: examType,
      topikRps: text(entry, "topikRps"),
      namaPengunggah: text(entry, "namaPengunggah"),
      namaBerkasSoal: sourceName,
      dikirimPada: text(entry, "dikirimPada"),
      soal: questions,
      berkas: files
    };
  });
}

async function tokenCsrf(): Promise<string> {
  const response = await fetch(`${API_BASE}/csrf`, {
    credentials: "include",
    cache: "no-store"
  });
  const value = await responseJson(response);
  if (!isRecord(value) || typeof value.csrfToken !== "string") {
    throw new Error("Token keamanan sesi tidak tersedia.");
  }
  return value.csrfToken;
}

export function ModerasiAntrian() {
  const [arsip, setArsip] = useState<ArsipModerasi[]>([]);
  const [konfirmasi, setKonfirmasi] = useState<Record<string, boolean>>({});
  const [alasan, setAlasan] = useState<Record<string, string>>({});
  const [tautan, setTautan] = useState<Record<string, string>>({});
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [sedangMemproses, setSedangMemproses] = useState("");
  const [pesanGalat, setPesanGalat] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");

  const muatAntrean = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${API_BASE}/moderation/exam-papers`, {
      credentials: "include",
      cache: "no-store",
      signal
    });
    setArsip(parseQueue(await responseJson(response)));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void muatAntrean(controller.signal)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPesanGalat(error instanceof Error ? error.message : "Antrean moderasi gagal dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSedangMemuat(false);
      });
    return () => controller.abort();
  }, [muatAntrean]);

  async function siapkanTautan(berkasId: string) {
    setPesanGalat("");
    try {
      const response = await fetch(
        `${API_BASE}/storage/uploads/${encodeURIComponent(berkasId)}/download-url`,
        { credentials: "include", cache: "no-store" }
      );
      const value = await responseJson(response);
      if (!isRecord(value) || typeof value.downloadUrl !== "string") {
        throw new Error("Tautan dokumen tidak tersedia.");
      }
      const downloadUrl = value.downloadUrl;
      setTautan((current) => ({ ...current, [berkasId]: downloadUrl }));
    } catch (error) {
      setPesanGalat(error instanceof Error ? error.message : "Dokumen gagal dibuka.");
    }
  }

  async function prosesModerasi(
    item: ArsipModerasi,
    keputusan: "approve" | "reject"
  ) {
    const catatan = alasan[item.id]?.trim() ?? "";
    if (keputusan === "approve" && !konfirmasi[item.id]) {
      setPesanGalat("Konfirmasikan pemeriksaan dokumen sebelum menyetujui.");
      return;
    }
    if (keputusan === "reject" && catatan.length < 10) {
      setPesanGalat("Tuliskan alasan penolakan minimal 10 karakter.");
      return;
    }

    setSedangMemproses(item.id);
    setPesanGalat("");
    setPesanSukses("");
    try {
      const csrf = await tokenCsrf();
      const response = await fetch(
        `${API_BASE}/moderation/exam-papers/${encodeURIComponent(item.id)}/${keputusan}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
          body: JSON.stringify(
            keputusan === "approve"
              ? { confirmNoActiveLeak: konfirmasi[item.id], note: catatan || undefined }
              : { note: catatan }
          )
        }
      );
      await responseJson(response);
      setArsip((current) => current.filter((entry) => entry.id !== item.id));
      setPesanSukses(
        keputusan === "approve"
          ? "Arsip disetujui dan dipublikasikan."
          : "Arsip ditolak dan lampirannya dinonaktifkan."
      );
    } catch (error) {
      setPesanGalat(error instanceof Error ? error.message : "Keputusan moderasi gagal disimpan.");
    } finally {
      setSedangMemproses("");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Ruang moderator</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Antrean verifikasi arsip</h1>
        <p className="mt-2 text-sm text-slate-600">Periksa kelengkapan metadata, dokumen, dan status ujian sebelum mengambil keputusan.</p>
      </header>

      {pesanGalat && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{pesanGalat}</p>}
      {pesanSukses && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{pesanSukses}</p>}
      {sedangMemuat ? (
        <p className="py-12 text-center text-sm text-slate-600" role="status">Memuat antrean moderasi...</p>
      ) : arsip.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ShieldCheck aria-hidden="true" className="mx-auto size-9 text-emerald-700" />
          <h2 className="mt-3 text-lg font-semibold text-slate-800">Antrean moderasi kosong</h2>
          <p className="mt-2 text-sm text-slate-600">Semua kiriman sudah ditinjau.</p>
        </section>
      ) : (
        <section className="space-y-4" aria-label="Daftar arsip menunggu verifikasi">
          {arsip.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">{item.jenisUjian} · Tahun {item.tahunUjian} · Dikirim {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.dikirimPada))}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.namaMataKuliah}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.kodeMataKuliah} · {item.namaFakultas} · {item.programStudi}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Menunggu verifikasi</span>
              </header>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-slate-500">Topik RPS</dt><dd className="mt-1 text-slate-800">{item.topikRps}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Pengunggah</dt><dd className="mt-1 text-slate-800">{item.namaPengunggah}</dd></div>
              </dl>

              {item.soal.map((soal, index) => (
                <section key={`${item.id}-soal-${index}`} className="mt-4 rounded-lg bg-slate-50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pratinjau soal</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{soal.teks}</p>
                  {soal.pembahasan && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600"><strong>Pembahasan:</strong> {soal.pembahasan}</p>}
                </section>
              ))}

              {item.berkas.length > 0 && (
                <section className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lampiran</h3>
                  <ul className="mt-2 space-y-2">
                    {item.berkas.map((berkas) => (
                      <li key={berkas.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <FileText aria-hidden="true" className="size-4 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate text-slate-800">{berkas.nama}</span>
                        <span className="text-xs text-slate-500">{(berkas.ukuran / (1024 * 1024)).toFixed(2)} MB</span>
                        {tautan[berkas.id] ? (
                          <>
                            <a className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline" href={tautan[berkas.id]} target="_blank" rel="noopener noreferrer">
                              Buka berkas <ExternalLink aria-hidden="true" className="size-3.5" />
                            </a>
                            <button type="button" onClick={() => void siapkanTautan(berkas.id)} className="text-xs font-medium text-slate-600 underline">
                              Perbarui tautan
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => void siapkanTautan(berkas.id)} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Siapkan tautan
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="form-grid mt-5 border-t border-slate-200 pt-4">
                <label className="check-row">
                    <input
                      type="checkbox"
                      checked={Boolean(konfirmasi[item.id])}
                      onChange={(event) => setKonfirmasi((current) => ({ ...current, [item.id]: event.target.checked }))}
                    />
                    <span className="checkmark" />
                    Saya memastikan arsip bukan bocoran ujian aktif dan layak dipublikasikan.
                </label>
                <label className="form-field">
                    Alasan penolakan
                    <textarea
                      value={alasan[item.id] ?? ""}
                      onChange={(event) => setAlasan((current) => ({ ...current, [item.id]: event.target.value }))}
                      rows={2}
                      maxLength={1000}
                      placeholder="Jelaskan alasan penolakan (minimal 10 karakter)..."
                    />
                </label>
              </div>
              <div className="form-actions">
                <span>Periksa dokumen dan metadata sebelum memutuskan.</span>
                <div className="moderation-button-group">
                  <button type="button" disabled={sedangMemproses === item.id} onClick={() => void prosesModerasi(item, "approve")} className="button button-dark">
                    {sedangMemproses === item.id ? "Menyimpan..." : "Setujui dan publikasikan"}
                  </button>
                  <button type="button" disabled={sedangMemproses === item.id} onClick={() => void prosesModerasi(item, "reject")} className="button button-outline">
                    Tolak kiriman
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
