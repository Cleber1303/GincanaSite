"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Plus, Trash2, Users, ClipboardList, Medal, X, Pencil, ChevronRight, ChevronDown, ChevronUp, Lock, Unlock, Crown, LogIn, LogOut } from "lucide-react";
import { TIPOS, calcularPontos, calcularRanking } from "@/lib/pontuacao";

/* ══════════════════════════════════════════════════════════════
   REPOSITORIO — conversa com a API. Leitura publica, escrita com token.
   ══════════════════════════════════════════════════════════════ */

const CHAVE_TOKEN = "gincana:token";
const VAZIO = { equipes: [], provas: [], resultados: [] };

const repo = {
  async carregar() {
    const r = await fetch("/api/estado");
    if (!r.ok) throw new Error("Nao foi possivel carregar a gincana.");
    return r.json();
  },
  async salvar(estado, token) {
    const r = await fetch("/api/estado", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(estado),
    });
    if (r.status === 401) throw new Error("SESSAO_EXPIRADA");
    if (!r.ok) throw new Error("Falha ao salvar.");
    return r.json();
  },
  async entrar(senha) {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!r.ok) return null;
    const { token } = await r.json();
    return token;
  },
};

/* ══════════════════════════════════════════════════════════════
   3. TOKENS — paleta "quadra poliesportiva"
   ══════════════════════════════════════════════════════════════ */

const C = {
  quadra: "#DCDFD8",
  papel: "#FFFFFF",
  pinho: "#1E4A3B",
  pinhoEsc: "#143229",
  tinta: "#14181A",
  fraco: "#6C7269",
  medio: "#3A4038",
  linha: "#C3C8BE",
  apito: "#E2542A",
  menta: "#8FBFAC",
};
const CORES_EQUIPE = ["#E2542A", "#2C6FB5", "#F2B01E", "#7A3FA6", "#159C6D", "#D6266A", "#0F9BB5", "#8C5A2B"];

// Ouro, prata, bronze — so para 1o, 2o e 3o lugar.
const MEDALHAS = {
  1: { fundo: "#F2B01E", anel: "#B8830F", texto: "#5A3F04" },
  2: { fundo: "#C3C9CE", anel: "#98A0A6", texto: "#3D4247" },
  3: { fundo: "#CE8E52", anel: "#A56A35", texto: "#4A2E11" },
};

const novoId = () => Math.random().toString(36).slice(2, 9);

export default function Gincana() {
  const [estado, setEstado] = useState(VAZIO);
  const [pronto, setPronto] = useState(false);
  const [aba, setAba] = useState("ranking");
  const [token, setToken] = useState(null);
  const [modal, setModal] = useState(null);
  const professor = !!token;

  useEffect(() => {
    const salvo = typeof window !== "undefined" ? localStorage.getItem(CHAVE_TOKEN) : null;
    if (salvo) setToken(salvo);
    repo
      .carregar()
      .then((e) => setEstado(e))
      .catch(() => {})
      .finally(() => setPronto(true));
  }, []);

  const entrar = async (senha) => {
    const novoToken = await repo.entrar(senha);
    if (!novoToken) return false;
    localStorage.setItem(CHAVE_TOKEN, novoToken);
    setToken(novoToken);
    return true;
  };

  const sair = () => {
    localStorage.removeItem(CHAVE_TOKEN);
    setToken(null);
  };

  // Atualiza a tela na hora (otimista) e grava no servidor. Se falhar,
  // avisa e ressincroniza com o que esta no banco.
  const atualizar = async (novo) => {
    setEstado(novo);
    try {
      await repo.salvar(novo, token);
    } catch (e) {
      if (e.message === "SESSAO_EXPIRADA") {
        sair();
        alert("Sua sessao expirou. Entre como professor novamente.");
      } else {
        alert("Nao foi possivel salvar. Verifique a conexao.");
      }
      repo.carregar().then(setEstado).catch(() => {});
    }
  };

  const { equipes, provas, resultados } = estado;
  const ranking = useMemo(() => calcularRanking(equipes, resultados), [equipes, resultados]);

  const salvarEquipe = (eq) =>
    atualizar({
      ...estado,
      equipes: eq.id ? equipes.map((e) => (e.id === eq.id ? eq : e)) : [...equipes, { ...eq, id: novoId() }],
    });

  const excluirEquipe = (eid) =>
    atualizar({
      ...estado,
      equipes: equipes.filter((e) => e.id !== eid),
      resultados: resultados.filter((r) => r.equipeId !== eid),
    });

  const salvarProva = (p) =>
    atualizar({
      ...estado,
      provas: p.id ? provas.map((x) => (x.id === p.id ? p : x)) : [...provas, { ...p, id: novoId() }],
    });

  const excluirProva = (pid) =>
    atualizar({
      ...estado,
      provas: provas.filter((p) => p.id !== pid),
      resultados: resultados.filter((r) => r.provaId !== pid),
    });

  // Congela os pontos no resultado: mudar a regra depois nao corrompe o historico.
  const lancarResultado = (prova, lancamentos) => {
    const novos = lancamentos
      .filter((l) => l.ativo)
      .map((l) => ({
        id: novoId(),
        provaId: prova.id,
        equipeId: l.equipeId,
        posicao: l.posicao ?? null,
        valor: l.valor ?? null,
        pontos: calcularPontos(prova, l),
        criadoEm: new Date().toISOString(),
      }));
    atualizar({
      ...estado,
      resultados: [...resultados.filter((r) => r.provaId !== prova.id), ...novos],
      provas: provas.map((p) => (p.id === prova.id ? { ...p, status: "encerrada" } : p)),
    });
  };

  if (!pronto) {
    return (
      <div style={{ background: C.quadra, minHeight: "100vh", display: "grid", placeItems: "center", color: C.fraco }}>
        Carregando o placar...
      </div>
    );
  }

  const maior = Math.max(1, ...ranking.map((r) => Math.abs(r.pontos)));

  return (
    <div style={{ background: C.quadra, color: C.tinta, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600&family=Archivo+Black&family=Inter:wght@400;500;600&display=swap');
        .placar { font-family: 'Archivo Black', sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
        .rotulo { font-family: 'Archivo', sans-serif; text-transform: uppercase; letter-spacing: .12em; font-size: 11px; font-weight: 600; }
        .barra { transition: width .6s cubic-bezier(.22,1,.36,1); }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${C.apito}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .barra { transition: none; } }
      `}</style>

      <header style={{ background: C.pinho, borderBottom: `4px solid ${C.papel}` }}>
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-5 flex items-end justify-between">
          <div>
            <div className="rotulo" style={{ color: C.menta }}>Placar ao vivo</div>
            <h1 className="placar text-3xl leading-none mt-1" style={{ color: C.papel }}>GINCANA</h1>
          </div>
          {professor ? (
            <button
              onClick={sair}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: C.apito, color: C.papel }}
            >
              <LogOut size={13} /> Sair
            </button>
          ) : (
            <button
              onClick={() => setModal({ t: "login" })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: C.pinhoEsc, color: C.papel }}
            >
              <LogIn size={13} /> Entrar como professor
            </button>
          )}
        </div>
        <nav className="max-w-3xl mx-auto px-5 flex gap-1">
          {[["ranking", "Placar", Trophy], ["provas", "Provas", ClipboardList], ["equipes", "Equipes", Users]].map(([k, t, Ico]) => (
            <button
              key={k}
              onClick={() => setAba(k)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-t-md text-sm font-semibold"
              style={{ background: aba === k ? C.quadra : "transparent", color: aba === k ? C.tinta : C.menta }}
            >
              <Ico size={15} /> {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 pb-24">
        {aba === "ranking" &&
          (ranking.length === 0 ? (
            <Vazio texto="Nenhuma equipe ainda. Cadastre as equipes para o placar comecar." acao={() => setAba("equipes")} rotulo="Cadastrar equipes" />
          ) : (
            <div className="space-y-2.5">
              {ranking.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setModal({ t: "verEquipe", d: e })}
                  className="w-full text-left rounded-lg p-3.5 flex items-center gap-3.5"
                  style={{ background: C.papel, border: `1px solid ${C.linha}` }}
                >
                  <Posicao n={e.posicao} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="font-semibold truncate">{e.nome}</span>
                      <span className="placar text-xl shrink-0">{e.pontos}</span>
                    </div>
                    <div style={{ height: 8, background: C.quadra, borderRadius: 4, overflow: "hidden" }}>
                      <div
                        className="barra"
                        style={{ width: `${Math.max(2, (Math.abs(e.pontos) / maior) * 100)}%`, height: "100%", background: e.cor, borderRadius: 4 }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs" style={{ color: C.fraco }}>
                      {e.integrantes.length} integrante{e.integrantes.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.linha }} />
                </button>
              ))}
            </div>
          ))}

        {aba === "provas" && (
          <>
            {professor && <BotaoNovo onClick={() => setModal({ t: "prova", d: null })} texto="Nova prova" />}
            {provas.length === 0 ? (
              <Vazio texto="Nenhuma prova cadastrada. Crie a primeira para lancar pontos." />
            ) : (
              <div className="space-y-2.5 mt-3">
                {provas.map((p) => {
                  const lancados = resultados.filter((r) => r.provaId === p.id);
                  return (
                    <div key={p.id} className="rounded-lg p-4" style={{ background: C.papel, border: `1px solid ${C.linha}` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="rotulo" style={{ color: C.fraco }}>
                            {TIPOS[p.tipo].label}
                            {p.tipo !== "bonus" && p.peso !== 1 ? ` · peso ${p.peso}x` : ""}
                          </div>
                          <div className="font-semibold mt-0.5">{p.nome}</div>
                          {p.descricao && (
                            <div className="text-sm mt-0.5" style={{ color: C.fraco }}>{p.descricao}</div>
                          )}
                        </div>
                        <span
                          className="rotulo px-2 py-1 rounded shrink-0"
                          style={{
                            background: p.status === "encerrada" ? C.pinho : C.quadra,
                            color: p.status === "encerrada" ? C.papel : C.fraco,
                          }}
                        >
                          {p.status === "encerrada" ? "Encerrada" : "Aberta"}
                        </span>
                      </div>

                      {lancados.length > 0 && (
                        <div className="mt-3 pt-3 space-y-1" style={{ borderTop: `1px solid ${C.linha}` }}>
                          {[...lancados].sort((a, b) => b.pontos - a.pontos).map((r) => {
                            const eq = equipes.find((e) => e.id === r.equipeId);
                            if (!eq) return null;
                            return (
                              <div key={r.id} className="flex items-center gap-2 text-sm">
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: eq.cor }} />
                                <span className="flex-1 truncate">{eq.nome}</span>
                                {r.posicao && <span className="rotulo" style={{ color: C.fraco }}>{r.posicao}o</span>}
                                <span className="placar text-sm">{r.pontos > 0 ? "+" : ""}{r.pontos}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {professor && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setModal({ t: "lancar", d: p })}
                            className="flex-1 py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5"
                            style={{ background: C.pinho, color: C.papel }}
                          >
                            <Medal size={14} /> {lancados.length ? "Refazer lancamento" : "Lancar resultado"}
                          </button>
                          <IconBtn onClick={() => setModal({ t: "prova", d: p })}><Pencil size={15} /></IconBtn>
                          <IconBtn onClick={() => excluirProva(p.id)} perigo><Trash2 size={15} /></IconBtn>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {aba === "equipes" && (
          <>
            {professor && <BotaoNovo onClick={() => setModal({ t: "equipe", d: null })} texto="Nova equipe" />}
            {equipes.length === 0 ? (
              <Vazio texto="Nenhuma equipe cadastrada." />
            ) : (
              <div className="space-y-2.5 mt-3">
                {equipes.map((e) => (
                  <CardEquipe
                    key={e.id}
                    equipe={e}
                    professor={professor}
                    onEditar={() => setModal({ t: "equipe", d: e })}
                    onExcluir={() => excluirEquipe(e.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {modal?.t === "equipe" && (
        <FormEquipe
          equipe={modal.d}
          usadas={equipes.map((e) => e.cor)}
          onSalvar={(eq) => { salvarEquipe(eq); setModal(null); }}
          onFechar={() => setModal(null)}
        />
      )}
      {modal?.t === "prova" && (
        <FormProva prova={modal.d} onSalvar={(p) => { salvarProva(p); setModal(null); }} onFechar={() => setModal(null)} />
      )}
      {modal?.t === "lancar" && (
        <FormLancamento
          prova={modal.d}
          equipes={equipes}
          anteriores={resultados.filter((r) => r.provaId === modal.d.id)}
          onSalvar={(l) => { lancarResultado(modal.d, l); setModal(null); }}
          onFechar={() => setModal(null)}
        />
      )}
      {modal?.t === "verEquipe" && (
        <DetalheEquipe
          equipe={modal.d}
          provas={provas}
          resultados={resultados.filter((r) => r.equipeId === modal.d.id)}
          onFechar={() => setModal(null)}
        />
      )}
      {modal?.t === "login" && (
        <FormLogin
          onEntrar={entrar}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. COMPONENTES
   ══════════════════════════════════════════════════════════════ */

const IconBtn = ({ children, onClick, perigo }) => (
  <button onClick={onClick} className="p-2 rounded-md" style={{ background: C.quadra, color: perigo ? C.apito : C.fraco }}>
    {children}
  </button>
);

// 1o/2o/3o viram medalha com o numero dentro; do 4o em diante, so o numero.
function Posicao({ n }) {
  const m = MEDALHAS[n];
  if (!m) {
    return (
      <span className="placar text-lg shrink-0 text-center" style={{ width: 28, color: C.fraco }}>
        {n}
      </span>
    );
  }
  return (
    <span
      className="placar shrink-0 flex items-center justify-center"
      style={{ width: 28, height: 28, borderRadius: "50%", background: m.fundo, border: `2px solid ${m.anel}`, color: m.texto, fontSize: 13 }}
    >
      {n}
    </span>
  );
}

// Card da aba Equipes: mostra so os lideres; a seta expande o resto.
function CardEquipe({ equipe, professor, onEditar, onExcluir }) {
  const [aberto, setAberto] = useState(false);
  const ordenados = [...equipe.integrantes].sort((a, b) => (b.lider ? 1 : 0) - (a.lider ? 1 : 0));
  const lideres = ordenados.filter((i) => i.lider);
  const visiveis = aberto ? ordenados : lideres;
  const escondidos = equipe.integrantes.length - lideres.length;

  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{ background: C.papel, border: `1px solid ${C.linha}`, borderLeft: `5px solid ${equipe.cor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{equipe.nome}</div>

        {equipe.integrantes.length === 0 ? (
          <div className="text-sm mt-1" style={{ color: C.fraco }}>Sem integrantes.</div>
        ) : (
          <>
            {visiveis.length > 0 && (
              <ul className="mt-2 space-y-1">
                {visiveis.map((i) => (
                  <li key={i.id} className="flex items-center gap-1.5 text-sm" style={{ color: C.medio }}>
                    {i.lider && <Crown size={13} fill={C.apito} style={{ color: C.apito }} />}
                    <span>{i.nome}</span>
                  </li>
                ))}
              </ul>
            )}
            {lideres.length === 0 && !aberto && (
              <div className="text-sm mt-1" style={{ color: C.fraco }}>Sem lider definido.</div>
            )}
            {escondidos > 0 && (
              <button
                onClick={() => setAberto(!aberto)}
                className="flex items-center gap-1 mt-2 text-sm font-semibold"
                style={{ color: C.pinho }}
              >
                {aberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                {aberto ? "Recolher" : `Ver todos (${equipe.integrantes.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {professor && (
        <div className="flex gap-2 shrink-0">
          <IconBtn onClick={onEditar}><Pencil size={15} /></IconBtn>
          <IconBtn onClick={onExcluir} perigo><Trash2 size={15} /></IconBtn>
        </div>
      )}
    </div>
  );
}

const BotaoNovo = ({ onClick, texto }) => (
  <button
    onClick={onClick}
    className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
    style={{ background: C.pinho, color: C.papel }}
  >
    <Plus size={16} /> {texto}
  </button>
);

const Vazio = ({ texto, acao, rotulo }) => (
  <div className="rounded-lg p-8 text-center mt-3" style={{ background: C.papel, border: `1px dashed ${C.linha}`, color: C.fraco }}>
    <p className="text-sm">{texto}</p>
    {acao && (
      <button onClick={acao} className="mt-3 text-sm font-semibold" style={{ color: C.pinho }}>
        {rotulo}
      </button>
    )}
  </div>
);

const Modal = ({ titulo, children, onFechar }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(20,24,26,.55)" }} onClick={onFechar}>
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-auto"
      style={{ background: C.papel, maxHeight: "90vh" }}
    >
      <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: C.papel, borderBottom: `1px solid ${C.linha}` }}>
        <h2 className="placar text-lg">{titulo}</h2>
        <button onClick={onFechar} style={{ color: C.fraco }}><X size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Campo = ({ rotulo, ...props }) => (
  <label className="block mb-3">
    <span className="rotulo block mb-1.5" style={{ color: C.fraco }}>{rotulo}</span>
    <input
      {...props}
      className="w-full px-3 py-2.5 rounded-md text-sm"
      style={{ background: C.quadra, border: `1px solid ${C.linha}`, color: C.tinta }}
    />
  </label>
);

const Confirmar = ({ onClick, texto = "Salvar", desabilitado }) => (
  <button
    onClick={desabilitado ? undefined : onClick}
    disabled={desabilitado}
    className="w-full py-3 rounded-lg font-semibold text-sm mt-2"
    style={{ background: desabilitado ? C.linha : C.pinho, color: C.papel, cursor: desabilitado ? "not-allowed" : "pointer" }}
  >
    {texto}
  </button>
);

function FormEquipe({ equipe, usadas, onSalvar, onFechar }) {
  const [nome, setNome] = useState(equipe?.nome ?? "");
  const [cor, setCor] = useState(equipe?.cor ?? CORES_EQUIPE.find((c) => !usadas.includes(c)) ?? CORES_EQUIPE[0]);
  const [integrantes, setIntegrantes] = useState(equipe?.integrantes ?? []);
  const [novo, setNovo] = useState("");

  const addIntegrante = () => {
    if (!novo.trim()) return;
    setIntegrantes([...integrantes, { id: novoId(), nome: novo.trim() }]);
    setNovo("");
  };

  return (
    <Modal titulo={equipe ? "Editar equipe" : "Nova equipe"} onFechar={onFechar}>
      <Campo rotulo="Nome da equipe" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Equipe Amarela" />

      <div className="mb-4">
        <span className="rotulo block mb-2" style={{ color: C.fraco }}>Cor</span>
        <div className="flex gap-2 flex-wrap items-center">
          {CORES_EQUIPE.map((c) => (
            <button
              key={c}
              onClick={() => setCor(c)}
              aria-label={`Cor ${c}`}
              style={{ width: 32, height: 32, borderRadius: 8, background: c, border: cor === c ? `3px solid ${C.tinta}` : "none" }}
            />
          ))}
          {/* Roda de cores: escolher qualquer cor */}
          <label
            className="relative flex items-center justify-center cursor-pointer"
            title="Escolher outra cor"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "conic-gradient(from 90deg, #ff004c, #ff9a00, #ffe600, #37d200, #00c2d4, #2b6bff, #a640ff, #ff004c)",
              border: CORES_EQUIPE.includes(cor) ? "none" : `3px solid ${C.tinta}`,
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: cor, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} />
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              aria-label="Escolher cor personalizada"
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <span className="rotulo block mb-1.5" style={{ color: C.fraco }}>Integrantes</span>
      <div className="flex gap-2 mb-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addIntegrante()}
          placeholder="Nome do integrante"
          className="flex-1 px-3 py-2.5 rounded-md text-sm"
          style={{ background: C.quadra, border: `1px solid ${C.linha}` }}
        />
        <button onClick={addIntegrante} className="px-3 rounded-md" style={{ background: C.pinho, color: C.papel }}>
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-1 mb-2">
        {integrantes.map((i) => (
          <div key={i.id} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm" style={{ background: C.quadra }}>
            <span className="flex-1 truncate">{i.nome}</span>
            <button
              onClick={() => setIntegrantes(integrantes.map((x) => (x.id === i.id ? { ...x, lider: !x.lider } : x)))}
              title={i.lider ? "Remover como lider" : "Marcar como lider"}
              style={{ color: i.lider ? C.apito : C.linha }}
            >
              <Crown size={15} fill={i.lider ? C.apito : "none"} />
            </button>
            <button onClick={() => setIntegrantes(integrantes.filter((x) => x.id !== i.id))} style={{ color: C.apito }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <Confirmar onClick={() => nome.trim() && onSalvar({ ...equipe, nome: nome.trim(), cor, integrantes })} />
    </Modal>
  );
}

function FormProva({ prova, onSalvar, onFechar }) {
  const [f, setF] = useState(
    prova ?? {
      nome: "",
      descricao: "",
      tipo: "colocacao",
      peso: 1,
      status: "aberta",
      regras: [
        { posicao: 1, pontos: 50 },
        { posicao: 2, pontos: 30 },
        { posicao: 3, pontos: 10 },
      ],
      pontosCumprir: 20,
    }
  );
  const set = (k, v) => setF({ ...f, [k]: v });

  return (
    <Modal titulo={prova ? "Editar prova" : "Nova prova"} onFechar={onFechar}>
      <Campo rotulo="Nome da prova" value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Cabo de guerra" />
      <Campo rotulo="Descricao (opcional)" value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Quadra, 14h" />

      <label className="block mb-3">
        <span className="rotulo block mb-1.5" style={{ color: C.fraco }}>Como pontua</span>
        <select
          value={f.tipo}
          onChange={(e) => set("tipo", e.target.value)}
          className="w-full px-3 py-2.5 rounded-md text-sm"
          style={{ background: C.quadra, border: `1px solid ${C.linha}` }}
        >
          {Object.entries(TIPOS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </label>

      {f.tipo === "colocacao" && (
        <div className="mb-3">
          <span className="rotulo block mb-1.5" style={{ color: C.fraco }}>Pontos por posicao</span>
          {f.regras.map((r, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <span className="placar w-8 text-sm">{r.posicao}o</span>
              <input
                type="number"
                value={r.pontos}
                onChange={(e) => set("regras", f.regras.map((x, j) => (j === i ? { ...x, pontos: e.target.value } : x)))}
                className="flex-1 px-3 py-2 rounded-md text-sm"
                style={{ background: C.quadra, border: `1px solid ${C.linha}` }}
              />
              <button onClick={() => set("regras", f.regras.filter((_, j) => j !== i))} style={{ color: C.apito }}>
                <X size={15} />
              </button>
            </div>
          ))}
          <button
            onClick={() => set("regras", [...f.regras, { posicao: f.regras.length + 1, pontos: 5 }])}
            className="text-sm font-semibold"
            style={{ color: C.pinho }}
          >
            + Adicionar posicao
          </button>
        </div>
      )}

      {f.tipo === "binaria" && (
        <Campo rotulo="Pontos por cumprir" type="number" value={f.pontosCumprir} onChange={(e) => set("pontosCumprir", e.target.value)} />
      )}

      {f.tipo !== "bonus" && (
        <Campo rotulo="Peso (multiplicador)" type="number" step="0.5" value={f.peso} onChange={(e) => set("peso", e.target.value)} />
      )}

      <Confirmar
        onClick={() => {
          if (!f.nome.trim()) return;
          onSalvar({
            ...f,
            nome: f.nome.trim(),
            peso: Number(f.peso) || 1,
            pontosCumprir: Number(f.pontosCumprir) || 0,
            regras: f.regras.map((r) => ({ ...r, pontos: Number(r.pontos) || 0 })),
          });
        }}
      />
    </Modal>
  );
}

function FormLancamento({ prova, equipes, anteriores, onSalvar, onFechar }) {
  const [l, setL] = useState(() =>
    equipes.map((e) => {
      const ant = anteriores.find((r) => r.equipeId === e.id);
      return {
        equipeId: e.id,
        ativo: !!ant,
        posicao: ant?.posicao ?? null,
        valor: ant?.valor ?? (prova.tipo === "binaria" ? false : ""),
      };
    })
  );
  const set = (eid, patch) => setL(l.map((x) => (x.equipeId === eid ? { ...x, ...patch } : x)));

  // Equipe marcada precisa ter valor: colocacao selecionada, ou numero preenchido.
  const faltaPreencher = (item) => {
    if (!item.ativo) return false;
    if (prova.tipo === "colocacao") return item.posicao == null || item.posicao === "";
    if (prova.tipo === "livre" || prova.tipo === "bonus") return item.valor === "" || item.valor == null || isNaN(Number(item.valor));
    return false;
  };
  const temPendencia = l.some(faltaPreencher);

  if (equipes.length === 0) {
    return (
      <Modal titulo={prova.nome} onFechar={onFechar}>
        <p className="text-sm" style={{ color: C.fraco }}>Cadastre pelo menos uma equipe antes de lancar resultado.</p>
      </Modal>
    );
  }

  return (
    <Modal titulo={prova.nome} onFechar={onFechar}>
      <div className="space-y-2">
        {equipes.map((e) => {
          const item = l.find((x) => x.equipeId === e.id);
          const pontos = item.ativo ? calcularPontos(prova, item) : 0;
          return (
            <div key={e.id} className="p-3 rounded-lg" style={{ background: C.quadra, borderLeft: `4px solid ${e.cor}` }}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 flex-1 min-w-0">
                  <input type="checkbox" checked={item.ativo} onChange={(ev) => set(e.id, { ativo: ev.target.checked })} />
                  <span className="font-semibold text-sm truncate">{e.nome}</span>
                </label>
                <span className="placar text-sm" style={{ color: pontos ? C.tinta : C.linha }}>
                  {pontos > 0 ? "+" : ""}{pontos}
                </span>
              </div>

              {item.ativo && (
                <div className="mt-2">
                  {prova.tipo === "colocacao" && (
                    <select
                      value={item.posicao ?? ""}
                      onChange={(ev) => set(e.id, { posicao: Number(ev.target.value) })}
                      className="w-full px-3 py-2 rounded-md text-sm"
                      style={{ background: C.papel, border: `1px solid ${C.linha}` }}
                    >
                      <option value="">Selecione a colocacao</option>
                      {prova.regras.map((r) => (
                        <option key={r.posicao} value={r.posicao}>{r.posicao}o lugar — {r.pontos} pts</option>
                      ))}
                    </select>
                  )}
                  {(prova.tipo === "livre" || prova.tipo === "bonus") && (
                    <input
                      type="number"
                      value={item.valor}
                      onChange={(ev) => set(e.id, { valor: ev.target.value })}
                      placeholder={prova.tipo === "bonus" ? "Negativo = penalidade" : "Nota"}
                      className="w-full px-3 py-2 rounded-md text-sm"
                      style={{ background: C.papel, border: `1px solid ${C.linha}` }}
                    />
                  )}
                  {prova.tipo === "binaria" && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!item.valor} onChange={(ev) => set(e.id, { valor: ev.target.checked })} />
                      Cumpriu a prova
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {temPendencia && (
        <p className="text-xs mt-3" style={{ color: C.apito }}>
          Preencha o valor das equipes marcadas ou desmarque quem nao pontuou.
        </p>
      )}
      <Confirmar onClick={() => onSalvar(l)} texto="Lancar e atualizar placar" desabilitado={temPendencia} />
    </Modal>
  );
}

function DetalheEquipe({ equipe, provas, resultados, onFechar }) {
  const [verIntegrantes, setVerIntegrantes] = useState(false);
  const total = resultados.reduce((s, r) => s + r.pontos, 0);
  return (
    <Modal titulo={equipe.nome} onFechar={onFechar}>
      <div className="rounded-lg p-4 mb-4 flex items-baseline justify-between" style={{ background: equipe.cor, color: C.papel }}>
        <span className="rotulo">Total</span>
        <span className="placar text-3xl">{total}</span>
      </div>

      <button
        onClick={() => setVerIntegrantes(!verIntegrantes)}
        className="rotulo flex items-center gap-1 mb-2"
        style={{ color: C.fraco }}
        disabled={equipe.integrantes.length === 0}
      >
        Integrantes ({equipe.integrantes.length})
        {equipe.integrantes.length > 0 && (verIntegrantes ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
      </button>
      {verIntegrantes && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {equipe.integrantes.length ? (
            [...equipe.integrantes]
              .sort((a, b) => (b.lider ? 1 : 0) - (a.lider ? 1 : 0))
              .map((i) => (
                <span key={i.id} className="px-2.5 py-1 rounded-full text-sm flex items-center gap-1" style={{ background: C.quadra }}>
                  {i.lider && <Crown size={12} fill={C.apito} style={{ color: C.apito }} />}
                  {i.nome}
                </span>
              ))
          ) : (
            <span className="text-sm" style={{ color: C.fraco }}>Nenhum integrante cadastrado.</span>
          )}
        </div>
      )}
      {!verIntegrantes && <div className="mb-5" />}

      <span className="rotulo block mb-2" style={{ color: C.fraco }}>Pontos por prova</span>
      {resultados.length === 0 ? (
        <p className="text-sm" style={{ color: C.fraco }}>A equipe ainda nao pontuou.</p>
      ) : (
        <div className="space-y-1">
          {resultados.map((r) => {
            const p = provas.find((x) => x.id === r.provaId);
            return (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-md text-sm" style={{ background: C.quadra }}>
                <span className="truncate">
                  {p?.nome ?? "Prova removida"}{r.posicao ? ` · ${r.posicao}o` : ""}
                </span>
                <span className="placar">{r.pontos > 0 ? "+" : ""}{r.pontos}</span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function FormLogin({ onEntrar, onFechar }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const tentar = async () => {
    if (!senha || carregando) return;
    setCarregando(true);
    setErro(false);
    const ok = await onEntrar(senha);
    setCarregando(false);
    if (ok) onFechar();
    else setErro(true);
  };

  return (
    <Modal titulo="Entrar como professor" onFechar={onFechar}>
      <p className="text-sm mb-4" style={{ color: C.fraco }}>
        Digite a senha de professor para lancar pontos e editar. Quem so quer ver o placar nao precisa entrar.
      </p>
      <label className="block mb-3">
        <span className="rotulo block mb-1.5" style={{ color: C.fraco }}>Senha</span>
        <input
          type="password"
          value={senha}
          autoFocus
          onChange={(e) => { setSenha(e.target.value); setErro(false); }}
          onKeyDown={(e) => e.key === "Enter" && tentar()}
          className="w-full px-3 py-2.5 rounded-md text-sm"
          style={{ background: C.quadra, border: `1px solid ${erro ? C.apito : C.linha}`, color: C.tinta }}
        />
      </label>
      {erro && (
        <p className="text-xs mb-3" style={{ color: C.apito }}>Senha incorreta.</p>
      )}
      <Confirmar onClick={tentar} texto={carregando ? "Entrando..." : "Entrar"} desabilitado={!senha || carregando} />
    </Modal>
  );
}
