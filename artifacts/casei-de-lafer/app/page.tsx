import type { Metadata } from "next";
import ComoFunciona from "@/components/landing/ComoFunciona";
import Final from "@/components/landing/Final";
import Fotos from "@/components/landing/Fotos";
import Perguntas from "@/components/landing/Perguntas";
import Rodape from "@/components/landing/Rodape";
import Servicos from "@/components/landing/Servicos";
import Topo from "@/components/landing/Topo";
import { normalizar, OG } from "@/lib/landing/conteudo";
import { getDadosLanding } from "@/lib/landing/dados";
import { mesSaoPaulo } from "@/lib/landing/toques";
import { idDoYoutube } from "@/lib/landing/youtube";

// A página é montada no servidor e guardada por 60 segundos: abre rápido e já chega com foto, valores e regras.
// Mudanças feitas no painel (foto do topo, galeria, configuração) atualizam a página na hora; preços e regras,
// em até 1 minuto.
export const revalidate = 60;

// O layout define o título e a descrição; aqui o endereço canônico e a pré-visualização do link da página inicial.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...OG, url: "/" },
};

export default async function Page() {
  const dados = await getDadosLanding();
  const videoId = idDoYoutube(dados.topo.desktop?.videoUrl) ?? idDoYoutube(dados.topo.mobile?.videoUrl);
  const precoEnsaio =
    dados.servicos.find((s) => !s.isAddon && normalizar(s.name).startsWith("ensaio"))?.priceCents ?? null;
  const canais = { chat: dados.chatDisponivel, whatsapp: dados.temWhatsapp };

  return (
    <main>
      <Topo topo={dados.topo} heroOpacity={dados.heroOpacity} canais={canais} />
      <Fotos fotos={dados.galeria} videoId={videoId} />
      <Servicos servicos={dados.servicos} canais={canais} />
      <ComoFunciona regras={dados.regras} />
      <Perguntas regras={dados.regras} precoEnsaioCentavos={precoEnsaio} />
      <Final canais={canais} datasReservadas={dados.datasReservadas} mesInicial={mesSaoPaulo(new Date())} />
      <Rodape temWhatsapp={dados.temWhatsapp} />
    </main>
  );
}
