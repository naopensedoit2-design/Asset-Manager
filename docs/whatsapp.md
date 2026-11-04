# Margot no WhatsApp — guia de configuração

A Margot atende clientes pelo **número próprio dela** (+55 51 99384-3386), usando a API oficial do WhatsApp (Cloud API da Meta). Quando **o seu** número escreve para ela, ela vira sua **secretária**. Tudo fica registrado no painel, em **Conversas**.

Nada disso exige VPS nem computador ligado: roda no próprio site, na Vercel.

---

## Como vai funcionar no dia a dia

**Para o cliente**
- Escreve para o número da Margot (pelo site, Instagram ou indicação).
- A Margot se apresenta como assistente virtual, confere a data, monta o orçamento e manda o link da proposta.
- Para fechar, pede nome completo, CPF e endereço, segura a data por 48h e manda o link do termo e a chave Pix.
- O cliente manda o comprovante. A Margot agradece e diz que a equipe confere.
- Áudios dos clientes são transcritos automaticamente (se a chave de voz estiver configurada).

**Para você (Leonardo)**
- Recebe no seu WhatsApp pessoal um aviso a cada novidade: pedido novo (do WhatsApp ou do chat do site), cliente querendo fechar, comprovante (com a imagem e os botões **✅ Confirmar** / **Cancelar**), cliente pedindo para falar com você.
- Tocou em **Confirmar** no comprovante: o sinal é marcado como recebido, a data fica confirmada e bloqueada no site, vai para a Google Agenda e o cliente recebe a confirmação. Tudo com um toque.
- Converse com a Margot como secretária, por texto ou áudio:
  - "me manda o resumo do dia"
  - "como está a agenda de dezembro?"
  - "a data 12/06/2027 está livre?"
  - "quanto entrou esse mês?"
  - "lança 150 de gasolina" (ou mande a foto da nota)
  - "o sinal do pedido 14 caiu"
  - "cria o pedido do casamento de 05/12, WhatsApp 51 99999-0000, total 2.400" (ela lê a Google Agenda para trazer nome, data, hora e local; se o dia tiver "casamento" e "entrega de noiva", pergunta qual é a data)
  - "o valor do pedido 3 é 2.545" ou "dá 55 de desconto no 3" (só antes de lançar o sinal)
  - colar nome completo, CPF, endereço e e-mail da cliente: ela guarda para o Termo (RG, profissão e estado civil não são guardados)
  - "registra o evento de 22/01/2026, já feito, Pix de 400" (evento antigo: entra como realizado, com o pagamento na data certa)
  - "registra 1.018 de sinal no pedido 3, entrou ontem" / "muda o horário do 2 para 16h" / "marca o 2 como realizado"
  - mandar a foto ou o PDF do comprovante e dizer "deu baixa no sinal do 3": o comprovante fica anotado no pedido
  - "manda para a Ana que o motorista chega 15h antes"
  - "pausa a Margot com a Ana" / "pode voltar a atender a Ana"
  - **"pausar Margot" / "retomar Margot"**: interruptor geral. Pausada, ela não responde mais nenhum cliente (WhatsApp e chat do site); o que chegar aparece em Conversas e avisa você. Vale na hora e funciona mesmo sem IA (sem chave ou com o limite do mês estourado). O mesmo liga/desliga está em Regras ("Margot responde clientes no WhatsApp" e "Margot responde no chat do site")
- **Dinheiro e mensagens para clientes nunca acontecem sem o seu OK**: a Margot prepara e manda um botão de confirmação. Um "sim" escrito também vale, mas só para a última confirmação que ela mandou (até 30 minutos).
- Depois de cada resposta, aparece o botão **🔊 Ouvir em áudio**. Se preferir, diga "sempre em áudio" ou "só texto".
- Todo dia às 7h, se houver algo para ver (evento perto, pagamento vencendo, conversa esperando), chega um resumo.

**No painel (Conversas)**
- Todas as conversas da Margot, com fotos, áudios e documentos.
- **Ordem da lista:** a sua conversa com a Margot é sempre a primeira. Depois vêm as que você **fixou** (alfinete na linha) e, abaixo, as outras, em ordem automática: pedido esperando resposta, esperando resposta, pedido em andamento, o resto por data e, por último, as que só têm aviso do WhatsApp sem conteúdo (enquete, "ver uma vez", chamada).
  - Para mudar a ordem das fixadas, segure o ícone ≡ da linha e arraste. O alfinete de novo solta a conversa de volta para a ordem automática.
  - O sino cortado na linha ignora a conversa com um toque; aparece "Desfazer" por alguns segundos.
  - Cores: dourado = pedido em andamento, azul = esperando resposta, âmbar = Margot pausada, cinza = só aviso do WhatsApp. "Esperando resposta" e a fila de Hoje não contam o aviso sem conteúdo.
- Você pode responder por ali: a mensagem sai pelo número da Margot, assinada por você, e a Margot fica 24h sem responder naquela conversa (você assumiu). Dá para pausar ou retomar quando quiser.
- **Ignorar** (corrente, lista de transmissão, número que já foi de outra pessoa): dentro da conversa, toque nos três pontinhos → **Ignorar conversa**. A Margot deixa de responder, você não é avisado e nada conta como não lido. A conversa fica guardada na aba **Ignoradas** e volta com **Reativar conversa**. Se você responder uma conversa ignorada, ela sai de Ignoradas.
  - Sozinho, só o **primeiro contato de um número novo** cai em Ignoradas, e só quando parece mensagem em massa: **encaminhada**, só **figurinha**, **vídeo**, **contato** ou **localização** (sem falar de casamento, carro ou valor). Quem começa com texto, foto, áudio ou documento é atendido normalmente. Se uma conversa ignorada sozinha receber, depois, uma mensagem sua sobre casamento, carro ou valor (e não encaminhada), ela volta sozinha. O que você ignora à mão só volta quando você reativa.
  - **Bloquear no WhatsApp** (nos mesmos três pontinhos, pede confirmação) impede a pessoa de escrever para o número da Margot. A Meta só deixa bloquear quem escreveu nas últimas 24 horas. Para desfazer: **Desbloquear**.
  - As conversas que já existiam antes desta função não são ignoradas sozinhas: toque em **Ignorar conversa** em cada uma.
- Dica: no iPhone, abra o painel no Safari → Compartilhar → **Adicionar à Tela de Início**. Fica como um app.

### Um celular só: como organizar
- **Seu número pessoal** continua no WhatsApp Business do iPhone, como hoje.
- **O eSIM da Margot** só precisa receber o SMS de confirmação uma vez. **Não instale o WhatsApp nesse número**: um número na API oficial não pode estar no aplicativo ao mesmo tempo. Se já instalou, apague a conta no app antes (Configurações → Conta → Apagar conta) e espere alguns minutos.
- Salve o número da Margot nos seus contatos como "Margot". A conversa com ela é a sua secretária.

---

## Custos

| Item | Quanto |
|---|---|
| WhatsApp (Meta), mensagens de atendimento | 1.000 por mês grátis por número; depois, cerca de US$ 0,0068 cada (≈ R$ 0,04) |
| WhatsApp, aviso modelo para você (quando a conversa com a Margot está fechada há mais de 24h) | ≈ R$ 0,04 cada; a Margot espera 30 min antes de mandar outro |
| Margot (IA) | entra no mesmo limite mensal de Regras (padrão US$ 10). O cache corta boa parte do custo |
| Áudio (opcional, OpenAI) | ouvir: ~US$ 0,003 por minuto; falar: ~US$ 0,015 por minuto |

Desde 1º de outubro de 2026 a Meta cobra mensagens de atendimento acima de 1.000 por mês e exige cartão cadastrado.

Conversa **ignorada** não custa nada do que a Margot gasta: ela não responde, não consulta a IA e não manda aviso para você. Só a Meta sabe o que cobra por uma mensagem que **chega**; confira na fatura se o número recebe muito lixo e, se receber, bloqueie.

---

## Passo a passo (uma vez só)

Reserve uns 40 minutos. Faça pelo computador.

### Parte 1 — Criar o app na Meta
1. Entre em **developers.facebook.com** com o seu Facebook e conclua o cadastro de desenvolvedor (é aqui que o SMS deu limite; tente de novo no dia seguinte).
2. **Meus apps** → **Criar app**.
3. Nome: `Margot - Eu Casei de Lafer`. Caso de uso: **Conectar-se com clientes pelo WhatsApp** → Avançar.
4. Portfólio empresarial: escolha (ou crie) **Eu Casei de Lafer** → **Criar app**.
5. No painel do app: **Casos de uso → Personalizar → Configuração da API** (às vezes aparece como **WhatsApp → Configuração da API**).
6. Anote o **ID da conta do WhatsApp Business** (aparece no topo dessa página).

### Parte 2 — Colocar o número da Margot
1. Ainda em **Configuração da API**, role até **Adicionar número de telefone**.
2. Perfil: nome de exibição **Eu Casei de Lafer**, categoria **Planejamento de eventos** (ou a mais próxima), descrição curta.
3. Número: **+55 51 99384-3386** → verificação por **SMS** → digite o código que chegar no eSIM.
4. Selecione o número novo no campo **De** e anote o **ID do número de telefone** (é um número comprido, **não** é o telefone).

> O nome de exibição passa por análise da Meta (1 a 2 dias). Enquanto isso o número já funciona; o cliente vê o número em vez do nome.

### Parte 3 — Token permanente (para não expirar)
1. Entre em **business.facebook.com/settings** → **Usuários → Usuários do sistema** → **Adicionar**.
2. Nome `margot-sistema`, função **Admin** → Criar.
3. Com ele selecionado: **Atribuir ativos** →
   - **Apps**: o app da Margot, **Controle total**.
   - **Contas do WhatsApp**: Eu Casei de Lafer, **Controle total**.
4. **Gerar novo token** → escolha o app → validade **Nunca** → marque `whatsapp_business_messaging`, `whatsapp_business_management` e `business_management` → Gerar.
5. **Copie o token na hora** (ele só aparece uma vez).

### Parte 4 — Chave secreta do app
1. developers.facebook.com → seu app → **Configurações do app → Básico**.
2. **Chave secreta do aplicativo** → Mostrar → copie.
3. Nessa mesma tela, em **URL da Política de Privacidade**, cole `https://eucaseidelafer.vercel.app/privacidade` e salve (a página já existe no site).

### Parte 5 — Variáveis na Vercel
Vercel → projeto → **Settings → Environment Variables** → adicione (todas em Production, Preview e Development):

| Nome | Valor |
|---|---|
| `WHATSAPP_TOKEN` | o token da Parte 3 |
| `WHATSAPP_PHONE_NUMBER_ID` | o **ID do número de telefone** da Parte 2 |
| `WHATSAPP_APP_SECRET` | a chave secreta da Parte 4 |
| `WHATSAPP_VERIFY_TOKEN` | invente uma senha sem espaços, ex.: `margot-lafer-serra-2026` |
| `WHATSAPP_WABA_ID` | o **ID da conta do WhatsApp Business** da Parte 1 |
| `VOICE_API_KEY` | opcional: chave da OpenAI (platform.openai.com → API keys) para áudio |
| `VOICE_FALLBACK_API_KEY` | opcional: chave da Groq (console.groq.com/keys), a reserva para **ouvir** os áudios quando a OpenAI falhar ou o crédito acabar. A Groq não fala: a voz falada continua só na OpenAI |

Depois: **Deployments** → último deploy → ⋯ → **Redeploy**.

### Parte 6 — Ligar o webhook (por onde as mensagens chegam)
1. developers.facebook.com → app → **WhatsApp → Configuração**.
2. Em **Webhook**, clique em **Editar**:
   - URL de callback: `https://eucaseidelafer.vercel.app/api/whatsapp/webhook`
   - Token de verificação: exatamente o valor de `WHATSAPP_VERIFY_TOKEN`
   - **Verificar e salvar**.
3. Em **Campos do webhook** → **Gerenciar** → **messages** → **Assinar**.

### Parte 7 — Terminar pelo painel
Abra **/admin → Regras**:
1. Em **WhatsApp da Margot** (no fim da página), preencha **Seu WhatsApp pessoal** com o seu número, com DDD (só números) → **Salvar regras**.
2. No cartão **WhatsApp da Margot** (no topo), abra **Registrar o número na API**, escolha um PIN de 6 números e toque em **Registrar**. **Guarde esse PIN**: ele vira a confirmação em duas etapas do número. (A Meta só aceita 10 tentativas a cada 3 dias.)
3. Toque em **Assinar webhooks**.
4. Toque em **Mandar teste para mim**.

### Parte 8 — Modelo de aviso (para a Margot te chamar depois de 24h)
O WhatsApp só deixa a empresa mandar mensagem livre até 24h depois da sua última mensagem para ela. Fora disso, a Margot usa um modelo aprovado e guarda o aviso completo para quando você responder.

1. **business.facebook.com/wa/manage** → **Modelos de mensagem** → **Criar modelo**.
2. Categoria **Utilidade**. Nome `aviso_margot`. Idioma **Português (BR)**.
3. Corpo (copie exatamente):
   ```
   Olá, Leonardo! Aviso da Margot: {{1}}. Responda esta mensagem para ver os detalhes.
   ```
4. Exemplo para `{{1}}`: `novo pedido de Ana e Pedro para 05/12/2026, total R$ 3.100,00` → **Enviar**. A aprovação costuma sair em minutos.

### Parte 9 — Pagamento e publicação
1. No Gerenciador do WhatsApp → **Configurações de pagamento** → adicione um cartão (para os avisos modelo e o que passar de 1.000 mensagens no mês).
2. developers.facebook.com → app → no topo, mude **Modo do app** de *Desenvolvimento* para **Ao vivo** (pede a política de privacidade da Parte 4). Em modo de desenvolvimento a Meta pode deixar de mandar parte dos webhooks.

### Parte 10 — Testar e virar a chave
1. Do seu WhatsApp, mande "oi" para a Margot → ela responde como secretária (precisa da `ANTHROPIC_API_KEY`; sem ela, avisa que está sem IA).
2. Peça para alguém de confiança escrever como cliente ("Olá, quero o carro para 05/12") e acompanhe em **Conversas**.
3. Tudo certo? **/admin → Site → WhatsApp**: troque o número do site para `5551993843386`. A partir daí todos os botões do site, a bio do Instagram (troque lá também) e o chat do site levam para a Margot.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| A Meta diz que não conseguiu validar a URL do webhook | Confira o `WHATSAPP_VERIFY_TOKEN` (igual nos dois lugares) e se fez o **Redeploy** depois de criar as variáveis. |
| Mensagens chegam no celular mas não aparecem em Conversas | Toque em **Assinar webhooks** (Regras) e confira se o campo **messages** está assinado (Parte 6). Coloque o app em **Ao vivo**. |
| Nos logs da Vercel: "Assinatura inválida" | `WHATSAPP_APP_SECRET` errado. Copie de novo (Parte 4) e faça Redeploy. |
| Erro 133010 | Número não registrado: Parte 7, item 2. |
| Erro 190 | Token expirado ou sem permissão: gere o token do usuário do sistema (Parte 3) com validade "Nunca". |
| Erro 131042 | Falta o cartão na conta do WhatsApp (Parte 9). |
| Avisos só chegam quando você escreve para a Margot | O modelo `aviso_margot` ainda não foi aprovado, ou o nome está diferente. |
| A Margot respondeu algo que não devia | Pause a conversa (botão em Conversas) e responda você. Se for grave ou parecer repetir, mande **pausar Margot** no seu WhatsApp (corta todas as conversas e o chat do site). Os ajustes de comportamento ficam em `src/lib/margot/prompt.ts`. |
| Uma foto, vídeo ou áudio mostra "indisponível" ou "Não consegui tocar" | A Meta guarda a mídia por cerca de 30 dias; depois disso o arquivo some e não há como recuperar. Antes disso, toque em **Baixar**: o arquivo é salvo no aparelho, que pode abrir com o aplicativo certo (o navegador não toca todo formato, por exemplo um vídeo enviado como documento). Vídeos grandes chegam em pedaços; se travar, confira se o aparelho está com internet. |
| Chegam mensagens de gente que nunca vai contratar (corrente, "bom dia" em lista de transmissão, número que já foi de outra pessoa) | Abra a conversa → três pontinhos → **Ignorar conversa**. Para a pessoa não conseguir mais escrever, use **Bloquear no WhatsApp** (só vale para quem escreveu nas últimas 24 horas). Veja também a aba **Ignoradas** para conferir o que a triagem separou sozinha e **Reativar** o que ela errou. |
| **Bloquear no WhatsApp** dá erro | "Só dá para bloquear quem escreveu nas últimas 24 horas": a Meta recusa quem está fora da janela; só dá para **Ignorar**. "O WhatsApp não conseguiu bloquear" (139100) ou "lista de bloqueados chegou ao limite" (139101): tente de novo; se persistir, bloqueie pelo aplicativo do WhatsApp Business, se o número ainda estiver nele, ou pelo Gerenciador do WhatsApp. |
| Chegou algo que o painel não mostra (enquete, "ver uma vez", chamada) | O WhatsApp não entrega esses tipos para o número da Margot pela API. O painel avisa que a pessoa mandou, sem o conteúdo. Peça para a pessoa reenviar como foto ou texto. |

---

## Referência técnica (para quem for mexer no código)

- Webhook: `app/api/whatsapp/webhook/route.ts`. `GET` faz a verificação da Meta; `POST` confere `X-Hub-Signature-256` (HMAC do corpo com `WHATSAPP_APP_SECRET`), grava as mensagens (sem duplicar, pelo `wamid`) e responde 200 na hora. A Margot responde em seguida com `after()`.
- Rajadas de mensagens: cada mensagem espera `WHATSAPP_DEBOUNCE_MS` (5 s) e só a execução da mais nova responde, juntando tudo. Uma trava no contato (`WaContact.lockedUntil`) impede respostas duplicadas.
- Código em `src/lib/wa/`:
  - `parse.ts`, `signature.ts`, `phone.ts`, `format.ts`, `history.ts`: puros, com testes em `wa.test.ts`.
  - `client.ts`: chamadas à Graph API (texto, modelo, botões, link, áudio, mídia, leitura, registro).
  - `store.ts`: contatos, mensagens, janela de 24h, travas.
  - `process.ts`: caminho de cada mensagem.
  - `customer.ts`: Margot com clientes.
  - `secretary.ts`: modo secretária. Acesso completo do dono, sempre com botão Confirmar: `registrar_evento_passado` (`createPastOrder`: pedido já "realizado", sem reserva nem Google Agenda, pagamentos com `paidAt` na data informada), `registrar_pagamento` (valor e data livres), `editar_pedido`, `mudar_status` (só transições permitidas), `ajustar_valor_pedido` (com sinal recebido, recalcula o saldo em aberto). Leitura para o Claude melhorar a Margot: `GET /api/interno/secretaria?dias=N` devolve a conversa do dono com CPF, RG, e-mail e CEP escondidos; só responde pelo endereço único do deploy (`VERCEL_URL`, atrás da Vercel Authentication do projeto; o domínio próprio e `projeto.vercel.app` são públicos e recebem 404) e com `LEITURA_SECRETARIA=1`. Se a proteção da Vercel for desligada, desligue também essa variável. Criar pedido (`criar_pedido`, com `casamentos_da_agenda`): regras puras em `pedido.ts` (testadas); `actions.ts` grava só depois do Confirmar, com `createOrder` (ligado ao evento da Google Agenda quando há) e orçamento sem marcar como enviado; o pedido nasce como "novo" e a data só é reservada com o sinal. Também com Confirmar: `ajustar_valor_pedido` (novo orçamento com desconto, só sem pagamento lançado), `dados_do_contrato` (nome completo, documento, endereço, e-mail do cliente; a confirmação mascara o CPF) e, em `confirmar_pagamento`, o último arquivo que o dono mandou em 2 h vira nota no pedido.
  - `actions.ts`: ações que esperam o "sim" do Leonardo.
  - `notify.ts`: avisos para o Leonardo, com modelo e fila fora da janela.
  - `voice.ts`: transcrição e voz.
  - `summary.ts`: resumo diário (chamado por `/api/cron/diario`).
  - `admin.ts`: tela Conversas.
  - `view.ts`: como cada tipo de mensagem aparece no painel (texto, foto, vídeo, áudio, figurinha, documento, localização, contato, reação, avisos). Puro, com testes em `view.test.ts`. Mensagem sem arquivo ou de tipo desconhecido vira um aviso em português, nunca um balão vazio.
  - `range.ts` e `media-cache.ts`: mídia em pedaços. A Vercel recusa resposta de função acima de 4,5 MB e o iPhone só toca vídeo e áudio se o servidor entender o cabeçalho `Range`; por isso `/api/admin/whatsapp/midia/[id]` responde 206 com pedaços de até 4 MB e guarda o arquivo baixado da Meta por 5 minutos (até 48 MB por instância) para o player pedir vários pedaços sem baixar tudo de novo. Só abre mídia que está em alguma conversa; tipos que o navegador poderia executar (HTML, SVG, script) são entregues como download, com `nosniff` e CSP restrita. `media-file.ts` monta o nome do arquivo salvo e essa CSP (nada executa, mas foto, vídeo e áudio abrem sozinhos numa aba); `?baixar=1` força o download (botão **Baixar**).
- Tela da conversa: `app/admin/conversas/[id]/page.tsx` (cabeçalho, papel de parede, caixa de resposta) e `src/components/gestor/wa-message.tsx` (balões e mídia). O visual (papel de parede, rabinho, hora e tiques dentro do balão) fica em `app/admin/whatsapp.css`; as cores são os tokens `--wa-*` de `app/admin/theme.css`, um conjunto por tema, com contraste conferido em `src/lib/admin/look.test.ts`. Dentro de uma conversa o topo e o menu inferior do painel somem no celular (`hidesTopBar`/`hidesTabBar` em `src/lib/admin/nav.ts`), como no WhatsApp.
- Ordem da lista de Conversas: `src/lib/wa/ordem.ts` (puro, com testes em `ordem.test.ts`) ordena a conversa do dono, as fixadas (`WaContact.pinOrder`, menor = mais acima; vazio = ordem automática) e o resto por prioridade. `listConversations` aplica a ordem no servidor; arrastar grava `PUT /api/admin/whatsapp/conversas/ordem { ids }`, e fixar/soltar é `PATCH { acao: "fixar" | "soltar" }`. A coluna `pinOrder` é opcional (adicionada com `prisma db push`, sem perda de dados).
- Conversas ignoradas: `triage.ts` (puro, com testes em `triage.test.ts`) decide o que fazer com cada mensagem que chega. Ignorada = `WaContact.ignoredAt` preenchido, com o motivo em `ignoredReason` (`manual`, `encaminhada`, `figurinha`, `video`, `contato`, `localizacao`). `store.ts` (`saveInbound`) guarda a mensagem já como tratada (`handledAt`) e sem somar em `unread`; por isso `ingest` não cria tarefa e nada chega à Margot, ao `markRead` nem aos avisos. `process.ts` confere de novo antes de responder (o dono pode ignorar durante a espera de 5 s). Só o **primeiro** contato de um número novo, que não é cliente do painel nem o dono, é ignorado sozinho. Ignorada sozinha volta quando a pessoa escreve, sem encaminhar, uma palavra de casamento, carro ou valor (`looksLikeLead`); ignorada à mão só volta pelo dono; o número do dono nunca é ignorado. O selo "Encaminhada" vem de `context.forwarded` e `context.frequently_forwarded` do webhook (`WaMessage.kind = "encaminhada"`). O resumo das 7h, a fila de **Hoje**, o modo secretária e o contador de não lidas pulam as ignoradas; `GET /api/admin/whatsapp/conversas?ignoradas=1` lista só elas e `GET …/nao-lidas` devolve `{ total, ignoradas }`. Ações: `PATCH …/conversas/[id]` com `{ acao: "ignorar" | "reativar" | "bloquear" | "desbloquear" }` (sem `acao`, `{ pausar }` continua pausando e retomando).
- Bloqueio no WhatsApp: `blockUsers` e `unblockUsers` (`client.ts`) chamam `POST` e `DELETE` em `<PHONE_NUMBER_ID>/block_users` com `{ messaging_product: "whatsapp", block_users: [{ user }] }`; `blockContact` e `unblockContact` (`admin.ts`) gravam `WaContact.blockedAt`. A Meta só aceita quem escreveu nas últimas 24 horas (erro 131047) e a lista tem até 64.000 números (139101). Bloquear também ignora a conversa (invariante: bloqueada ⇒ ignorada); reativar exige desbloquear antes; responder pelo painel a uma conversa bloqueada é recusado. **[NÃO VERIFICADO] contra a Meta de verdade:** o formato da chamada e da resposta (`block_users.added_users`, `failed_users[].errors[]`) veio de cópias da documentação e foi testado só contra o simulador local (`WHATSAPP_API_BASE`). Confira no primeiro bloqueio real; se a Meta responder diferente, o ajuste é só em `changeBlock` (`client.ts`).
- Números brasileiros: o WhatsApp às vezes identifica celulares sem o nono dígito. Toda comparação usa `phoneVariants` (com e sem o 9).
- Tabelas: `WaContact` e `WaMessage` (novas). `AiUsage` ganhou `cacheReadTokens` e `cacheWriteTokens`. `WaContact` ganhou `ignoredAt`, `ignoredReason` (padrão vazio) e `blockedAt`, todos opcionais ou com padrão.
- Variáveis opcionais: `WHATSAPP_OWNER_TEMPLATE` (padrão `aviso_margot`), `WHATSAPP_TEMPLATE_LANG` (`pt_BR`), `WHATSAPP_GRAPH_VERSION` (`v25.0`), `WHATSAPP_API_BASE` (só para testes), `WHATSAPP_DEBOUNCE_MS`, `VOICE_API_BASE`, `TRANSCRIBE_MODEL` (`gpt-4o-mini-transcribe`), `TTS_MODEL` (`gpt-4o-mini-tts`), `TTS_VOICE` (`coral`), `VOICE_FALLBACK_API_BASE` (`https://api.groq.com/openai/v1`) e `VOICE_FALLBACK_TRANSCRIBE_MODEL` (`whisper-large-v3-turbo`). Transcrição: `voice.ts` tenta o provedor principal e, se falhar por qualquer motivo (crédito, limite, fora do ar), a reserva; o aviso fica nos logs como "transcrição feita pela reserva". Sem a chave principal mas com a da reserva, a Margot ouve e não fala (`voiceReady` x `speechReady`).
- Política da Meta: desde janeiro de 2026 a API não aceita assistentes de IA "de uso geral". A Margot é um atendimento do próprio negócio (orçamento, reserva, cobrança), o que continua permitido; mantenha-a restrita ao assunto e sempre com a opção de falar com o Leonardo.
