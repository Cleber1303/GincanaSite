import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenValido } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/edicoes — arquiva a gincana atual como uma edicao do historico.
// Le direto do banco (nao confia no que vem do navegador) e congela num JSON.
export async function POST(request) {
  if (!tokenValido(request)) {
    return NextResponse.json({ erro: "Nao autorizado." }, { status: 401 });
  }

  const { nome } = await request.json().catch(() => ({}));
  if (!nome || !String(nome).trim()) {
    return NextResponse.json({ erro: "Informe um nome para a edicao." }, { status: 400 });
  }

  try {
    const [equipesDb, provasDb, resultadosDb] = await Promise.all([
      prisma.equipe.findMany({ include: { integrantes: true }, orderBy: { criadoEm: "asc" } }),
      prisma.prova.findMany({ include: { regras: { orderBy: { posicao: "asc" } } }, orderBy: { criadoEm: "asc" } }),
      prisma.resultado.findMany(),
    ]);

    if (equipesDb.length === 0 && provasDb.length === 0) {
      return NextResponse.json({ erro: "Nao ha nada para arquivar." }, { status: 400 });
    }

    // Snapshot enxuto: so o que o historico precisa mostrar.
    const dados = {
      equipes: equipesDb.map((e) => ({
        id: e.id,
        nome: e.nome,
        cor: e.cor,
        integrantes: e.integrantes.map((i) => ({ id: i.id, nome: i.nome, serie: i.serie ?? null, lider: i.lider })),
      })),
      provas: provasDb.map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao ?? "",
        tipo: p.tipo,
        peso: p.peso,
        status: p.status,
        diaRotulo: p.diaRotulo ?? null,
        diaData: p.diaData ?? null,
        horario: p.horario ?? null,
      })),
      resultados: resultadosDb.map((r) => ({
        id: r.id,
        provaId: r.provaId,
        equipeId: r.equipeId,
        posicao: r.posicao,
        pontos: r.pontos,
      })),
    };

    const edicao = await prisma.edicao.create({
      data: { nome: String(nome).trim(), dados: JSON.stringify(dados) },
    });

    return NextResponse.json({ ok: true, id: edicao.id });
  } catch (e) {
    console.error("Erro ao arquivar edicao:", e);
    return NextResponse.json({ erro: "Falha ao arquivar." }, { status: 500 });
  }
}

// DELETE /api/edicoes?id=xxx — remove uma edicao do historico.
export async function DELETE(request) {
  if (!tokenValido(request)) {
    return NextResponse.json({ erro: "Nao autorizado." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "Id nao informado." }, { status: 400 });

  try {
    await prisma.edicao.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao excluir edicao:", e);
    return NextResponse.json({ erro: "Falha ao excluir." }, { status: 500 });
  }
}