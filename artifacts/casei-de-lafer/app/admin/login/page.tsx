"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin/dashboard");
    } else {
      const data = await res.json();
      setError(data.error ?? "Senha incorreta");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full border border-gold/30 flex items-center justify-center mb-6 bg-gold-muted">
            <LockKeyhole className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-serif text-2xl text-text-primary mb-1">
            Área Restrita
          </h1>
          <p className="font-sans text-text-secondary text-sm text-center">
            Acesso exclusivo para administradores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full bg-bg-card border border-border-subtle text-text-primary placeholder-text-muted px-4 py-3 rounded font-sans text-sm focus:outline-none focus:border-gold/50 transition-colors"
            autoFocus
            required
          />

          {error && (
            <p className="text-sm text-destructive font-sans">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 text-bg-primary font-sans font-semibold text-sm tracking-widest py-3 rounded transition-colors uppercase cursor-pointer"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <a
          href="/"
          className="block text-center mt-8 text-text-muted hover:text-text-secondary font-sans text-sm transition-colors"
        >
          ← Voltar ao site
        </a>
      </div>
    </div>
  );
}
