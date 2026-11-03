"use client";

import { useEffect, useRef, useState } from "react";
import { otimizada, srcSet } from "@/lib/landing/imagem";

interface Props {
  src: string;
  alt: string;
  larguras: readonly number[];
  sizes: string;
  className?: string;
}

// Foto do Cloudinary no tamanho e no formato certos. Se a versão otimizada não carregar (conta com transformação
// bloqueada, por exemplo), volta sozinha para a foto original: nunca fica quadro vazio.
export default function FotoSegura({ src, alt, larguras, sizes, className }: Props) {
  const [original, setOriginal] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // O erro pode acontecer antes de o React assumir a página: confere de novo depois de montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setOriginal(true);
  }, []);

  return (
    <img
      ref={ref}
      src={original ? src : otimizada(src, Math.max(...larguras))}
      srcSet={original ? undefined : srcSet(src, larguras)}
      sizes={original ? undefined : sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setOriginal(true)}
      className={className}
    />
  );
}
