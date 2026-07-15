# Gincana — como rodar

## O que voce recebeu
Projeto Next.js completo: front (placar) + API + login de admin, ligado ao seu banco Neon.

## Passo a passo (na pasta gincana-app)

### 1. Criar o arquivo .env
Copie o `.env.example` para `.env` e preencha as 3 linhas:

- `DATABASE_URL` — a connection string do Neon (a mesma que voce ja usou na migracao)
- `ADMIN_SENHA` — a senha que o professor vai digitar para entrar
- `JWT_SECRET` — invente uma frase longa e aleatoria (40+ caracteres)

### 2. Instalar as dependencias
```bash
npm install
```

### 3. Gerar o Prisma Client (liga o codigo ao banco)
```bash
npx prisma generate
```

### 4. Rodar
```bash
npm run dev
```
Abre em http://localhost:3000

## Como testar
1. Abra a URL — voce ve o placar vazio, em modo so leitura.
2. Clique em "Entrar como professor" e digite a ADMIN_SENHA.
3. Os botoes de cadastrar/lancar aparecem. Crie equipes, provas, lance pontos.
4. Abra a MESMA URL numa aba anonima (ou outro celular) SEM logar:
   voce ve o mesmo placar atualizado, mas sem poder editar. E o que a gente queria.

## Seguranca (importante)
- O `.env` tem segredos e NUNCA vai para o Git (ja esta no .gitignore).
- A senha do professor so existe no servidor. O navegador nunca a recebe.
- Esconder botao nao protege nada: a rota PUT recusa quem nao tem token valido.

## Estrutura
- `app/page.jsx` ......... a tela do placar
- `app/api/estado/route.js` GET (publico) + PUT (so admin)
- `app/api/login/route.js`  confere a senha, devolve o token
- `lib/prisma.js` ........ conexao com o banco
- `lib/auth.js` .......... cria e verifica o token
- `lib/pontuacao.js` ..... regras de pontuacao e ranking
- `prisma/schema.prisma` . as 5 tabelas
