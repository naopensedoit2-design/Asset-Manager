// Valores da página: "R$ 2.600" quando é inteiro, "R$ 2.650,50" quando não é. O espaço depois do R$ não quebra linha.
const inteiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const comCentavos = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function reais(centavos: number): string {
  const valor = centavos / 100;
  return (centavos % 100 === 0 ? inteiro : comCentavos).format(valor);
}
