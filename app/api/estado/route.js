import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenValido } from "@/lib/auth";

// GET /api/estado  — publico. Le tudo e monta o mesmo formato que a tela usa.
export async function GET() {
  const [equipesDb, provasDb, resultadosDb] = await Promise.all([
    prisma.equipe.findMany({ include: { integrantes: true }, orderBy: { criadoEm: "asc" } }),
    prisma.prova.findMany({ include: { regras: { orderBy: { posicao: "asc" } } }, orderBy: { criadoEm: "asc" } }),
    prisma.resultado.findMany(),
  ]);

  const equipes = equipesDb.map((e) => ({
    id: e.id,
    nome: e.nome,
    cor: e.cor,
    integrantes: e.integrantes.map((i) => ({ id: i.id, nome: i.nome, lider: i.lider })),
  }));

  const provas = provasDb.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? "",
    tipo: p.tipo,
    peso: p.peso,
    pontosCumprir: p.pontosCumprir,
    status: p.status,
    regras: p.regras.map((r) => ({ posicao: r.posicao, pontos: r.pontos })),
  }));

  const resultados = resultadosDb.map((r) => ({
    id: r.id,
    provaId: r.provaId,
    equipeId: r.equipeId,
    posicao: r.posicao,
    // valor foi guardado como JSON (numero, booleano ou null) para round-trip fiel
    valor: r.valor == null ? null : JSON.parse(r.valor),
    pontos: r.pontos,
    criadoEm: r.criadoEm,
  }));

  return NextResponse.json({ equipes, provas, resultados });
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
              create: (e.integrantes || []).map((i) => ({ id: i.id, nome: i.nome, lider: !!i.lider })),
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
