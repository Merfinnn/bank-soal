"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "./auth-context";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { masuk, daftar } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState("");
  const [memproses, setMemproses] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGalat("");
    setMemproses(true);
    try {
      if (mode === "login") await masuk(email, password);
      else await daftar(name, email, password);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setGalat(error instanceof Error ? error.message : "Autentikasi gagal.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="auth-card">
        <p className="section-kicker">{mode === "login" ? "Selamat datang kembali" : "Bergabung dengan komunitas"}</p>
        <h1>{mode === "login" ? "Masuk ke Siap Ujian" : "Buat akun baru"}</h1>
        <form className="form-stack" onSubmit={(event) => void kirim(event)}>
          {mode === "register" && (
            <label className="form-field">
              Nama lengkap
              <input autoComplete="name" maxLength={100} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} />
            </label>
          )}
          <label className="form-field">
            Alamat email
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label className="form-field">
            Kata sandi
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? 1 : 12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {galat && <p className="notice notice-error" role="alert">{galat}</p>}
          <button className="button button-primary" disabled={memproses} type="submit">
            {memproses ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>
        <div className="divider" />
        <p className="muted">
          {mode === "login" ? "Belum memiliki akun? " : "Sudah memiliki akun? "}
          <Link className="inline-link" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Daftar" : "Masuk"}
          </Link>
        </p>
      </section>
    </main>
  );
}
