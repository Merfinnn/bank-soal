"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import type { PilihanFakultas, PilihanMataKuliah } from "./EksplorasiSoal";

const BATAS_BERKAS = 15 * 1024 * 1024;
const TIPE_PER_EKSTENSI: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg"
};

export type DataUnggahan = {
  id: string;
  status: "PENDING";
};

type Props = {
  terbuka: boolean;
  modeAwal?: "dokumen" | "manual";
  fakultas: PilihanFakultas[];
  mataKuliah: PilihanMataKuliah[];
  saatTutup: () => void;
  saatKirim: (hasil: DataUnggahan) => void;
};

type JenisBerkasUnggahan = "EXAM_DOCUMENT" | "ANSWER_KEY";
type DataPresign = {
  uploadId: string;
  uploadUrl: string;
  fields: Record<string, string>;
  storageMode: "S3" | "LOCAL";
};
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pesanGalatApi(value: unknown, fallback: string): string {
  if (!isRecord(value) || !("message" in value)) return fallback;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === "string")) {
    return value.message.join(" ");
  }
  return fallback;
}

function stringDari(value: unknown, key: string): string {
  if (isRecord(value) && typeof value[key] === "string") return value[key];
  throw new Error("Respons server tidak lengkap. Muat ulang halaman dan coba lagi.");
}

async function bacaResponsApi(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(pesanGalatApi(body, `Permintaan gagal (${response.status}).`));
  }
  return body;
}

function parseDataPresign(value: unknown): DataPresign {
  if (
    !isRecord(value)
    || !isRecord(value.fields)
    || (value.storageMode !== "S3" && value.storageMode !== "LOCAL")
  ) {
    throw new Error("Respons unggahan tidak valid. Coba lagi.");
  }
  const fields: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(value.fields)) {
    if (typeof fieldValue !== "string") throw new Error("Data formulir unggahan tidak valid.");
    fields[key] = fieldValue;
  }
  return {
    uploadId: stringDari(value, "uploadId"),
    uploadUrl: stringDari(value, "uploadUrl"),
    fields,
    storageMode: value.storageMode
  };
}

async function unggahKeS3(
  berkas: File,
  kind: JenisBerkasUnggahan,
  tokenCsrf: string
): Promise<string> {
  const presignResponse = await fetch(`${API_BASE}/storage/uploads/presign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": tokenCsrf },
    body: JSON.stringify({
      kind,
      originalName: berkas.name,
      contentType: berkas.type,
      sizeBytes: berkas.size
    })
  });
  const presign = parseDataPresign(await bacaResponsApi(presignResponse));
  const form = new FormData();
  if (presign.storageMode === "LOCAL") {
    form.append("file", berkas, berkas.name);
    const uploadResponse = await fetch(
      `${API_BASE}/storage/uploads/${encodeURIComponent(presign.uploadId)}/local`,
      {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": tokenCsrf },
        body: form
      }
    );
    await bacaResponsApi(uploadResponse);
    return presign.uploadId;
  }

  for (const [key, value] of Object.entries(presign.fields)) form.append(key, value);
  form.append("file", berkas, berkas.name);

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: "POST",
    credentials: "omit",
    body: form
  });
  if (!uploadResponse.ok) {
    throw new Error("Berkas gagal dikirim ke penyimpanan. Periksa koneksi dan coba lagi.");
  }
  return presign.uploadId;
}

function validasiBerkas(berkas: File, lampiranPembahasan = false): string | null {
  const ekstensi = berkas.name.split(".").pop()?.toLocaleLowerCase("id");
  const ekstensiValid = lampiranPembahasan
    ? ekstensi === "pdf"
    : ["pdf", "png", "jpg", "jpeg"].includes(ekstensi ?? "");
  const tipeSesuai = berkas.type === TIPE_PER_EKSTENSI[ekstensi ?? ""];

  if (!ekstensiValid || !tipeSesuai) return lampiranPembahasan ? "Lampiran pembahasan harus berformat PDF." : "Pilih berkas PDF, PNG, atau JPG.";
  if (berkas.size < 1) return "Berkas tidak boleh kosong.";
  if (berkas.size > BATAS_BERKAS) return "Ukuran setiap berkas maksimal 15 MB.";
  return null;
}

export function UnggahDokumenModal({ terbuka, modeAwal = "dokumen", fakultas, mataKuliah, saatTutup, saatKirim }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"dokumen" | "manual">(modeAwal);
  const [kodeFakultas, setKodeFakultas] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [mataKuliahId, setMataKuliahId] = useState("");
  const [topikRps, setTopikRps] = useState("");
  const [jenisUjian, setJenisUjian] = useState<"UTS" | "UAS">("UTS");
  const [tahunUjian, setTahunUjian] = useState(String(new Date().getFullYear()));
  const [teksSoal, setTeksSoal] = useState("");
  const [pembahasan, setPembahasan] = useState("");
  const [berkasSoal, setBerkasSoal] = useState<File | null>(null);
  const [pdfPembahasan, setPdfPembahasan] = useState<File | null>(null);
  const [konfirmasiHakDistribusi, setKonfirmasiHakDistribusi] = useState(false);
  const [pesanGalat, setPesanGalat] = useState("");
  const [sedangMengirim, setSedangMengirim] = useState(false);
  const programPilihan = fakultas.find((item) => item.kode === kodeFakultas)?.programStudi ?? [];
  const coursePilihan = mataKuliah.filter(
    (item) => item.kodeFakultas === kodeFakultas && item.departmentId === departmentId
  );
  const mataKuliahDipilih = coursePilihan.find((item) => item.id === mataKuliahId);
  const [urlPratinjau, setUrlPratinjau] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (terbuka && !dialog.open) {
      setMode(modeAwal);
      dialog.showModal();
    }
    if (!terbuka && dialog.open) dialog.close();
  }, [terbuka, modeAwal]);

  useEffect(() => {
    if (!berkasSoal) {
      setUrlPratinjau("");
      return;
    }
    const url = URL.createObjectURL(berkasSoal);
    setUrlPratinjau(url);
    return () => URL.revokeObjectURL(url);
  }, [berkasSoal]);

  function pilihBerkas(berkas: File | undefined, target: "soal" | "pembahasan") {
    if (!berkas) return;
    const galat = validasiBerkas(berkas, target === "pembahasan");
    if (galat) {
      setPesanGalat(galat);
      if (target === "soal") setBerkasSoal(null);
      else setPdfPembahasan(null);
      return;
    }
    setPesanGalat("");
    if (target === "soal") setBerkasSoal(berkas);
    else setPdfPembahasan(berkas);
  }

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "dokumen" && !berkasSoal) {
      setPesanGalat("Pilih dokumen soal sebelum mengirim.");
      return;
    }
    if (mode === "manual" && !teksSoal.trim()) {
      setPesanGalat("Teks soal wajib diisi untuk unggahan manual.");
      return;
    }
    if (!pembahasan.trim() && !pdfPembahasan) {
      setPesanGalat("Isi pembahasan atau lampirkan PDF kunci jawaban.");
      return;
    }
    if (!konfirmasiHakDistribusi) {
      setPesanGalat("Konfirmasikan hak berbagi dan pastikan dokumen bukan bocoran ujian aktif.");
      return;
    }
    if (!mataKuliahDipilih || !topikRps.trim()) {
      setPesanGalat("Pilih mata kuliah dan isi topik RPS yang sesuai.");
      return;
    }

    setSedangMengirim(true);
    setPesanGalat("");
    try {
      const csrfResponse = await fetch(`${API_BASE}/csrf`, {
        credentials: "include",
        cache: "no-store"
      });
      const csrfBody = await bacaResponsApi(csrfResponse);
      const tokenCsrf = stringDari(csrfBody, "csrfToken");
      const examUploadId = mode === "dokumen" && berkasSoal
        ? await unggahKeS3(berkasSoal, "EXAM_DOCUMENT", tokenCsrf)
        : undefined;
      const answerUploadId = pdfPembahasan
        ? await unggahKeS3(pdfPembahasan, "ANSWER_KEY", tokenCsrf)
        : undefined;
      const metadataResponse = await fetch(`${API_BASE}/exam-papers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": tokenCsrf },
        body: JSON.stringify({
          courseId: mataKuliahDipilih.id,
          examYear: Number(tahunUjian),
          examType: jenisUjian,
          topicName: topikRps.trim(),
          examUploadId,
          answerUploadId,
          questionText: teksSoal.trim() || undefined,
          explanation: pembahasan.trim() || undefined,
          distributionRightsConfirmed: konfirmasiHakDistribusi
        })
      });
      const metadata = await bacaResponsApi(metadataResponse);
      const status = stringDari(metadata, "status");
      if (status !== "PENDING") {
        throw new Error("Arsip tidak masuk ke antrean verifikasi. Hubungi administrator.");
      }
      saatKirim({ id: stringDari(metadata, "id"), status: "PENDING" });
      saatTutup();
    } catch (error) {
      setPesanGalat(error instanceof Error ? error.message : "Unggahan gagal dikirim. Coba lagi.");
    } finally {
      setSedangMengirim(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="upload-dialog fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center bg-transparent p-4"
      aria-labelledby="judul-modal-unggah"
      onCancel={(event) => { event.preventDefault(); saatTutup(); }}
      onClose={saatTutup}
    >
      <div className="upload-dialog-panel flex flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-emerald-800">Kontribusi soal</p><h2 id="judul-modal-unggah" className="mt-1 text-xl font-bold">Unggah dokumen ujian</h2><p className="mt-1 text-sm text-slate-600">Metadata lengkap membantu teman menemukan arsip yang tepat.</p></div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup jendela unggah" onClick={saatTutup}><X className="size-5" /></button>
        </header>

        <form className="overflow-y-auto" onSubmit={kirim}>
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.05fr]">
            <div className="space-y-4">
              <div className="upload-mode-switch" role="tablist" aria-label="Pilih cara memasukkan soal">
                <button type="button" role="tab" aria-selected={mode === "dokumen"} className={`upload-mode${mode === "dokumen" ? " active" : ""}`} onClick={() => setMode("dokumen")}>Unggah PDF / Foto</button>
                <button type="button" role="tab" aria-selected={mode === "manual"} className={`upload-mode${mode === "manual" ? " active" : ""}`} onClick={() => setMode("manual")}>Tulis Soal Manual</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">Fakultas <span className="sr-only">(wajib)</span>
                  <select required value={kodeFakultas} onChange={(event) => { setKodeFakultas(event.target.value); setDepartmentId(""); setMataKuliahId(""); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal">
                    <option value="">Pilih fakultas</option>{fakultas.map((item) => <option key={item.kode} value={item.kode}>{item.nama}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Program Studi
                  <select required value={departmentId} disabled={!kodeFakultas} onChange={(event) => { setDepartmentId(event.target.value); setMataKuliahId(""); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
                    <option value="">Pilih program studi</option>{programPilihan.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Mata Kuliah
                  <select required value={mataKuliahId} disabled={!departmentId} onChange={(event) => setMataKuliahId(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
                    <option value="">
                      {departmentId && coursePilihan.length === 0
                        ? "Mata kuliah belum tersedia"
                        : "Pilih mata kuliah"}
                    </option>
                    {coursePilihan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama} · {item.kode} · Semester {item.semester}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Topik RPS
                  <input required value={topikRps} onChange={(event) => setTopikRps(event.target.value)} placeholder="Contoh: Turunan Fungsi" className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Jenis Ujian
                  <select required value={jenisUjian} onChange={(event) => { if (event.target.value === "UTS" || event.target.value === "UAS") setJenisUjian(event.target.value); }} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="UTS">Ujian Tengah Semester (UTS)</option><option value="UAS">Ujian Akhir Semester (UAS)</option></select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Tahun Ujian
                  <input required type="number" min="2000" max={new Date().getFullYear() + 1} value={tahunUjian} onChange={(event) => setTahunUjian(event.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-normal" />
                </label>
              </div>

              {mode === "dokumen" ? (
                <label
                  className="upload-dropzone relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-center hover:bg-emerald-50"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); pilihBerkas(event.dataTransfer.files[0], "soal"); }}
                >
                  <Upload aria-hidden="true" className="size-6 text-emerald-800" />
                  <span className="text-sm font-semibold text-slate-800">{berkasSoal?.name ?? "Pilih atau letakkan berkas soal"}</span>
                  <span className="text-xs text-slate-600">PDF, PNG, atau JPG · Maksimal 15 MB</span>
                  <input className="upload-file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => pilihBerkas(event.target.files?.[0], "soal")} />
                </label>
              ) : (
                <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Teks Soal
                  <textarea required value={teksSoal} onChange={(event) => setTeksSoal(event.target.value)} rows={4} placeholder="Tuliskan konteks, instruksi, dan soal secara lengkap..." className="rounded-lg border border-slate-300 p-3 text-sm font-normal" />
                </label>
              )}

              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Pembahasan langkah demi langkah
                <textarea value={pembahasan} onChange={(event) => setPembahasan(event.target.value)} rows={3} placeholder="Uraikan langkah penyelesaian atau alasan jawaban..." className="rounded-lg border border-slate-300 p-3 text-sm font-normal" />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600"><FileText aria-hidden="true" className="size-4 shrink-0" />atau lampirkan PDF kunci jawaban
                <input className="block min-w-0 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1.5" type="file" accept=".pdf,application/pdf" onChange={(event) => pilihBerkas(event.target.files?.[0], "pembahasan")} />
              </label>
              {pdfPembahasan && <p className="text-xs text-emerald-800">PDF pembahasan: {pdfPembahasan.name}</p>}
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Berkas PDF yang diunggah akan diverifikasi oleh moderator sebelum dipublikasikan.</p>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input required type="checkbox" checked={konfirmasiHakDistribusi} onChange={(event) => setKonfirmasiHakDistribusi(event.target.checked)} className="mt-0.5 accent-emerald-800" />Saya berhak membagikan arsip ini; dokumen bukan bocoran ujian aktif dan tidak memuat data pribadi.</label>
            </div>

            <section className="min-h-72 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" aria-label="Pratinjau dokumen">
              <div className="border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">PRATINJAU DOKUMEN</div>
              {urlPratinjau && berkasSoal ? (
                (berkasSoal.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(berkasSoal.name))
                  ? <img className="max-h-[570px] w-full object-contain" src={urlPratinjau} alt="Pratinjau berkas soal" />
                  : <iframe className="h-[570px] w-full bg-white" src={urlPratinjau} title="Pratinjau PDF soal" />
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                  <FileText aria-hidden="true" className="size-9 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Dokumenmu tampil di sini</p>
                  <p className="mt-1 text-xs text-slate-500">Pratinjau PDF atau foto muncul setelah berkas dipilih.</p>
                </div>
              )}
            </section>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <div className="max-w-md text-xs text-red-700" role="alert">{pesanGalat}</div>
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={sedangMengirim} onClick={saatTutup} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Batal</button>
              <button type="submit" disabled={sedangMengirim} className="button button-dark disabled:cursor-wait disabled:opacity-60">{sedangMengirim ? "Mengirim..." : "Kirim untuk verifikasi"}</button>
            </div>
          </footer>
        </form>
      </div>
    </dialog>
  );
}
