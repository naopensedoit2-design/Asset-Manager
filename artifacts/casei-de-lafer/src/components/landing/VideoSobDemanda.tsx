"use client";

import { useState } from "react";
import { linkTexto } from "./estilos";

// O vídeo do YouTube só é carregado quando a pessoa pede: antes do toque a página não chama nenhum site de fora.
export default function VideoSobDemanda({ id, rotulo }: { id: string; rotulo: string }) {
  const [aberto, setAberto] = useState(false);

  if (aberto) {
    return (
      <div className="aspect-video w-full overflow-hidden bg-bg-card">
        <iframe
          className="h-full w-full border-0"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title="Vídeo do MP Lafer"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setAberto(true)} className={`${linkTexto} cursor-pointer`}>
      {rotulo}
    </button>
  );
}
