# API de gestão — Eu Casei de Lafer

API usada pelos agentes externos (a Margot, rodando no n8n) para atender clientes sem passar pelo painel. Tudo o que ela faz aparece no painel `/admin` e no histórico de cada pedido, com o autor "Margot".

- Base: `https://eucaseidelafer.vercel.app/api/v1`
- Autenticação: header `Authorization: Bearer <AGENT_API_TOKEN>` em todas as rotas.
- Formato: JSON. Sucesso → `{ "ok": true, "data": ... }`. Erro → `{ "ok": false, "erro": { "codigo": "...", "mensagem": "..." } }`.
- Datas: `AAAA-MM-DD`. Dinheiro: centavos (inteiro). `260000` = R$ 2.600,00.

## Fluxo típico da Margot

1. Cliente pergunta por uma data → `GET /disponibilidade?data=2026-12-05`
2. Data livre → `POST /pedidos` com nome, WhatsApp, data, local e serviços
3. `POST /pedidos/{id}/orcamento` → recebe total e sinal para mandar ao cliente
4. Cliente aceita → `POST /pedidos/{id}/reserva` (reserva provisória por 48h; sinal e saldo são criados)
5. O Leonardo marca o sinal como recebido no painel → pedido confirmado e data bloqueada no site
6. `GET /alertas` periodicamente → avisa o Leonardo no WhatsApp pessoal sobre o que for urgente

## Rotas

### `GET /disponibilidade?data=AAAA-MM-DD`
```json
{ "ok": true, "data": { "data": "2026-12-05", "status": "livre", "livre": true, "passado": false } }
```
`status`: `livre`, `provisoria` (outro pedido reservou e ainda não pagou o sinal) ou `ocupada`.

### `GET /disponibilidade/mes?ano=2026&mes=12`
Lista todos os dias do mês com `data`, `status` e `orderId` (quando ocupado por um pedido).

### `GET /servicos`
Serviços ativos e preços atuais.
```json
{ "ok": true, "data": [
  { "id": 1, "name": "Carro da Noiva", "priceCents": 260000, "isAddon": false, "active": true, "description": "…", "sortOrder": 1 },
  { "id": 2, "name": "Saída dos Noivos", "priceCents": 50000, "isAddon": true, "active": true, "description": "…", "sortOrder": 2 }
] }
```

### `GET /regras`
Políticas comerciais para a Margot responder dúvidas.
```json
{ "ok": true, "data": { "depositPercent": 50, "balanceDaysBefore": 7, "provisionalHours": 48, "followUpDays": 3, "cancellationPolicy": "", "serviceArea": "" } }
```
Campos de texto vazios significam "ainda não definido" — a Margot deve encaminhar a pergunta ao Leonardo.

### `POST /pedidos`
Cria o pedido. Se o WhatsApp já existe, reaproveita o cliente.
```json
{
  "client": { "name": "Ana Souza", "phone": "(54) 99999-1111", "source": "instagram", "referredBy": "" },
  "eventDate": "2026-12-05",
  "eventTime": "16:30",
  "venue": "Villa Bella",
  "city": "Gramado",
  "serviceIds": [1, 2],
  "notes": "Quer o carro com laço branco"
}
```
`source`: `instagram`, `indicacao`, `site`, `cerimonialista` ou `outro`. Resposta: `{ order, disponibilidade }`, com `order` no formato descrito abaixo.

### `GET /pedidos?telefone=5554999991111` · `GET /pedidos?status=novo,orcamento_enviado`
Busca pedidos por telefone/nome (`telefone` ou `q`) e/ou por status.

### `GET /pedidos/{id}`
Pedido completo:
```json
{
  "id": 1, "status": "reservado", "statusLabel": "Data reservada",
  "proximosStatus": ["confirmado", "aguardando_resposta", "perdido", "cancelado"],
  "eventDate": "2026-12-05", "eventTime": "16:30", "venue": "Villa Bella", "city": "Gramado",
  "client": { "id": 1, "name": "Ana Souza", "phone": "5554999991111", "email": "", "source": "instagram" },
  "reserva": { "id": 1, "date": "2026-12-05", "kind": "provisoria", "expiresAt": "2026-10-16T06:37:09.249Z" },
  "quotes": [{ "id": 1, "items": [{ "serviceId": 1, "name": "Carro da Noiva", "priceCents": 260000 }], "totalCents": 310000, "depositCents": 155000 }],
  "payments": [
    { "id": 1, "kind": "sinal", "amountCents": 155000, "dueDate": "2026-10-16", "status": "a_receber" },
    { "id": 2, "kind": "saldo", "amountCents": 155000, "dueDate": "2026-11-28", "status": "a_receber" }
  ],
  "history": [{ "fromStatus": "orcamento_enviado", "toStatus": "reservado", "actor": "margot", "createdAt": "…" }]
}
```

### `PATCH /pedidos/{id}`
Atualiza dados e, opcionalmente, o status. Todos os campos são opcionais.
```json
{ "venue": "Igreja Matriz", "eventTime": "17:00", "client": { "email": "ana@exemplo.com" }, "status": "aguardando_resposta", "note": "Cliente vai conversar com o noivo" }
```
A data não pode ser trocada enquanto o pedido tem reserva ativa (`409 data_reservada`).

### `POST /pedidos/{id}/orcamento`
Registra o orçamento enviado e calcula total e sinal com os preços e a política atuais. Corpo opcional:
```json
{ "serviceIds": [1, 2], "discountCents": 0, "validDays": 7, "pdfUrl": "https://…" }
```
Sem `serviceIds`, usa os serviços do pedido. Pedido `novo` passa para `orcamento_enviado`.
```json
{ "ok": true, "data": { "order": { … }, "totais": { "subtotalCents": 310000, "discountCents": 0, "totalCents": 310000, "depositCents": 155000, "balanceCents": 155000 } } }
```

### `POST /pedidos/{id}/reserva`
Reserva provisória da data do pedido, válida pelo prazo de `provisionalHours`. Cria as cobranças de sinal e saldo a partir do último orçamento. Falha com `409 data_ocupada` se outro pedido já tiver a data — o banco garante uma única reserva ativa por dia, mesmo com pedidos simultâneos.

### `GET /alertas`
Lista o que precisa de atenção, urgentes primeiro:
```json
{ "ok": true, "data": [
  { "type": "data_em_conflito", "severity": "urgente", "title": "Bia pediu uma data ocupada", "detail": "05/12/2026 já está em reserva provisória.", "orderId": 2 },
  { "type": "pagamento_vencendo", "severity": "atencao", "title": "Sinal de Ana Souza vence em 2 dias", "detail": "R$ 1.550,00 até 16/10/2026.", "orderId": 1 }
] }
```
Tipos: `data_em_conflito`, `reserva_expirando`, `pagamento_atrasado`, `pagamento_vencendo`, `orcamento_sem_resposta`, `pedido_novo`, `evento_proximo`.

## Funil de status

```
novo → orcamento_enviado → aguardando_resposta → reservado → confirmado → realizado
                                     ↘ perdido / cancelado (reabrir volta para novo)
```
- `reservado`: reserva provisória criada (precisa de data livre).
- `confirmado`: sinal pago; a data aparece como ocupada no calendário público do site. Acontece sozinho quando o sinal é marcado como recebido.
- `perdido` / `cancelado`: libera a data e cancela cobranças pendentes.

## Erros comuns

| HTTP | código | quando |
|---|---|---|
| 401 | `nao_autorizado` | token ausente ou errado |
| 503 | `api_desativada` | `AGENT_API_TOKEN` não configurado na Vercel |
| 400 | `data_invalida`, `telefone_invalido`, `nome_obrigatorio` | dados de entrada |
| 404 | `pedido_nao_encontrado` | id inexistente |
| 409 | `data_ocupada`, `transicao_invalida`, `data_reservada`, `sem_data` | regra do negócio |
| 422 | `desconto_invalido`, `orcamento_vazio` | cálculo do orçamento |

## Rotina diária

`GET /api/cron/diario` (Vercel Cron, todo dia às 07:00 de Brasília, com `Authorization: Bearer <CRON_SECRET>`): libera reservas provisórias vencidas sem sinal e marca pagamentos vencidos como atrasados.
