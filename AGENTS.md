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
- Sinal de **50%** para reservar a data; a data só é bloqueada no calendário público depois que o sinal é pago.
- Saldo pago na semana do evento (padrão: até 7 dias antes).
- Reserva provisória sem sinal expira em 48h (padrão).
- Política de cancelamento e raio de atendimento: **ainda não definidos** pelo dono.

### Jornada do cliente
Instagram ou indicação (fotógrafos, cerimonialistas como Celebre Gramado) → landing page → WhatsApp → data, local e serviço → checagem de agenda → orçamento em PDF → aprovação → Termo Simplificado → Pix do sinal → data bloqueada → confirmações → evento → saldo e pós-venda.

## Stack real

- Monorepo pnpm. O site é o pacote `artifacts/casei-de-lafer` — **Next.js 15 (App Router)**, React 19, Tailwind 4.
- Banco: PostgreSQL no **Neon**, via **Prisma 7** com `@prisma/adapter-pg` (sem engine binária em runtime). Schema em `artifacts/casei-de-lafer/prisma/schema.prisma`.
- Imagens no Cloudinary. Hospedagem na Vercel (deploy automático do `main`).
- Os pacotes `lib/*` (Drizzle, Orval) e `artifacts/mockup-sandbox` são restos do template do Replit e **não são usados pelo site**.
- Admin: `/admin` protegido por `middleware.ts` (cookie `admin-session`). Rotas de API do admin ficam em `/api/admin/*`.
- Módulo de gestão (Fase 1): regras puras em `src/lib/gestor/rules.ts` (com testes), acesso ao banco em `src/lib/gestor/service.ts`, telas em `app/admin/(gestor)` e `app/admin/dashboard`.
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
