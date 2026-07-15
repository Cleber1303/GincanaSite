import { NextResponse } from "next/server";
import { criarToken } from "@/lib/auth";

// POST /api/login  { senha }
// Compara com ADMIN_SENHA (variavel de ambiente). A senha nunca volta ao
// navegador: se bater, devolvemos apenas um token.
export async function POST(request) {
  const { senha } = await request.json().catch(() => ({}));

  if (!senha || senha !== process.env.ADMIN_SENHA) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({ token: criarToken() });
}
