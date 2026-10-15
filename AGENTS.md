# AGENTS.md — Eu Casei de Lafer

Contexto permanente para qualquer agente de código (Claude, Codex, etc.) que trabalhe neste repositório. Leia inteiro antes de qualquer tarefa.

## O negócio

"Eu Casei de Lafer" aluga um MP Lafer 1980 conversível (base mecânica VW Fusca 1600) como carro de noiva para casamentos na Serra Gaúcha (RS, Brasil). Empresa de uma pessoa só: o dono, Leonardo, atende, vende, dirige e administra. O objetivo deste sistema é automatizar ao máximo atendimento, orçamento, agenda, cobrança e confirmações, para que ele só precise intervir em exceções e no dia do evento.

Uma data só comporta um evento (existe um único carro).

### Serviços e preços atuais (editáveis em /admin → Regras)
| Serviço | Preço |
|---|---|
| Carro da Noiva | R$ 2.600,00 |
| Adicional "Saída dos Noivos" (carro permanece após a chegada da noiva para um segundo deslocamento no mesmo local) | + R$ 500,00 |

### Regras comerciais (editáveis em /admin → Regras)
- Sinal de **40%** via Pix para reservar a data; a data só é bloqueada no calendário público depois que o sinal é pago.
- Saldo de 60% até 1 dia antes do evento.
- Reserva provisória sem sinal expira em 48h (padrão).
- Cancelamento: sinal não reembolsável (reserva de data). Ensaios: chuva forte permite remarcar sem custo em até 60 dias.
- Ensaio Pré-Wedding: R$ 1.900, até 3h em um ponto de ensaio; o motorista a rigor é do dia do casamento.
- Raio de atendimento: Serra Gaúcha; fora dela, deslocamento avaliado caso a caso.

### Jornada do cliente
Instagram ou indicação (fotógrafos, cerimonialistas como Celebre Gramado) → landing page → WhatsApp → data, local e serviço → checagem de agenda → orçamento em PDF → aprovação → Termo Simplificado → Pix do sinal → data bloqueada → confirmações → evento → saldo e pós-venda.

## Stack real

- Monorepo pnpm. O site é o pacote `artifacts/casei-de-lafer` — **Next.js 15 (App Router)**, React 19, Tailwind 4.
- Banco: PostgreSQL no **Neon**, via **Prisma 7** com `@prisma/adapter-pg` (sem engine binária em runtime). Schema em `artifacts/casei-de-lafer/prisma/schema.prisma`.
- Imagens no Cloudinary. Hospedagem na Vercel (deploy automático do `main`).
- Os pacotes `lib/*` (Drizzle, Orval) e `artifacts/mockup-sandbox` são restos do template do Replit e **não são usados pelo site**.
- Admin: `/admin` protegido por `middleware.ts` (cookie `admin-session`). Rotas de API do admin ficam em `/api/admin/*`.
- Módulo de gestão (Fase 1): regras puras em `src/lib/gestor/rules.ts` (com testes), acesso ao banco em `src/lib/gestor/service.ts`, telas em `src/components/gestor`, `app/admin/dashboard`, `app/admin/pedidos` e `app/admin/regras`.
- Financeiro: regras puras em `src/lib/gestor/finance.ts` (com testes), banco em `src/lib/gestor/finance-service.ts`, tela em `app/admin/financeiro`. Entradas vêm dos pagamentos recebidos; despesas no modelo `Expense` (caixa = data do pagamento; custo do carro = data do gasto).
- Google Agenda: `src/lib/google/calendar.ts` (conta de serviço, JWT assinado com `node:crypto`, sem SDK). Dias ocupados na agenda bloqueiam a data só por dentro, para o painel e a Margot (`getCalendarFacts`); **a agenda pessoal nunca é exposta a clientes** (o `/api/dates` público mostra só as reservas do negócio); pedido confirmado vira evento (`syncOrderCalendar`), cancelado sai da agenda. Regra pura em `src/lib/google/busy-days.ts`.
- Documentos: proposta em `/p/<código>` e Termo Simplificado em `/t/<código>` (`src/lib/documents/*`), HTML pronto para imprimir/salvar em PDF. O código é `Order.publicToken`. Dados do contratado (CPF, Pix) ficam em Regras, **nunca no código: o repositório é público**.
- Custo da Margot: cada chamada grava `AiUsage`; preços em `src/lib/margot/pricing.ts`; limite mensal em Regras (0 desliga).
- Margot no site: chat em `/orcamento/detalhado` → `POST /api/margot` → `src/lib/margot/agent.ts` (API do Claude via fetch, ferramentas que usam `src/lib/gestor/service.ts`). Instruções dela em `src/lib/margot/prompt.ts`; preços e regras vêm do banco, nunca do prompt.
- API para agentes externos (Margot via n8n): `/api/v1/*`, autenticada por `Authorization: Bearer <AGENT_API_TOKEN>`. Documentação em `docs/api.md`.

## Regras de trabalho

- **Inspecione antes de mudar.** Adapte-se ao que existe; não reescreva o projeto.
- **Não quebre o site público.** Landing, links de WhatsApp, galeria, calendário público e admin atual devem continuar funcionando.
- **Banco de dados é produção.** O build roda `prisma db push` **sem** `--accept-data-loss`: mudanças que apagariam dados fazem o deploy falhar, de propósito. Nunca reintroduza essa flag, nunca rode `migrate reset`. Mudanças de schema só aditivas (novos modelos/campos opcionais ou com default). Renomear ou remover campo exige plano explícito aprovado pelo dono.
- **Segredos só em variáveis de ambiente.** Documente toda variável nova em `.env.example`.
- **Interface em português do Brasil.** Dinheiro em centavos (inteiro) no banco, exibido com `Intl.NumberFormat('pt-BR')`; datas `dd/mm/aaaa`; fuso `America/Sao_Paulo`.
- **Mobile first.** O painel é usado principalmente pelo celular.
- **Identidade visual:** a do site — fundo quase preto, dourado `#C9A84C`, Playfair Display nos títulos e Inter no texto (tokens em `app/globals.css`).
- **Teste regra de negócio:** `pnpm --filter @workspace/casei-de-lafer run test`.
- **Commits pequenos**, mensagens em português.
- **Ao terminar**, entregue: o que foi feito, arquivos alterados, mudanças de schema, variáveis novas, como testar, o que ficou pendente.
