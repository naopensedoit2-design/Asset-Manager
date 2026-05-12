"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X } from "lucide-react";
import AdminSection from "../AdminSection";

interface GalleryImage {
  id: number;
  url: string;
  coupleTag: string;
  location: string;
}

function GalleryItem({ image }: { image: GalleryImage }) {
  const [coupleTag, setCoupleTag] = useState(image.coupleTag);
  const [location, setLocation] = useState(image.location);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  async function handleDelete() {
    if (!confirm("Remover foto?")) return;
    await fetch(`/api/admin/gallery/${image.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    queryClient.invalidateQueries({ queryKey: ["gallery"] });
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/admin/gallery/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coupleTag, location }),
    });
    queryClient.invalidateQueries({ queryKey: ["gallery"] });
    setSaving(false);
  }

  return (
    <div className="bg-bg-elevated rounded border border-border-subtle overflow-hidden">
      <div className="relative aspect-square">
        <img
          src={image.url}
          alt={image.coupleTag || "Foto da galeria"}
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-destructive text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-2 space-y-1.5">
        <input
          value={coupleTag}
          onChange={(e) => setCoupleTag(e.target.value)}
          placeholder="Tag do casal"
          className="w-full bg-bg-card border border-border-subtle text-text-primary placeholder-text-muted px-2 py-1 rounded font-sans text-xs focus:outline-none focus:border-gold/50 transition-colors"
        />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Local"
          className="w-full bg-bg-card border border-border-subtle text-text-primary placeholder-text-muted px-2 py-1 rounded font-sans text-xs focus:outline-none focus:border-gold/50 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-1 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold font-sans text-xs rounded transition-colors cursor-pointer disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export default function GallerySection() {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: images = [] } = useQuery<GalleryImage[]>({
    queryKey: ["admin-gallery"],
    queryFn: () => fetch("/api/gallery").then((r) => r.json()),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.slice(0, 20).forEach((f) => fd.append("files", f));
    await fetch("/api/admin/gallery", { method: "POST", body: fd });
    queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
    queryClient.invalidateQueries({ queryKey: ["gallery"] });
    setUploading(false);
    e.target.value = "";
  }

  return (
    <AdminSection title="Galeria">
      <div className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-bg-elevated hover:bg-border-subtle border border-border-subtle border-dashed text-text-secondary hover:text-text-primary font-sans text-sm px-6 py-3 rounded transition-colors cursor-pointer disabled:opacity-40"
        >
          <Upload className="w-4 h-4" />
          {uploading ? "Enviando fotos..." : "Selecionar fotos (até 20)"}
        </button>
      </div>

      {images.length === 0 ? (
        <p className="font-sans text-sm text-text-muted">
          Nenhuma foto na galeria.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img) => (
            <GalleryItem key={img.id} image={img} />
          ))}
        </div>
      )}
    </AdminSection>
  );
}
