import { revalidatePath } from "next/cache";

// A página inicial é guardada por até 1 minuto. Quando algo muda no painel (foto do topo, galeria, número
// do WhatsApp, calendário), isto manda refazê-la na hora para a mudança aparecer ao recarregar.
export function atualizarPaginaInicial() {
  try {
    revalidatePath("/");
  } catch {
    // fora de uma requisição (testes): não há o que atualizar
  }
}
