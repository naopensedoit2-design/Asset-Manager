// Mensagem padrão para quem escreveu no número errado (pedido do dono em 24/11/2026). Puro: testado em engano.test.ts.
//
// Sai pelo código, não pelo modelo: o texto é sempre o mesmo, aprovado, e a Margot não gasta outra chamada
// escrevendo. Depois dela a conversa fica ignorada (motivo "engano"): a Margot não responde mais nem avisa o dono.
// Se a pessoa voltar falando de casamento, noiva, ensaio, carro ou valor, a conversa volta sozinha (triage.ts).

export const ENGANO_TEXTO =
  "Olá! Acredito que esta mensagem tenha chegado ao número errado. Eu sou a Margot, assistente virtual da Eu Casei de Lafer: " +
  "levamos a noiva até a cerimônia em um carro clássico conversível, na Serra Gaúcha. " +
  "Se o seu assunto for casamento ou ensaio, é só nos contar por aqui que avisamos a nossa equipe. Agradecemos a compreensão!";
