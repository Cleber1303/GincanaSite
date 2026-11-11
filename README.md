# Gincana do Sagrado

Placar e gestão da gincana do Colégio Sagrado Coração de Maria.
No ar em https://gincana-site-beta.vercel.app

Qualquer pessoa abre o endereço e vê o placar atualizado. Criar equipes, cadastrar
provas e lançar pontos exige login de administrador.

<!-- Capturas de tela: suba as imagens em docs/ e descomente as linhas abaixo.
     Use uma edição de teste, sem nome de aluno real.
![Placar](docs/placar.png)
![Lançamento de pontos](docs/lancamento.png)
-->

## Pontuação

Cada prova tem um tipo e um peso. O tipo define como o lançamento vira pontos:

| Tipo | Cálculo |
| --- | --- |
| Colocação | pontos da posição, de uma tabela definida na prova, × peso |
| Nota livre | valor lançado × peso |
| Participou | pontos de cumprimento, se marcado, × peso |
| Bônus / penalidade | valor lançado, sem peso |

Os pontos são gravados já calculados na tabela `Resultado`. Mudar o peso ou a
regra de uma prova depois não altera lançamento antigo.

Equipes com a mesma pontuação ficam na mesma posição e a posição seguinte pula o
número. O nome só ordena a exibição dentro do empate.

Cada lançamento e a soma são arredondados para duas casas. Sem isso, peso decimal
mostra ruído de ponto flutuante no placar: 9.8 × 2.7 dá 26.460000000000004.

As regras ficam em `lib/pontuacao.js`, sem interface e sem banco.

## Acesso

A senha do administrador fica só no servidor e o navegador recebe um token JWT.
`GET /api/estado` é público. `PUT` recusa requisição sem token válido, então a
restrição está na rota, não na tela.

## Edições anteriores

Encerrar uma gincana grava equipes, provas e resultados como JSON na tabela
`Edicao`, que fica fora da escrita do estado atual. O histórico não é afetado
quando a gincana do ano seguinte começa.

## Banco

`Equipe` tem muitos `Integrante`. `Prova` tem muitas `RegraColocacao`.
`Resultado` liga equipe e prova com os pontos já calculados.

O dia da prova fica na própria prova, como rótulo e data ISO. Não há tabela de
calendário: o dia existe enquanto houver prova nele.

`Anexo` guarda cronograma e imagens, ligados a uma prova ou gerais. Os arquivos
ficam no Vercel Blob e a lista vai em JSON.

## Rodar local

```bash
cp .env.example .env    # preencha DATABASE_URL, ADMIN_SENHA e JWT_SECRET
npm install
npx prisma generate
npm run dev
```

Abre em http://localhost:3000. O que cada variável significa está em
[COMO_RODAR.md](COMO_RODAR.md).

## Stack

Next.js 16, React 19, Prisma 6, PostgreSQL no Neon, Tailwind 4, jsonwebtoken,
Vercel Blob, deploy na Vercel.

## Arquivos

```
app/page.jsx              placar e telas de administração
app/api/estado/route.js   GET público, PUT restrito ao administrador
app/api/login/route.js    confere a senha e devolve o token
app/api/upload/route.js   imagens para o Vercel Blob
app/api/edicoes/route.js  arquiva e lê edições
lib/pontuacao.js          pontuação e ranking
lib/auth.js               cria e verifica o token
lib/prisma.js             conexão
prisma/schema.prisma      as tabelas
```

## Pendências

- `app/page.jsx` tem 1771 linhas e precisa ser dividido em componentes.
- `lib/pontuacao.js` não tem teste automatizado.
- `PUT /api/estado` apaga e recria o estado inteiro, em vez de escrever por
  entidade.
