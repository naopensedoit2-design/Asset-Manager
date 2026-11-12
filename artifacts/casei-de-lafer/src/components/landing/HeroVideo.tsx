"use client";

import { useEffect, useState } from "react";

interface Props {
  /** Código do vídeo do YouTube cadastrado no painel para o computador ("" = sem vídeo). */
  desktop: string;
  /** Idem, para o celular. */
  mobile: string;
}

// Só aceita o formato de um código de vídeo do YouTube; qualquer outra coisa é ignorada.
const CODIGO = /^[A-Za-z0-9_-]{6,20}$/;

// Vídeo do topo, como antes: entra depois que a página abre e escolhe o do celular ou o do computador
// pela largura da tela. Sem vídeo cadastrado, não desenha nada.
export default function HeroVideo({ desktop, mobile }: Props) {
  const [id, setId] = useState("");

  useEffect(() => {
    const escolher = () => setId(window.innerWidth < 768 ? mobile : desktop);
    escolher();
    window.addEventListener("resize", escolher);
    return () => window.removeEventListener("resize", escolher);
  }, [desktop, mobile]);

  if (!CODIGO.test(id)) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <iframe
        className="absolute top-1/2 left-1/2 h-[56.25vw] min-h-screen w-screen min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2 border-0"
        src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&fs=0`}
        title="Hero Video"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
