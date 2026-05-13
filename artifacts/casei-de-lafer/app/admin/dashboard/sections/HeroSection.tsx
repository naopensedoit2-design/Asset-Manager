"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, ImageIcon } from "lucide-react";
import AdminSection from "../AdminSection";

function HeroColumn({ type, label }: { type: "desktop" | "mobile"; label: string }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: hero } = useQuery({
    queryKey: ["admin-hero"],
    queryFn: () => fetch("/api/hero").then((r) => r.json()),
  });

  const current = hero?.[type];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    if (videoUrl) fd.append("videoUrl", videoUrl);
    await fetch("/api/admin/hero", { method: "POST", body: fd });
    queryClient.invalidateQueries({ queryKey: ["admin-hero"] });
    queryClient.invalidateQueries({ queryKey: ["hero"] });
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete() {
    if (!confirm("Remover imagem?")) return;
    await fetch("/api/admin/hero", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    queryClient.invalidateQueries({ queryKey: ["admin-hero"] });
    queryClient.invalidateQueries({ queryKey: ["hero"] });
  }

  async function handleSaveVideo() {
    setSaving(true);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("videoUrl", videoUrl);
    await fetch("/api/admin/hero", { method: "POST", body: fd });
    queryClient.invalidateQueries({ queryKey: ["admin-hero"] });
    queryClient.invalidateQueries({ queryKey: ["hero"] });
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-sans text-sm font-semibold text-text-secondary uppercase tracking-wider">
        {label}
      </h3>

      <div className="aspect-video bg-bg-elevated rounded border border-border-subtle overflow-hidden flex items-center justify-center">
        {current?.url ? (
          <img
            src={current.url}
            alt={`Hero ${type}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <ImageIcon className="w-8 h-8" />
            <span className="font-sans text-xs">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 bg-bg-elevated hover:bg-border-subtle border border-border-subtle text-text-secondary hover:text-text-primary font-sans text-xs py-2 px-3 rounded transition-colors cursor-pointer disabled:opacity-40"
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Enviando..." : "Selecionar imagem"}
        </button>
        {current?.url && (
          <button
            onClick={handleDelete}
            className="p-2.5 bg-bg-elevated hover:bg-destructive/10 border border-border-subtle text-text-muted hover:text-destructive rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label className="font-sans text-xs text-text-muted">
          ID do vídeo YouTube (opcional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={videoUrl || current?.videoUrl || ""}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Ex: dQw4w9WgXcQ"
            className="flex-1 bg-bg-elevated border border-border-subtle text-text-primary placeholder-text-muted px-3 py-2 rounded font-sans text-xs focus:outline-none focus:border-gold/50 transition-colors"
          />
          <button
            onClick={handleSaveVideo}
            disabled={saving}
            className="px-3 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold font-sans text-xs rounded transition-colors cursor-pointer disabled:opacity-40"
          >
            {saving ? "..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <AdminSection title="Hero">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <HeroColumn type="desktop" label="Desktop" />
        <HeroColumn type="mobile" label="Mobile" />
      </div>
    </AdminSection>
  );
}
