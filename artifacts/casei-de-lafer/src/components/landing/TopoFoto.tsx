"use client";

import { useEffect, useRef, useState } from "react";
import { otimizada, srcSet } from "@/lib/landing/imagem";

interface Props {
  desktop: string;
  mobile: string;
  alt: string;
  className?: string;
}

// Foto do topo: celular e computador escolhem a própria foto pelo navegador (sem JavaScript, sem baixar duas vezes).
// Mesma proteção da FotoSegura: se a versão otimizada falhar, usa as originais.
export default function TopoFoto({ desktop, mobile, alt, className }: Props) {
  const [original, setOriginal] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setOriginal(true);
  }, []);

  return (
    <picture>
      <source
        media="(min-width: 768px)"
        srcSet={original ? desktop : (srcSet(desktop, [1024, 1600, 2048]) ?? desktop)}
        sizes="100vw"
      />
      <img
        ref={ref}
        src={original ? mobile : otimizada(mobile, 828)}
        srcSet={original ? undefined : srcSet(mobile, [480, 828, 1080])}
        sizes="100vw"
        alt={alt}
        fetchPriority="high"
        decoding="async"
        onError={() => setOriginal(true)}
        className={className}
      />
    </picture>
  );
}
