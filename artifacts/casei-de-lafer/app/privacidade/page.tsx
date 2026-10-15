import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade — Eu Casei de Lafer",
  description: "Como a Eu Casei de Lafer usa e protege os dados de quem pede orçamento e contrata o MP Lafer.",
  robots: "index, follow",
};

// Página exigida pela Meta para publicar o app do WhatsApp (e boa prática pela LGPD).
// Revise o texto se mudar algum fornecedor (IA, hospedagem, transcrição de áudio).

const SECTIONS: { id?: string; title: string; body: string[] }[] = [
  {
    title: "Quem somos",
    body: [
      "A Eu Casei de Lafer aluga um MP Lafer conversível para casamentos e ensaios na Serra Gaúcha. O responsável pelo atendimento e pelos dados é o Leonardo, proprietário do negócio.",
      "O atendimento pode ser feito pela Margot, nossa assistente virtual (inteligência artificial), no site e no WhatsApp, sempre com o Leonardo acompanhando e respondendo pessoalmente quando necessário.",
    ],
  },
  {
    title: "Quais dados coletamos",
    body: [
      "Para orçamento e reserva: nome, número de WhatsApp, data, horário, local e cidade do evento, serviços desejados e o que você contar na conversa.",
      "Para o Termo Simplificado de prestação de serviço: nome completo, CPF (ou passaporte) e endereço de quem contrata.",
      "Mensagens, fotos, áudios e documentos enviados no WhatsApp do atendimento, incluindo comprovantes de pagamento.",
    ],
  },
  {
    title: "Para que usamos",
    body: [
      "Responder dúvidas, conferir a disponibilidade da data, enviar orçamento e proposta, preparar o termo, confirmar pagamentos, organizar a agenda do carro e falar com você antes e depois do evento.",
      "Não vendemos seus dados e não enviamos propaganda sem que você peça.",
    ],
  },
  {
    title: "Com quem compartilhamos",
    body: [
      "Somente com serviços necessários para o atendimento funcionar: Meta (WhatsApp), Anthropic (inteligência artificial da Margot), OpenAI (transcrição e leitura de áudios, quando usada), Vercel e Neon (hospedagem do site e do banco de dados), Google (agenda) e Cloudinary (imagens do site).",
      "Esses serviços tratam os dados apenas para executar o que pedimos, conforme as políticas de cada um.",
    ],
  },
  {
    title: "Por quanto tempo guardamos",
    body: [
      "Pelo tempo necessário para o atendimento e o contrato e, depois, pelo prazo exigido por obrigações legais e fiscais. Conversas sem contratação podem ser apagadas a qualquer momento a seu pedido.",
    ],
  },
  {
    id: "exclusao",
    title: "Seus direitos e exclusão de dados",
    body: [
      "Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir acesso, correção ou exclusão dos seus dados, e saber com quem foram compartilhados.",
      "Para isso, mande uma mensagem no WhatsApp do atendimento ou no Instagram @eucaseidelafer pedindo a exclusão. Respondemos em até 15 dias.",
    ],
  },
  {
    title: "Segurança",
    body: [
      "Os dados ficam em serviços com conexão criptografada e acesso restrito ao proprietário. Documentos como proposta e termo usam links privados, que só quem recebe conhece.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <Link href="/" className="text-sm text-gold hover:text-gold-light">
          ← Eu Casei de Lafer
        </Link>
        <h1 className="font-serif text-4xl sm:text-5xl text-gold mt-6">Política de privacidade</h1>
        <p className="text-sm text-text-muted mt-3">Atualizada em outubro de 2026.</p>
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title} id={s.id} className="scroll-mt-8">
              <h2 className="font-serif text-2xl text-text-primary">{s.title}</h2>
              <div className="mt-3 space-y-3 text-text-secondary leading-relaxed">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
