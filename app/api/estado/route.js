import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenValido } from "@/lib/auth";

// A resposta muda conforme login, entao nunca pode ser cacheada.
export const dynamic = "force-dynamic";

// Calcula posicoes (1o, 2o...) a partir dos pontos, com empate na mesma posicao.
// Recebe uma lista de { id, pontos } e devolve um mapa id -> posicao.
function posicoesPorPontos(itens) {
  const ordenado = [...itens].sort((a, b) => b.pontos - a.pontos);
  const mapa = {};
  let pos = 0;
  let anterior = null;
  ordenado.forEach((it, i) => {
    if (it.pontos !== anterior) {
      pos = i + 1;
      anterior = it.pontos;
    }
    mapa[it.id] = pos;
  });
  return mapa;
}

// GET /api/estado
//  - Professor logado: manda tudo (pontos, totais).
//  - Publico: manda so as colocacoes (geral e por prova), sem os numeros.
export async function GET(request) {
  const logado = tokenValido(request);

  const [equipesDb, provasDb, resultadosDb] = await Promise.all([
    prisma.equipe.findMany({ include: { integrantes: true }, orderBy: { criadoEm: "asc" } }),
    prisma.prova.findMany({ include: { regras: { orderBy: { posicao: "asc" } } }, orderBy: { criadoEm: "asc" } }),
    prisma.resultado.findMany(),
  ]);

  const equipes = equipesDb.map((e) => ({
    id: e.id,
    nome: e.nome,
    cor: e.cor,
    integrantes: e.integrantes.map((i) => ({ id: i.id, nome: i.nome, serie: i.serie ?? null, lider: i.lider })),
  }));

  const provas = provasDb.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? "",
    tipo: p.tipo,
    peso: p.peso,
    pontosCumprir: p.pontosCumprir,
    status: p.status,
    diaRotulo: p.diaRotulo ?? null,
    diaData: p.diaData ?? null,
    horario: p.horario ?? null,
    // regras (pontos por posicao) sao configuracao sensivel: so pro professor.
    regras: logado ? p.regras.map((r) => ({ posicao: r.posicao, pontos: r.pontos })) : [],
  }));

  // ── Professor: manda tudo como esta ──
  if (logado) {
    const resultados = resultadosDb.map((r) => ({
      id: r.id,
      provaId: r.provaId,
      equipeId: r.equipeId,
      posicao: r.posicao,
      valor: r.valor == null ? null : JSON.parse(r.valor),
      pontos: r.pontos,
      criadoEm: r.criadoEm,
    }));
    return NextResponse.json({ equipes, provas, resultados, publico: false });
  }

  // ── Publico: calcula colocacoes, remove os pontos ──

  // Colocacao geral: soma dos pontos por equipe.
  const totais = equipes.map((e) => ({
    id: e.id,
    pontos: resultadosDb.filter((r) => r.equipeId === e.id).reduce((s, r) => s + r.pontos, 0),
  }));
  const posGeral = posicoesPorPontos(totais);
  const equipesPublic = equipes.map((e) => ({ ...e, posicaoGeral: posGeral[e.id] ?? null }));

  // Colocacao por prova: ordena as equipes daquela prova pelos pontos.
  const resultados = [];
  for (const p of provasDb) {
    const daProva = resultadosDb.filter((r) => r.provaId === p.id);
    const pos = posicoesPorPontos(daProva.map((r) => ({ id: r.equipeId, pontos: r.pontos })));
    for (const r of daProva) {
      resultados.push({
        id: r.id,
        provaId: r.provaId,
        equipeId: r.equipeId,
        posicao: pos[r.equipeId] ?? null,
        // pontos e valor ficam de fora: o publico nao os recebe.
        criadoEm: r.criadoEm,
      });
    }
  }

  return NextResponse.json({ equipes: equipesPublic, provas, resultados, publico: true });
}

// PUT /api/estado  — so admin. Recebe o estado inteiro e regrava.
// Estrategia simples e robusta para o tamanho de uma gincana: numa transacao,
// apaga tudo e recria a partir do que foi enviado (ultima escrita vence).
export async function PUT(request) {
  if (!tokenValido(request)) {
    return NextResponse.json({ erro: "Nao autorizado." }, { status: 401 });
  }

  const { equipes = [], provas = [], resultados = [] } = await request.json().catch(() => ({}));

  try {
    await prisma.$transaction(async (tx) => {
      // Apaga filhos antes dos pais (respeita as chaves estrangeiras).
      await tx.resultado.deleteMany();
      await tx.integrante.deleteMany();
      await tx.regraColocacao.deleteMany();
      await tx.prova.deleteMany();
      await tx.equipe.deleteMany();

      for (const e of equipes) {
        await tx.equipe.create({
          data: {
            id: e.id,
            nome: e.nome,
            cor: e.cor,
            integrantes: {
              create: (e.integrantes || []).map((i) => ({ id: i.id, nome: i.nome, serie: i.serie || null, lider: !!i.lider })),
            },
          },
        });
      }

      for (const p of provas) {
        await tx.prova.create({
          data: {
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || null,
            tipo: p.tipo,
            peso: Number(p.peso) || 1,
            pontosCumprir: Number(p.pontosCumprir) || 0,
            status: p.status || "aberta",
            diaRotulo: p.diaRotulo || null,
            diaData: p.diaData || null,
            horario: p.horario || null,
            regras: {
              create: (p.regras || []).map((r) => ({ posicao: Number(r.posicao), pontos: Number(r.pontos) || 0 })),
            },
          },
        });
      }

      for (const r of resultados) {
        await tx.resultado.create({
          data: {
            id: r.id,
            provaId: r.provaId,
            equipeId: r.equipeId,
            posicao: r.posicao ?? null,
            valor: r.valor == null ? null : JSON.stringify(r.valor),
            pontos: Number(r.pontos) || 0,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao salvar estado:", e);
    return NextResponse.json({ erro: "Falha ao salvar." }, { status: 500 });
  }
}