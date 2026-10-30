# Painel do administrador no celular — mapa e integrações

Este guia acompanha a tela **Conexões** (`/admin/conexoes`). Ela mostra o estado real de cada canal e nunca finge que algo está ligado. Aqui ficam o porquê, as opções e o que ainda depende de decisão do dono.

Marcações: **[FATO]** conferido numa fonte · **[OBSERVADO]** visto no sistema · **[NÃO VERIFICADO]** ainda não conferi · **[RECOMENDAÇÃO]** · **[DECISÃO PENDENTE]**.

---

## 1. Como o painel está organizado

Menu embaixo no celular (lateral no computador):

| Aba | Para que serve |
|---|---|
| **Hoje** | A fila do que precisa de você agora, as próximas paradas (casamentos) e o estado da Margot. |
| **Pedidos** | Todos os pedidos por situação, com busca. |
| **Conversas** | O WhatsApp da Margot. |
| **Dinheiro** | Resumo, contas a pagar e contas pagas. |
| **Mais** | Margot e regras, Conexões, site, aparência e sair. |

**A fila de Hoje** junta quatro fontes e só mostra exceções:

1. Pedidos de confirmação da Margot (**Confirmar** com um toque; vêm primeiro porque muitas vezes destravam o resto).
2. Alertas do negócio (data em conflito, reserva expirando, pagamento atrasado, orçamento sem resposta…).
3. Conversas que a Margot não resolve sozinha: você assumiu a conversa, passaram as 24 h do WhatsApp, a Margot está pausada ou ela demorou mais de 30 min.
4. Contas a pagar vencidas ou que vencem em até 3 dias.

Conversa que a Margot está cuidando não entra na fila.

**Aparência** (Mais → Aparência): 4 temas (**Clássico**, o visual de sempre · **Grafite** · **Pérola**, claro · **Sol**, contraste máximo para usar na rua), 6 cores de destaque, 3 tamanhos de texto e o modo **Automático**, que segue o modo escuro/claro do celular. Fica salvo **no aparelho** (não vai para o banco), então cada aparelho pode ter o seu. O site público não muda.

Para quem for mexer no código: as cores vêm de `app/admin/theme.css`; as telas usam só classes do tema (`text-gold`, `text-ok`, `bg-bg-card`…). `src/lib/admin/look.test.ts` confere o contraste de todas as combinações e `src/lib/admin/tokens.test.ts` barra cores fixas nas telas.

---

## 2. Estado de cada canal

| Canal | Onde roda | O que faz hoje | O que falta |
|---|---|---|---|
| **WhatsApp da Margot** | No painel | Atende clientes, avisa você, aprova com um toque. | Variáveis da Meta (ver `docs/whatsapp.md`). **Conferir agora** testa a ligação de verdade. |
| **Financeiro** | No painel | Pagamentos, despesas e contas a pagar; a Margot lança despesas pelo seu WhatsApp e só grava depois do seu “sim”. | — |
| **Google Agenda** | No painel | Casamento confirmado entra na sua agenda; dias ocupados travam o site e a Margot. | Conta de serviço e id da agenda. |
| **Rotina das 7h** | No painel | Confere alertas e manda o resumo do dia. | `CRON_SECRET`. A Vercel Hobby roda “dentro da hora”, por isso o aviso de atraso só aparece depois de 26 h. |
| **IA da Margot** | No painel | Mostra o gasto do mês contra o limite. | `ANTHROPIC_API_KEY`. |
| **Instagram** | Fora do painel | A Claude agenda no Metricool só os posts que você aprova. | Opcional: `INSTAGRAM_PANEL_URL` (link do painel do Instagram, para abrir direto daqui). |
| **Metricool** | Fora do painel | Publica na hora marcada. | Números no painel: ver seção 4. |
| **Gmail** | Não conectado | — | Ver seção 3. |
| **API para agentes** | Opcional | Rotas `/api/v1` (ver `docs/api.md`). | `AGENT_API_TOKEN`, só se uma ferramenta de fora for ler os dados. |
| **Fotos do site** | No painel | Upload e ordem das fotos. | Cloudinary. |

---

## 3. Gmail — três caminhos [DECISÃO PENDENTE]

[OBSERVADO] O painel não lê nem envia e-mail. Na conta do dono estão ligados os conectores Google Drive, Metricool, Vercel e Higgsfield; o registro de conectores da Claude tem um conector de **Gmail** (buscar, resumir conversas, rascunhar respostas), ainda não instalado.

**A. Conector Gmail na Claude (fora do painel).**
O dono instala o conector em claude.ai (Configurações → Conectores) e autoriza na própria conta Google. Depois pede à Claude “resume os e-mails de hoje” ou “rascunha a resposta para a fulana”. Sem código, sem Google Cloud, sem manutenção. O limite: só funciona quando ele conversa com a Claude (ou numa tarefa agendada), e o **Hoje** não enxerga e-mail.

**B. O painel lê o Gmail (API do Gmail com login Google).**
Os e-mails aparecem no **Hoje** e em **Conversas** como as mensagens do WhatsApp, e a Margot pode sugerir resposta com **Confirmar**. Exige projeto no Google Cloud, tela de consentimento, autorização do dono (uma vez), uma tabela nova para guardar o token (mudança de schema aditiva) e uma rotina que busque e-mails novos.
- [FATO] Com a tela de consentimento em modo *Testing*, o refresh token expira em 7 dias; em *Em produção* ele em geral não expira (salvo revogação ou ~6 meses sem uso). Fonte: documentação do Google (“Set up Google Cloud and OAuth”).
- [FATO] `gmail.readonly` e `gmail.modify` são escopos restritos (exigem verificação com avaliação de segurança anual para apps públicos); `gmail.send` é sensível. Fonte: Unipile, “Gmail API Scopes Explained”.
- [NÃO VERIFICADO] Se um app “Em produção” sem verificação funciona só para a conta do próprio dono (com o aviso de “app não verificado”).
- [NÃO VERIFICADO] Na Vercel Hobby a rotina roda no máximo uma vez por dia; buscar e-mail com mais frequência pede o plano Pro ou um aviso por Pub/Sub (mais complexo).

**C. Encaminhamento só do que importa.**
Um filtro no Gmail encaminha apenas os e-mails de pedido (formulário, cerimonialistas) para um endereço de entrada que o painel lê. Não pede acesso à caixa inteira, mas precisa de um serviço de e-mail de entrada, só vê o que for encaminhado e a resposta continua sendo no Gmail. [NÃO VERIFICADO] qual serviço e quanto custaria.

**[RECOMENDAÇÃO]** Começar pela **A** (uns 5 minutos, sem custo, o dono autoriza sozinho). Só construir a **B** se o volume de e-mails justificar.

---

## 4. Instagram e Metricool

Hoje a Claude agenda os posts no Metricool (só os aprovados) e o calendário com a aprovação ficam num painel à parte. O que falta é **ver os números aqui** (alcance, curtidas, cliques, melhor horário) e, se fizer sentido, **aprovar post pela fila do Hoje**.

**4a. O painel chama a API do Metricool.**
[FATO] A API só existe nos planos **Advanced** e **Custom**; Free e Starter não têm. O token sai de Conta → API e cada chamada leva o token no cabeçalho `X-Mc-Auth`, mais `userId` e `blogId`. Fonte: Metricool Help, “Basic Guide for API Integration”. Seriam três variáveis novas na Vercel. [NÃO VERIFICADO] o plano do dono.

**4b. A Claude coleta pelo conector e entrega ao painel.**
O conector do Metricool já está ligado. Uma tarefa agendada da Claude buscaria os números e gravaria um resumo no painel pela API `/api/v1` (`AGENT_API_TOKEN`). Não exige plano com API nem token do Metricool na Vercel, mas depende de a tarefa agendada rodar e de uma rota nova para receber o resumo. [HIPÓTESE]

**[RECOMENDAÇÃO]** 4a se o plano tiver API; senão 4b.

---

## 5. Ordem sugerida

1. Revisar o PR do painel e testar no celular (roteiro na descrição do PR).
2. Decidir o caminho do Gmail (3).
3. Decidir como trazer os números do Instagram (4).
4. Opcional: cadastrar `INSTAGRAM_PANEL_URL` na Vercel.
5. Só se for a B do Gmail: planejar a tabela nova (aditiva) antes de qualquer deploy.

## 6. Cuidados

- Nenhuma senha passa pelo painel; as autorizações (Google, Meta, Metricool) são feitas pelo dono nas próprias contas.
- A tela Conexões mostra só os **nomes** das variáveis que faltam, nunca os valores.
- O repositório é público: links privados, ids de conta e dados pessoais ficam em variáveis de ambiente, nunca no código.
