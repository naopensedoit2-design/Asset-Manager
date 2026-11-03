import { BOTAO, INSTAGRAM, SEM_CANAIS, TOPO } from "@/lib/landing/conteudo";
import { acoes, type Botao, type Canais } from "@/lib/landing/links";
import { botao as classeBotao, linkTexto } from "./estilos";

interface Props {
  /** Qual botão da página é este; só serve para saber de onde veio o toque. */
  slot: Botao;
  canais: Canais;
  /** Mostra a frase explicando o que acontece depois do toque. */
  nota?: boolean;
  className?: string;
}

// A ação principal da página tem um nome só (BOTAO) e fica igual no topo, em "Serviços e valores" e no final.
// Se o canal preferido estiver fora do ar, o outro assume; sem nenhum dos dois, aviso em vez de botão.
export default function CtaBloco({ slot, canais, nota = true, className = "" }: Props) {
  const { principal, secundaria } = acoes(slot, canais);

  if (!principal) {
    return (
      <div className={className}>
        <p className="text-text-primary">{SEM_CANAIS.texto}</p>
        <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className={linkTexto}>
          {SEM_CANAIS.instagram}
        </a>
      </div>
    );
  }

  const textoNota = principal.tipo === "chat" ? TOPO.notaChat : TOPO.notaWhatsapp;
  const textoLink = secundaria?.tipo === "whatsapp" ? TOPO.linkWhatsapp : TOPO.linkChat;

  return (
    <div className={className}>
      <a href={principal.href} className={classeBotao}>
        {BOTAO}
      </a>
      {nota && <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{textoNota}</p>}
      {secundaria && (
        <div className="mt-1">
          <a href={secundaria.href} className={linkTexto}>
            {textoLink}
          </a>
        </div>
      )}
    </div>
  );
}
