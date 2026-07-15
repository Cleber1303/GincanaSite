// Regras puras: sem UI, sem banco. Faceis de testar isoladamente.

export const TIPOS = {
  colocacao: { label: "Colocacao" },
  livre: { label: "Nota livre" },
  binaria: { label: "Participou" },
  bonus: { label: "Bonus / penalidade" },
};

// Arredonda para 2 casas, matando o ruido de ponto flutuante do JS
// (ex: 9.8 * 2.7 = 26.460000000000004 -> 26.46).
const arredonda = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Pontos de UM lancamento, conforme o tipo da prova.
export function calcularPontos(prova, lancamento) {
  const peso = prova.peso ?? 1;
  switch (prova.tipo) {
    case "colocacao": {
      const regra = prova.regras.find((r) => r.posicao === lancamento.posicao);
      return arredonda((regra ? regra.pontos : 0) * peso);
    }
    case "livre":
      return arredonda((Number(lancamento.valor) || 0) * peso);
    case "binaria":
      return arredonda((lancamento.valor ? prova.pontosCumprir : 0) * peso);
    case "bonus":
      return arredonda(Number(lancamento.valor) || 0);
    default:
      return 0;
  }
}

// Soma os pontos congelados de cada equipe e ordena, tratando empate.
// Arredonda a soma tambem, pois somar decimais reintroduz o ruido.
export function calcularRanking(equipes, resultados) {
  const tabela = equipes.map((e) => ({
    ...e,
    pontos: arredonda(
      resultados.filter((r) => r.equipeId === e.id).reduce((s, r) => s + r.pontos, 0)
    ),
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