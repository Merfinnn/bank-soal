"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-context";
import { Navbar } from "./components/Navbar";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      {children}
    </AuthProvider>
  );
}
