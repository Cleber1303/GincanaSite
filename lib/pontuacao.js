// Regras puras: sem UI, sem banco. Faceis de testar isoladamente.

export const TIPOS = {
  colocacao: { label: "Colocacao" },
  livre: { label: "Nota livre" },
  binaria: { label: "Cumpriu / nao cumpriu" },
  bonus: { label: "Bonus / penalidade" },
};

// Pontos de UM lancamento, conforme o tipo da prova.
export function calcularPontos(prova, lancamento) {
  const peso = prova.peso ?? 1;
  switch (prova.tipo) {
    case "colocacao": {
      const regra = prova.regras.find((r) => r.posicao === lancamento.posicao);
      return (regra ? regra.pontos : 0) * peso;
    }
    case "livre":
      return (Number(lancamento.valor) || 0) * peso;
    case "binaria":
      return (lancamento.valor ? prova.pontosCumprir : 0) * peso;
    case "bonus":
      return Number(lancamento.valor) || 0;
    default:
      return 0;
  }
}

// Soma os pontos congelados de cada equipe e ordena, tratando empate.
export function calcularRanking(equipes, resultados) {
  const tabela = equipes.map((e) => ({
    ...e,
    pontos: resultados.filter((r) => r.equipeId === e.id).reduce((s, r) => s + r.pontos, 0),
  }));
  tabela.sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome));
  let pos = 0;
  let anterior = null;
  return tabela.map((t, i) => {
    if (t.pontos !== anterior) {
      pos = i + 1;
      anterior = t.pontos;
    }
    return { ...t, posicao: pos };
  });
}
