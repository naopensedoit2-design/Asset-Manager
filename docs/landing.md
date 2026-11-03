# Página inicial (`/`)

Uma página só, montada no servidor, com seis blocos: Topo, Fotos, Serviços e valores, Como funciona, Perguntas e Final (mais o rodapé). O calendário de datas reservadas só aparece se estiver ligado no painel e houver ao menos uma data reservada.

## Onde fica cada coisa

| O quê | Onde |
|---|---|
| Todo o texto público, o nome do botão e a ação principal (`ACAO_PRINCIPAL`) | `artifacts/casei-de-lafer/src/lib/landing/conteudo.ts` |
| O que vem do banco (foto do topo, galeria, valores, regras, datas reservadas, chat disponível) | `src/lib/landing/dados.ts` |
| Para onde cada botão aponta e qual canal é o principal | `src/lib/landing/links.ts` |
| Otimização das fotos do Cloudinary (com volta para a original se falhar) | `src/lib/landing/imagem.ts` |
| Blocos da página | `src/components/landing/*` e `app/page.tsx` |

Valores, sinal, saldo e validade do orçamento vêm do painel (Regras). Nada disso é digitado no código; sem banco, a página abre sem preços.

## Botões

O botão grande tem um nome só ("Ver se minha data está livre") e aparece no topo, em Serviços e valores e no final. Ele leva ao chat da Margot (`/conversar`); ao lado, em texto, vai a opção do WhatsApp (`/whatsapp`). Para inverter (WhatsApp como principal), troque `ACAO_PRINCIPAL` em `conteudo.ts`.

- Os dois caminhos são rotas do próprio site: funcionam antes do JavaScript carregar e o número do WhatsApp fica só no servidor.
- Chat desligado no painel, sem chave da API ou acima do limite do mês: o WhatsApp vira o botão principal. Sem número de WhatsApp: só o chat. Sem nenhum dos dois: aviso no lugar do botão.
- A página nunca promete a data antes do sinal: o texto público diz "garantida", não "bloqueada".

## Contagem de toques

Cada toque nos botões é contado por botão (`topo`, `valores`, `final`, `rodape`) e por campanha (`utm_campaign` do endereço de onde a pessoa veio; sem ela, `sem-origem` ou `sem-campanha`). Sem cookie, sem IP.

- Fica na tabela `Setting`, uma linha por dia, canal, botão e campanha: `clique:aaaa-mm-dd:chat|whatsapp:botão:campanha`, com o total no valor. O dia é o de São Paulo.
- Só grava em produção (`VERCEL_ENV=production`): as prévias da Vercel usam o banco de produção e não podem sujar o número. Só conta GET (o HEAD de verificadores de link não entra).
- No máximo 300 linhas por dia; passou disso, campanhas novas viram `outra`.
- Para ler: `select key, value from "Setting" where key like 'clique:%' order by key desc;`
- Conversas que cada botão trouxe: o `/conversar` repassa `?b=botão&c=campanha` ao chat e o chat guarda isso no começo do código da conversa (`topo.nome-da-campanha.<uuid>`, regra em `src/lib/landing/origem.ts`; campanha cortada em 18 caracteres; sem campanha, `sem-campanha`). Só aparecem conversas que chamaram a IA (o que fica em `AiUsage`). Para contar:
  `select split_part("conversationId", '.', 1) as botao, split_part("conversationId", '.', 2) as campanha, count(distinct "conversationId") as conversas from "AiUsage" where channel = 'site' and split_part("conversationId", '.', 1) in ('topo','valores','final','rodape','outro') group by 1, 2 order by 3 desc;`
- `/whatsapp` e `/conversar` estão fora da busca (`public/robots.txt`).

## Atualização da página

A página fica guardada por 60 segundos (`revalidate = 60`). Mudar foto do topo, galeria, configuração ou datas reservadas no painel a refaz na hora; valores e regras (Regras) chegam em até 1 minuto.

## Testes

`pnpm --filter @workspace/casei-de-lafer run test` cobre os textos (regras do painel nos passos e perguntas, nada de "bloqueada" nem de promessa sem comprovação), os links, a escolha do canal, a contagem e a otimização das fotos.
