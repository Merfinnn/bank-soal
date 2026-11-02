"use client";

import { useRouter } from "next/navigation";
import { EksplorasiSoal } from "../../components/EksplorasiSoal";

export default function EksplorasiPage() {
  const router = useRouter();
  return <EksplorasiSoal saatArsipDipilih={(id) => router.push(`/soal/${encodeURIComponent(id)}`)} />;
}
