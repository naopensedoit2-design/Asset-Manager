"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GestaoView from "@/components/gestor/GestaoView";

// Painel completo. O endereço antigo da aba Site (?aba=site) leva para a página Site nova (/admin/site).
function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const antigoSite = params.get("aba") === "site";
  useEffect(() => {
    if (antigoSite) router.replace("/admin/site");
  }, [antigoSite, router]);

  if (antigoSite) return null;
  return (
    <div>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <GestaoView />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div />}>
      <Dashboard />
    </Suspense>
  );
}
