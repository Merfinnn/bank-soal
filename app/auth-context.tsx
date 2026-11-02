"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export type Pengguna = {
  id: string;
  name: string;
  email: string;
  role: "GUEST" | "KONTRIBUTOR" | "MODERATOR" | "ADMIN";
  departmentId: string | null;
};

type StatusAutentikasi = "memuat" | "tamu" | "masuk" | "galat";
type AuthContextValue = {
  pengguna: Pengguna | null;
  status: StatusAutentikasi;
  pesanGalat: string;
  muatUlang: () => Promise<void>;
  masuk: (email: string, password: string) => Promise<void>;
  daftar: (name: string, email: string, password: string) => Promise<void>;
  keluar: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pesanRespons(value: unknown, fallback: string): string {
  if (!isRecord(value) || !("message" in value)) return fallback;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.message) && value.message.every((item) => typeof item === "string")) {
    return value.message.join(" ");
  }
  return fallback;
}

async function bacaJson(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(pesanRespons(body, `Permintaan gagal (${response.status}).`));
  return body;
}

function bacaPengguna(value: unknown): Pengguna | null {
  if (!isRecord(value) || !("user" in value)) throw new Error("Respons sesi tidak valid.");
  if (value.user === null) return null;
  if (!isRecord(value.user)) throw new Error("Data pengguna tidak valid.");
  const { id, name, email, role, departmentId } = value.user;
  if (
    typeof id !== "string"
    || typeof name !== "string"
    || typeof email !== "string"
    || (role !== "GUEST" && role !== "KONTRIBUTOR" && role !== "MODERATOR" && role !== "ADMIN")
    || (departmentId !== null && typeof departmentId !== "string")
  ) {
    throw new Error("Data pengguna tidak lengkap.");
  }
  return { id, name, email, role, departmentId };
}

async function tokenCsrf(): Promise<string> {
  const response = await fetch(`${API_BASE}/csrf`, {
    credentials: "include",
    cache: "no-store"
  });
  const value = await bacaJson(response);
  if (!isRecord(value) || typeof value.csrfToken !== "string") {
    throw new Error("Token keamanan sesi tidak tersedia.");
  }
  return value.csrfToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [status, setStatus] = useState<StatusAutentikasi>("memuat");
  const [pesanGalat, setPesanGalat] = useState("");

  const muatUlang = useCallback(async () => {
    setStatus("memuat");
    setPesanGalat("");
    try {
      const response = await fetch(`${API_BASE}/me`, {
        credentials: "include",
        cache: "no-store"
      });
      const user = bacaPengguna(await bacaJson(response));
      setPengguna(user);
      setStatus(user ? "masuk" : "tamu");
    } catch (error) {
      setPengguna(null);
      setStatus("galat");
      setPesanGalat(error instanceof Error ? error.message : "Sesi gagal diperiksa.");
    }
  }, []);

  useEffect(() => {
    void muatUlang();
  }, [muatUlang]);

  const masukDengan = useCallback(async (
    path: "login" | "register",
    body: Record<string, string>
  ) => {
    setPesanGalat("");
    const csrf = await tokenCsrf();
    const response = await fetch(`${API_BASE}/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body)
    });
    const user = bacaPengguna(await bacaJson(response));
    if (!user) throw new Error("Server tidak mengembalikan sesi pengguna.");
    setPengguna(user);
    setStatus("masuk");
  }, []);

  const masuk = useCallback(
    (email: string, password: string) => masukDengan("login", { email, password }),
    [masukDengan]
  );
  const daftar = useCallback(
    (name: string, email: string, password: string) =>
      masukDengan("register", { name, email, password }),
    [masukDengan]
  );

  const keluar = useCallback(async () => {
    const csrf = await tokenCsrf();
    const response = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrf }
    });
    await bacaJson(response);
    setPengguna(null);
    setStatus("tamu");
  }, []);

  const value = useMemo(
    () => ({ pengguna, status, pesanGalat, muatUlang, masuk, daftar, keluar }),
    [pengguna, status, pesanGalat, muatUlang, masuk, daftar, keluar]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  return context;
}
