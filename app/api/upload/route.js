import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { tokenValido } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/upload  — recebe UMA imagem e devolve a URL publica no Blob.
// Protegido: so o professor logado pode subir arquivo.
export async function POST(request) {
  if (!tokenValido(request)) {
    return NextResponse.json({ erro: "Nao autorizado." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!arquivo || typeof arquivo === "string") {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  // Aceita so imagem.
  if (!arquivo.type?.startsWith("image/")) {
    return NextResponse.json({ erro: "Envie apenas imagens." }, { status: 400 });
  }

  // Limite defensivo de tamanho (10 MB por imagem).
  if (arquivo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ erro: "Imagem muito grande (max 10 MB)." }, { status: 400 });
  }

  try {
    const blob = await put(`anexos/${Date.now()}-${arquivo.name}`, arquivo, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url, nome: arquivo.name });
  } catch (e) {
    console.error("Erro no upload:", e);
    return NextResponse.json({ erro: "Falha ao enviar a imagem." }, { status: 500 });
  }
}