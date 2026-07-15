import jwt from "jsonwebtoken";

// O segredo assina o token e mora so no servidor (variavel de ambiente).
// Sem ele, ninguem consegue forjar um token valido.
const SEGREDO = process.env.JWT_SECRET;

// Gera o "cracha" temporario que o professor guarda no navegador.
export function criarToken() {
  return jwt.sign({ papel: "professor" }, SEGREDO, { expiresIn: "12h" });
}

// Confere o token que veio no cabecalho Authorization da requisicao.
// Retorna true so se for um token que nos assinamos e ainda nao expirou.
export function tokenValido(request) {
  const cabecalho = request.headers.get("authorization") || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (!token) return false;
  try {
    jwt.verify(token, SEGREDO);
    return true;
  } catch {
    return false;
  }
}
