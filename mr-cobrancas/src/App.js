import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL = "https://nzzimacvelxzstarwqty.supabase.co";
const SUPABASE_KEY = "sb_publishable_8CYgd-tfvqnCo_O8XCuQhw_mMJmeCZr";

async function sb(path, method="GET", body=null, extra="") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method==="POST" ? "return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const dbGet    = (t, q="")      => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
const dbInsert = (t, b)          => sb(t, "POST",   b);
const dbUpdate = (t, id, b)      => sb(t, "PATCH",  b, `?id=eq.${id}`);
const dbDelete = (t, id)         => sb(t, "DELETE", null, `?id=eq.${id}`);

// ─── USERS locais (auth simples) ─────────────────────────────
const USERS = [
  { id:1, nome:"Advair Freitas Vieira", oab:"OAB/GO 39.275", email:"advair@mrcobrancas.com.br", senha:"mr2024", role:"admin" },
  { id:2, nome:"Pavel Andrey Rocha",    oab:"OAB/GO 29.214", email:"pavel@mrcobrancas.com.br",  senha:"mr2024", role:"advogado" },
];

// ─── FONT ────────────────────────────────────────────────────
const FontLink = () => (
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Mulish:wght@400;500;600;700&display=swap" rel="stylesheet" />
);

// ─── HELPERS ────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const phoneFmt = p => p ? p.replace(/\D/g, "") : "";

// ─── MONETARY CORRECTION ────────────────────────────────────
// Índices mensais aproximados (% ao mês) — base histórica simplificada
const IGPM_MENSAL = 0.45; // % ao mês médio
const IPCA_MENSAL = 0.38;
const SELIC_MENSAL = 0.80;

function calcCorrecao({ valorOriginal, dataVencimento, indexador, jurosAM, multa }) {
  if (!valorOriginal || !dataVencimento) return null;
  const inicio = new Date(dataVencimento + "T12:00:00");
  const hoje = new Date();
  const meses = Math.max(0, (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth()));
  const dias = Math.max(0, Math.floor((hoje - inicio) / 86400000));

  const taxaMensal = indexador === "igpm" ? IGPM_MENSAL : indexador === "ipca" ? IPCA_MENSAL : SELIC_MENSAL;
  const correcao = valorOriginal * (Math.pow(1 + taxaMensal / 100, meses) - 1);
  const juros = valorOriginal * (jurosAM / 100) * meses;
  const multaVal = valorOriginal * (multa / 100);
  const total = valorOriginal + correcao + juros + multaVal;

  return { valorOriginal, correcao, juros: juros, multa: multaVal, total, meses, dias };
}

// ─── ICONS ──────────────────────────────────────────────────
const I = {
  dash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  dev: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  cred: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  proc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  regua: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  calc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="10" x2="8" y2="10"/><line x1="16" y1="14" x2="8" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>,
  rel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px]"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  wp: <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  dl: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── BADGE ───────────────────────────────────────────────────
function Badge({ s }) {
  const m = { ativo:["#dcfce7","#15803d"], negociando:["#fef9c3","#a16207"], pago:["#dbeafe","#1d4ed8"], inativo:["#f1f5f9","#64748b"], em_andamento:["#ede9fe","#6d28d9"], aguardando:["#ffedd5","#c2410c"], encerrado:["#f1f5f9","#64748b"], concluido:["#dcfce7","#15803d"], pendente:["#f1f5f9","#94a3b8"] };
  const lbl = { ativo:"Ativo", negociando:"Negociando", pago:"Pago", inativo:"Inativo", em_andamento:"Em Andamento", aguardando:"Aguardando", encerrado:"Encerrado", concluido:"Concluído", pendente:"Pendente" };
  const [bg, color] = m[s] || ["#f1f5f9","#64748b"];
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99 }}>{lbl[s] || s}</span>;
}

// ─── MODAL ───────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,.55)" }}>
      <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth: wide ? 800 : 640,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:"1px solid #f1f5f9" }}>
          <span style={{ fontFamily:"Syne",fontWeight:700,fontSize:17,color:"#0f172a" }}>{title}</span>
          <button onClick={onClose} style={{ padding:6,borderRadius:8,border:"none",background:"#f1f5f9",cursor:"pointer",display:"flex" }}>{I.x}</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── INPUT ───────────────────────────────────────────────────
function Inp({ label, value, onChange, type="text", options, span, placeholder="" }) {
  const s = { width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"Mulish",outline:"none",boxSizing:"border-box" };
  return (
    <div style={{ gridColumn: span === 2 ? "1/-1" : "auto" }}>
      <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#475569",marginBottom:5 }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={s}>
          {options.map(o => <option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={s} />
      )}
    </div>
  );
}

// ─── BTN ─────────────────────────────────────────────────────
function Btn({ children, onClick, color="#4f46e5", sm, outline, danger }) {
  const bg = danger ? "#dc2626" : outline ? "transparent" : color;
  const tc = outline ? color : "#fff";
  const border = outline ? `1.5px solid ${color}` : "none";
  return (
    <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:6,background:bg,color:tc,border,borderRadius:10,padding: sm ? "6px 14px" : "9px 18px",fontSize: sm ? 12 : 13,fontWeight:700,cursor:"pointer",fontFamily:"Mulish",whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("advair@mrcobrancas.com.br");
  const [senha, setSenha] = useState("mr2024");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true); setErr("");
    setTimeout(() => {
      const user = MOCK.users.find(u => u.email === email && u.senha === senha);
      if (user) onLogin(user);
      else { setErr("E-mail ou senha incorretos."); setLoading(false); }
    }, 700);
  }

  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",fontFamily:"Mulish",position:"relative",overflow:"hidden" }}>
      <FontLink />
      {/* bg pattern */}
      <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 25% 25%, rgba(99,102,241,.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139,92,246,.1) 0%, transparent 50%)" }} />

      <div style={{ background:"rgba(255,255,255,.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:48,width:"100%",maxWidth:420,position:"relative" }}>
        {/* Logo */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:36 }}>
          <div style={{ width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:18 }}>MR</span>
          </div>
          <div>
            <div style={{ fontFamily:"Syne",fontWeight:800,color:"#fff",fontSize:20,lineHeight:1.1 }}>MR Cobranças</div>
            <div style={{ color:"rgba(255,255,255,.5)",fontSize:12 }}>CRM Jurídico</div>
          </div>
        </div>

        <h1 style={{ fontFamily:"Syne",fontWeight:700,color:"#fff",fontSize:26,marginBottom:6 }}>Entrar</h1>
        <p style={{ color:"rgba(255,255,255,.5)",fontSize:13,marginBottom:28 }}>Acesse sua conta para continuar</p>

        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,display:"block",marginBottom:6 }}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com"
              style={{ width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"Mulish" }} />
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,display:"block",marginBottom:6 }}>Senha</label>
            <input value={senha} onChange={e => setSenha(e.target.value)} type="password" placeholder="••••••••"
              style={{ width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"Mulish" }}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {err && <p style={{ color:"#f87171",fontSize:12,textAlign:"center" }}>{err}</p>}
          <button onClick={handleLogin} disabled={loading}
            style={{ marginTop:8,padding:"12px",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Syne",opacity: loading ? .7 : 1 }}>
            {loading ? "Verificando..." : "Acessar sistema →"}
          </button>
        </div>

        <p style={{ color:"rgba(255,255,255,.3)",fontSize:11,textAlign:"center",marginTop:24 }}>
          Demo: advair@mrcobrancas.com.br / mr2024
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({ devedores, processos, andamentos, user }) {
  const totalCarteira = devedores.reduce((s,d) => s+d.valor_original,0);
  const ativos = processos.filter(p => p.status==="em_andamento").length;
  const prazos7 = andamentos.filter(a => { if(!a.prazo) return false; const d=(new Date(a.prazo)-new Date())/86400000; return d>=0&&d<=7; }).length;

  const kpis = [
    { l:"Carteira Total", v: fmt(totalCarteira), sub:`${devedores.length} devedores`, g:"linear-gradient(135deg,#4f46e5,#6d28d9)" },
    { l:"Processos Ativos", v: ativos, sub:`${processos.length} total`, g:"linear-gradient(135deg,#d97706,#b45309)" },
    { l:"Prazos Críticos", v: prazos7, sub:"próximos 7 dias", g:"linear-gradient(135deg,#dc2626,#9f1239)" },
    { l:"Devedores Pagos", v: devedores.filter(d=>d.status==="pago").length, sub:"recuperados", g:"linear-gradient(135deg,#059669,#065f46)" },
  ];

  const fases = {}; processos.forEach(p => fases[p.fase]=(fases[p.fase]||0)+1);
  const proxPrazos = andamentos.filter(a=>a.prazo&&new Date(a.prazo)>=new Date()).sort((a,b)=>new Date(a.prazo)-new Date(b.prazo)).slice(0,4);

  return (
    <div>
      <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:24,color:"#0f172a",marginBottom:20 }}>
        Bom dia, {user.nome.split(" ")[0]}! 👋
      </h2>

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16,marginBottom:24 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:k.g,borderRadius:18,padding:"20px 22px",color:"#fff" }}>
            <p style={{ fontSize:12,opacity:.8,fontWeight:600,marginBottom:8 }}>{k.l}</p>
            <p style={{ fontSize:26,fontFamily:"Syne",fontWeight:800 }}>{k.v}</p>
            <p style={{ fontSize:11,opacity:.65,marginTop:4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        {/* Fases */}
        <div style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9" }}>
          <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16 }}>Processos por Fase</p>
          {Object.entries(fases).map(([fase,qtd]) => {
            const pct = Math.round(qtd/processos.length*100);
            return (
              <div key={fase} style={{ marginBottom:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"#475569",marginBottom:5 }}>
                  <span>{fase}</span><strong style={{ color:"#0f172a" }}>{qtd}</strong>
                </div>
                <div style={{ height:6,background:"#f1f5f9",borderRadius:99 }}>
                  <div style={{ height:6,width:`${pct}%`,background:"linear-gradient(90deg,#4f46e5,#7c3aed)",borderRadius:99 }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Prazos */}
        <div style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9" }}>
          <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#0f172a",marginBottom:16,display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ color:"#dc2626" }}>{I.alert}</span> Prazos Iminentes
          </p>
          {proxPrazos.length===0 && <p style={{ color:"#94a3b8",fontSize:13 }}>Nenhum prazo nos próximos dias.</p>}
          {proxPrazos.map(a => {
            const proc = processos.find(p=>p.id===a.processo_id);
            const diff = Math.ceil((new Date(a.prazo)-new Date())/86400000);
            return (
              <div key={a.id} style={{ display:"flex",gap:10,padding:"10px 12px",background:diff<=2?"#fef2f2":"#fafafa",borderRadius:12,marginBottom:8,borderLeft:`3px solid ${diff<=2?"#dc2626":"#f59e0b"}` }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13,fontWeight:600,color:"#0f172a",marginBottom:2 }}>{a.descricao.slice(0,45)}...</p>
                  <p style={{ fontSize:11,color:"#94a3b8" }}>{proc?.numero?.slice(0,20)}... · {fmtDate(a.prazo)}</p>
                </div>
                <span style={{ fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:99,background:diff<=2?"#fee2e2":"#fef3c7",color:diff<=2?"#dc2626":"#b45309",alignSelf:"center" }}>{diff}d</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEVEDORES — CRUD completo + parcelas + vínculo credor
// ═══════════════════════════════════════════════════════════════
function gerarParcelas(valorTotal, qtd, dataInicio) {
  const parcelas = [];
  for (let i = 0; i < qtd; i++) {
    const d = new Date(dataInicio + "T12:00:00");
    d.setMonth(d.getMonth() + i);
    parcelas.push({ id: i+1, numero: i+1, valor: Math.round(valorTotal/qtd*100)/100, vencimento: d.toISOString().slice(0,10), status:"pendente", data_pagamento:null });
  }
  return parcelas;
}

const FORM_VAZIO = { nome:"",cpf_cnpj:"",tipo:"PJ",telefone:"",email:"",cidade:"Goiânia",status:"ativo",valor_original:"",data_vencimento:"",credor_id:"",usar_parcelas:false,qtd_parcelas:"12",data_primeira_parcela:"" };

function Devedores({ devedores, setDevedores, credores }) {
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(false); // false | "novo" | "editar" | "ver"
  const [sel, setSel]         = useState(null);
  const [wp, setWp]           = useState(null);
  const [abaParcelas, setAba] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState(FORM_VAZIO);
  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  const filtered = devedores.filter(d =>
    d.nome.toLowerCase().includes(search.toLowerCase()) ||
    (d.cpf_cnpj||"").includes(search)
  );

  // ── SALVAR (novo ou editar) ──────────────────────────────────
  async function salvar() {
    setLoading(true);
    const valor = parseFloat(form.valor_original)||0;
    const parcelas = form.usar_parcelas && parseInt(form.qtd_parcelas)>0 && form.data_primeira_parcela
      ? gerarParcelas(valor, parseInt(form.qtd_parcelas), form.data_primeira_parcela)
      : [{id:1,numero:1,valor,vencimento:form.data_vencimento,status:"pendente",data_pagamento:null}];

    const payload = {
      nome: form.nome, cpf_cnpj: form.cpf_cnpj, tipo: form.tipo,
      telefone: form.telefone, email: form.email, cidade: form.cidade,
      status: form.status, valor_original: valor,
      data_vencimento: form.data_vencimento||null,
      credor_id: form.credor_id ? parseInt(form.credor_id) : null,
      parcelas: JSON.stringify(parcelas),
    };

    if (modal === "editar" && sel) {
      const res = await dbUpdate("devedores", sel.id, payload);
      const atualizado = Array.isArray(res) ? res[0] : res;
      if (atualizado) {
        const parsed = { ...atualizado, parcelas: typeof atualizado.parcelas==="string" ? JSON.parse(atualizado.parcelas) : (atualizado.parcelas||[]) };
        setDevedores(prev => prev.map(d => d.id===sel.id ? parsed : d));
        setSel(parsed);
      }
    } else {
      const res = await dbInsert("devedores", payload);
      const novo = Array.isArray(res) ? res[0] : res;
      if (novo) {
        const parsed = { ...novo, parcelas: typeof novo.parcelas==="string" ? JSON.parse(novo.parcelas) : (novo.parcelas||[]) };
        setDevedores(prev => [...prev, parsed]);
      }
    }
    setLoading(false);
    setModal(false);
  }

  // ── EXCLUIR ─────────────────────────────────────────────────
  async function excluir(d) {
    if (!window.confirm(`Excluir "${d.nome}"? Esta ação não pode ser desfeita.`)) return;
    await dbDelete("devedores", d.id);
    setDevedores(prev => prev.filter(x => x.id !== d.id));
    if (sel?.id === d.id) { setSel(null); setModal(false); }
  }

  // ── DAR BAIXA (status pago) ──────────────────────────────────
  async function darBaixa(d) {
    if (!window.confirm(`Confirmar baixa total para "${d.nome}"?`)) return;
    const parcelas = (d.parcelas||[]).map(p => ({ ...p, status:"pago", data_pagamento: new Date().toISOString().slice(0,10) }));
    const res = await dbUpdate("devedores", d.id, { status:"pago", parcelas: JSON.stringify(parcelas) });
    const atualizado = Array.isArray(res) ? res[0] : res;
    if (atualizado) {
      const parsed = { ...atualizado, parcelas: typeof atualizado.parcelas==="string" ? JSON.parse(atualizado.parcelas) : parcelas };
      setDevedores(prev => prev.map(x => x.id===d.id ? parsed : x));
    }
  }

  // ── PARCELA: toggle status ───────────────────────────────────
  async function toggleParcela(devId, parcId, novoStatus) {
    const dev = devedores.find(d=>d.id===devId);
    if (!dev) return;
    const parcelas = (dev.parcelas||[]).map(p =>
      p.id!==parcId ? p : { ...p, status:novoStatus, data_pagamento: novoStatus==="pago" ? new Date().toISOString().slice(0,10) : null }
    );
    const pagas = parcelas.filter(p=>p.status==="pago").length;
    const novoStatusDev = pagas===parcelas.length ? "pago" : pagas>0 ? "negociando" : "ativo";
    const res = await dbUpdate("devedores", devId, { status:novoStatusDev, parcelas: JSON.stringify(parcelas) });
    const atualizado = Array.isArray(res) ? res[0] : res;
    if (atualizado) {
      const parsed = { ...atualizado, parcelas };
      setDevedores(prev => prev.map(d => d.id===devId ? parsed : d));
      if (sel?.id===devId) setSel(parsed);
    }
  }

  // ── PARCELA: editar valor/vencimento ─────────────────────────
  function editarParcelaLocal(parcId, campo, valor) {
    setSel(prev => {
      if (!prev) return prev;
      return { ...prev, parcelas: (prev.parcelas||[]).map(p => p.id!==parcId ? p : { ...p, [campo]: campo==="valor"?parseFloat(valor)||0:valor }) };
    });
  }

  async function salvarParcelas() {
    if (!sel) return;
    const res = await dbUpdate("devedores", sel.id, { parcelas: JSON.stringify(sel.parcelas) });
    const atualizado = Array.isArray(res) ? res[0] : res;
    if (atualizado) {
      const parsed = { ...atualizado, parcelas: sel.parcelas };
      setDevedores(prev => prev.map(d => d.id===sel.id ? parsed : d));
      setSel(parsed);
    }
    alert("Parcelas salvas!");
  }

  // ── PARCELA: adicionar/remover ───────────────────────────────
  function adicionarParcela() {
    setSel(prev => {
      if (!prev) return prev;
      const parcelas = prev.parcelas||[];
      const ultima = parcelas[parcelas.length-1];
      const proxVenc = ultima ? (() => { const d=new Date(ultima.vencimento+"T12:00:00"); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,10); })() : new Date().toISOString().slice(0,10);
      return { ...prev, parcelas: [...parcelas, { id:Date.now(), numero:parcelas.length+1, valor:ultima?.valor||0, vencimento:proxVenc, status:"pendente", data_pagamento:null }] };
    });
  }

  function removerParcela(parcId) {
    setSel(prev => prev ? { ...prev, parcelas: (prev.parcelas||[]).filter(p=>p.id!==parcId) } : prev);
  }

  function abrirEditar(d) {
    const parc = d.parcelas||[];
    setForm({
      nome:d.nome, cpf_cnpj:d.cpf_cnpj||"", tipo:d.tipo||"PJ",
      telefone:d.telefone||"", email:d.email||"", cidade:d.cidade||"Goiânia",
      status:d.status||"ativo", valor_original:String(d.valor_original||""),
      data_vencimento:d.data_vencimento||"", credor_id:d.credor_id||"",
      usar_parcelas: parc.length>1, qtd_parcelas:String(parc.length||1),
      data_primeira_parcela: parc[0]?.vencimento||"",
    });
    setSel(d); setModal("editar");
  }

  const WP_MSGS = d => [
    { titulo:"Notificação de Débito", msg:`Prezado(a) *${d.nome}*, informamos que consta débito no valor de *${fmt(d.valor_original)}* referente a contrato imobiliário.\n\nSolicitamos contato para regularização.\n\n*MR Cobranças e Soluções*\n(62) 9 9999-0000` },
    { titulo:"Proposta de Acordo", msg:`Olá, *${d.nome.split(" ")[0]}*! Temos proposta especial para quitação do débito com condições facilitadas.\n\nEntre em contato até *${new Date(Date.now()+5*86400000).toLocaleDateString("pt-BR")}*.\n\n*MR Cobranças* | (62) 9 9999-0000` },
    { titulo:"Aviso Judicial", msg:`*AVISO IMPORTANTE — ${d.nome}*\n\nO débito de *${fmt(d.valor_original)}* foi encaminhado para cobrança judicial.\n\nAinda é possível acordo extrajudicial.\n\n*Escritório MR Cobranças e Soluções*` },
  ];

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
        <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a" }}>Devedores</h2>
        <Btn onClick={()=>{ setForm(FORM_VAZIO); setModal("novo"); }}>{I.plus} Novo Devedor</Btn>
      </div>

      <div style={{ position:"relative",marginBottom:14 }}>
        <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}>{I.search}</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nome ou CPF/CNPJ..." style={{ width:"100%",padding:"10px 12px 10px 36px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:13,fontFamily:"Mulish",outline:"none",boxSizing:"border-box" }} />
      </div>

      <div style={{ background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["Nome","CPF/CNPJ","Credor","Status","Valor Total","Parcelas","Ações"].map(h=>(
                  <th key={h} style={{ textAlign:"left",padding:"10px 14px",color:"#64748b",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const parcelas = d.parcelas||[];
                const pagas = parcelas.filter(p=>p.status==="pago").length;
                const atrasadas = parcelas.filter(p=>p.status==="atrasado"||(p.status==="pendente"&&new Date(p.vencimento+"T12:00:00")<new Date())).length;
                const credor = credores.find(c=>c.id===d.credor_id);
                return (
                  <tr key={d.id} style={{ borderTop:"1px solid #f8fafc" }}>
                    <td style={{ padding:"12px 14px",fontWeight:700,color:"#0f172a" }}>{d.nome}</td>
                    <td style={{ padding:"12px 14px",color:"#64748b",fontFamily:"monospace",fontSize:11 }}>{d.cpf_cnpj}</td>
                    <td style={{ padding:"12px 14px",fontSize:11,color:"#64748b" }}>{credor ? credor.nome.split(" ").slice(0,2).join(" ") : "—"}</td>
                    <td style={{ padding:"12px 14px" }}><Badge s={d.status}/></td>
                    <td style={{ padding:"12px 14px",fontWeight:700,color:"#4f46e5" }}>{fmt(d.valor_original)}</td>
                    <td style={{ padding:"12px 14px" }}>
                      {parcelas.length>0 ? (
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontSize:12,fontWeight:700 }}>{pagas}/{parcelas.length}</span>
                          <div style={{ width:50,height:5,background:"#f1f5f9",borderRadius:99 }}>
                            <div style={{ height:5,width:`${parcelas.length?pagas/parcelas.length*100:0}%`,background:"#22c55e",borderRadius:99 }}/>
                          </div>
                          {atrasadas>0 && <span style={{ fontSize:10,background:"#fee2e2",color:"#dc2626",padding:"1px 5px",borderRadius:99,fontWeight:700 }}>{atrasadas}!</span>}
                        </div>
                      ) : <span style={{ color:"#94a3b8",fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex",gap:4 }}>
                        <button onClick={()=>{ setSel(d); setAba(false); setModal("ver"); }} title="Ver detalhes" style={{ color:"#4f46e5",background:"#ede9fe",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>👁</button>
                        <button onClick={()=>abrirEditar(d)} title="Editar" style={{ color:"#d97706",background:"#fef9c3",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>✏️</button>
                        {d.telefone && <button onClick={()=>setWp(d)} title="WhatsApp" style={{ color:"#16a34a",background:"#dcfce7",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>📱</button>}
                        {d.status!=="pago" && <button onClick={()=>darBaixa(d)} title="Dar baixa total" style={{ color:"#059669",background:"#d1fae5",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>✓</button>}
                        <button onClick={()=>excluir(d)} title="Excluir" style={{ color:"#dc2626",background:"#fee2e2",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,fontWeight:700 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 14px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",fontSize:11,color:"#94a3b8",fontWeight:600 }}>
          {filtered.length} registros · {devedores.filter(d=>d.status==="pago").length} pagos · {devedores.filter(d=>d.status==="ativo").length} ativos
        </div>
      </div>

      {/* ── MODAL NOVO/EDITAR ── */}
      {(modal==="novo"||modal==="editar") && (
        <Modal title={modal==="editar"?"Editar Devedor":"Novo Devedor"} onClose={()=>setModal(false)} wide>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Inp label="Nome / Razão Social" value={form.nome} onChange={v=>F("nome",v)} span={2}/>
            <Inp label="CPF / CNPJ" value={form.cpf_cnpj} onChange={v=>F("cpf_cnpj",v)}/>
            <Inp label="Tipo" value={form.tipo} onChange={v=>F("tipo",v)} options={["PF","PJ"]}/>
            <Inp label="Telefone (WhatsApp)" value={form.telefone} onChange={v=>F("telefone",v)} placeholder="62999990000"/>
            <Inp label="E-mail" value={form.email} onChange={v=>F("email",v)} type="email"/>
            <Inp label="Cidade" value={form.cidade} onChange={v=>F("cidade",v)}/>
            <Inp label="Status" value={form.status} onChange={v=>F("status",v)} options={["ativo","negociando","pago","inativo"]}/>
            <Inp label="Credor Vinculado" value={form.credor_id} onChange={v=>F("credor_id",v)} options={[{v:"",l:"— Nenhum —"},...credores.map(c=>({v:c.id,l:c.nome}))]}/>
            <Inp label="Valor Total da Dívida (R$)" value={form.valor_original} onChange={v=>F("valor_original",v)} type="number" span={2}/>
          </div>

          {/* Parcelamento */}
          <div style={{ margin:"16px 0 12px",padding:16,background:"#f8fafc",borderRadius:12,border:"1.5px solid #e2e8f0" }}>
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:form.usar_parcelas?14:0 }}>
              <input type="checkbox" checked={form.usar_parcelas} onChange={e=>F("usar_parcelas",e.target.checked)} style={{ width:16,height:16,accentColor:"#4f46e5",cursor:"pointer" }}/>
              <span style={{ fontWeight:700,fontSize:14,color:"#0f172a" }}>Parcelar a dívida</span>
              <span style={{ fontSize:12,color:"#94a3b8" }}>gera parcelas automaticamente</span>
            </label>
            {form.usar_parcelas ? (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:4 }}>
                <Inp label="Número de Parcelas" value={form.qtd_parcelas} onChange={v=>F("qtd_parcelas",v)} type="number"/>
                <Inp label="Data da 1ª Parcela" value={form.data_primeira_parcela} onChange={v=>F("data_primeira_parcela",v)} type="date"/>
                {form.qtd_parcelas>0 && form.valor_original && (
                  <div style={{ gridColumn:"1/-1",background:"#ede9fe",borderRadius:8,padding:"8px 12px",fontSize:13 }}>
                    <b style={{ color:"#4f46e5" }}>{form.qtd_parcelas}x de {fmt((parseFloat(form.valor_original)||0)/parseInt(form.qtd_parcelas||1))}</b>
                    <span style={{ color:"#6d28d9",marginLeft:8 }}>= {fmt(parseFloat(form.valor_original)||0)} total</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop:10 }}>
                <Inp label="Data de Vencimento (parcela única)" value={form.data_vencimento} onChange={v=>F("data_vencimento",v)} type="date"/>
              </div>
            )}
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <Btn onClick={salvar}>{loading?"Salvando...": modal==="editar"?"Salvar Alterações":"Cadastrar Devedor"}</Btn>
            <Btn onClick={()=>setModal(false)} outline>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* ── MODAL VER/PARCELAS ── */}
      {modal==="ver" && sel && (
        <Modal title={sel.nome} onClose={()=>setModal(false)} wide>
          <div style={{ display:"flex",gap:6,marginBottom:18,borderBottom:"2px solid #f1f5f9",paddingBottom:0 }}>
            {["Dados","Parcelas"].map((aba,i)=>(
              <button key={aba} onClick={()=>setAba(i===1)}
                style={{ padding:"8px 18px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:13,color:(i===1)===abaParcelas?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${(i===1)===abaParcelas?"#4f46e5":"transparent"}`,marginBottom:-2 }}>
                {aba}{i===1&&sel.parcelas?` (${sel.parcelas.length})`:""}
              </button>
            ))}
          </div>

          {!abaParcelas && (
            <div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:13,marginBottom:16 }}>
                {[["Nome",sel.nome],["CPF/CNPJ",sel.cpf_cnpj],["Tipo",sel.tipo],["Cidade",sel.cidade],["Telefone",sel.telefone],["E-mail",sel.email],["Credor",credores.find(c=>c.id===sel.credor_id)?.nome||"—"]].map(([k,v])=>(
                  <div key={k} style={{ padding:"10px 14px",background:"#f8fafc",borderRadius:10 }}>
                    <p style={{ fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:2 }}>{k}</p>
                    <p style={{ fontWeight:600,color:"#0f172a",fontSize:12 }}>{v||"—"}</p>
                  </div>
                ))}
                <div style={{ padding:"10px 14px",background:"#ede9fe",borderRadius:10 }}>
                  <p style={{ fontSize:11,color:"#6d28d9",fontWeight:700,marginBottom:2 }}>Valor Total</p>
                  <p style={{ fontWeight:800,color:"#4f46e5",fontSize:16 }}>{fmt(sel.valor_original)}</p>
                </div>
                <div style={{ padding:"10px 14px",background:"#f0fdf4",borderRadius:10 }}>
                  <p style={{ fontSize:11,color:"#15803d",fontWeight:700,marginBottom:2 }}>Valor Pago</p>
                  <p style={{ fontWeight:800,color:"#16a34a",fontSize:16 }}>{fmt((sel.parcelas||[]).filter(p=>p.status==="pago").reduce((s,p)=>s+p.valor,0))}</p>
                </div>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <Btn onClick={()=>abrirEditar(sel)}>✏️ Editar</Btn>
                {sel.status!=="pago"&&<Btn onClick={()=>darBaixa(sel)} color="#059669">✓ Dar Baixa Total</Btn>}
                <Btn onClick={()=>excluir(sel)} danger>🗑 Excluir</Btn>
              </div>
            </div>
          )}

          {abaParcelas && (
            <div>
              {/* Resumo */}
              {(()=>{
                const p=sel.parcelas||[];
                const pagas=p.filter(x=>x.status==="pago").length;
                const atrasadas=p.filter(x=>x.status==="atrasado"||(x.status==="pendente"&&new Date(x.vencimento+"T12:00:00")<new Date())).length;
                const pct=p.length?(pagas/p.length*100).toFixed(0):0;
                return(<>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12 }}>
                    {[["Total",p.length,"#4f46e5","#ede9fe"],["Pagas",pagas,"#16a34a","#f0fdf4"],["Atrasadas",atrasadas,"#dc2626","#fef2f2"],["Pendentes",p.length-pagas-atrasadas,"#d97706","#fefce8"]].map(([l,v,c,bg])=>(
                      <div key={l} style={{ background:bg,borderRadius:10,padding:"8px 10px",textAlign:"center" }}>
                        <p style={{ fontSize:10,color:c,fontWeight:700,marginBottom:2 }}>{l}</p>
                        <p style={{ fontFamily:"Syne",fontWeight:800,fontSize:20,color:c }}>{v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4 }}>
                      <span>Progresso</span><b style={{ color:"#16a34a" }}>{pct}%</b>
                    </div>
                    <div style={{ height:7,background:"#f1f5f9",borderRadius:99 }}>
                      <div style={{ height:7,width:`${pct}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:99 }}/>
                    </div>
                  </div>
                </>);
              })()}

              {/* Tabela de parcelas editável */}
              <div style={{ maxHeight:300,overflowY:"auto",marginBottom:12,border:"1px solid #f1f5f9",borderRadius:12,overflow:"hidden" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["Nº","Valor (R$)","Vencimento","Status","Pago em","Ações"].map(h=>(
                        <th key={h} style={{ padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:700,fontSize:10,textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(sel.parcelas||[]).map((p,idx)=>{
                      const atrasada = p.status==="pendente" && new Date(p.vencimento+"T12:00:00")<new Date();
                      const sReal = atrasada ? "atrasado" : p.status;
                      const corStatus = { pago:"#16a34a",atrasado:"#dc2626",negociando:"#d97706",pendente:"#64748b" };
                      const bgStatus  = { pago:"#dcfce7",atrasado:"#fee2e2",negociando:"#fef9c3",pendente:"#f1f5f9" };
                      return(
                        <tr key={p.id} style={{ borderTop:"1px solid #f8fafc",background:sReal==="atrasado"?"#fff9f9":sReal==="pago"?"#f9fffe":"#fff" }}>
                          <td style={{ padding:"7px 10px",fontWeight:700,color:"#0f172a" }}>{idx+1}</td>
                          <td style={{ padding:"7px 10px" }}>
                            <input type="number" value={p.valor} onChange={e=>editarParcelaLocal(p.id,"valor",e.target.value)}
                              style={{ width:85,padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:12,fontWeight:700,color:"#4f46e5",outline:"none" }}/>
                          </td>
                          <td style={{ padding:"7px 10px" }}>
                            <input type="date" value={p.vencimento} onChange={e=>editarParcelaLocal(p.id,"vencimento",e.target.value)}
                              style={{ padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:11,outline:"none" }}/>
                          </td>
                          <td style={{ padding:"7px 10px" }}>
                            <span style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:bgStatus[sReal],color:corStatus[sReal] }}>
                              {sReal==="pago"?"Pago":sReal==="atrasado"?"Atrasado":sReal==="negociando"?"Negociando":"Pendente"}
                            </span>
                          </td>
                          <td style={{ padding:"7px 10px",color:"#94a3b8",fontSize:11 }}>{fmtDate(p.data_pagamento)}</td>
                          <td style={{ padding:"7px 10px" }}>
                            <div style={{ display:"flex",gap:3 }}>
                              {p.status!=="pago"&&<button onClick={()=>toggleParcela(sel.id,p.id,"pago")} style={{ background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10,fontWeight:700 }}>✓</button>}
                              {p.status==="pago"&&<button onClick={()=>toggleParcela(sel.id,p.id,"pendente")} style={{ background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontSize:10 }}>↩</button>}
                              <button onClick={()=>removerParcela(p.id)} style={{ background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:5,padding:"3px 6px",cursor:"pointer",fontSize:11 }}>✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <Btn onClick={adicionarParcela} outline>{I.plus} Parcela</Btn>
                <Btn onClick={salvarParcelas} color="#059669">💾 Salvar Parcelas</Btn>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── MODAL WHATSAPP ── */}
      {wp && (
        <Modal title={`WhatsApp — ${wp.nome}`} onClose={()=>setWp(null)}>
          {WP_MSGS(wp).map((m,i)=>(
            <div key={i} style={{ border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:10 }}>
              <p style={{ fontWeight:700,color:"#0f172a",fontSize:13,marginBottom:8 }}>{m.titulo}</p>
              <p style={{ fontSize:11,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#f8fafc",padding:10,borderRadius:8,marginBottom:10 }}>{m.msg}</p>
              <a href={`https://wa.me/55${phoneFmt(wp.telefone)}?text=${encodeURIComponent(m.msg)}`} target="_blank" rel="noreferrer"
                style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#16a34a",color:"#fff",borderRadius:9,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none" }}>
                {I.wp} Abrir no WhatsApp
              </a>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// CREDORES
// ═══════════════════════════════════════════════════════════════
function Credores({ credores, setCredores }) {
  const [modal,setModal] = useState(false);
  const [form,setForm] = useState({ nome:"",cpf_cnpj:"",tipo:"PJ",responsavel:"",contato:"",ativo:true });
  const F = (k,v) => setForm(f=>({...f,[k]:v}));
  function save() { setCredores(p=>[...p,{...form,id:Date.now()}]); setModal(false); }

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
        <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a" }}>Credores</h2>
        <Btn onClick={()=>setModal(true)}>{I.plus} Novo Credor</Btn>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
        {credores.map(c=>(
          <div key={c.id} style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9",borderTop:`4px solid ${c.ativo?"#4f46e5":"#e2e8f0"}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
              <div>
                <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a" }}>{c.nome}</p>
                <p style={{ fontSize:11,color:"#94a3b8",fontFamily:"monospace",marginTop:2 }}>{c.cpf_cnpj}</p>
              </div>
              <span style={{ fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,background:c.ativo?"#ede9fe":"#f1f5f9",color:c.ativo?"#6d28d9":"#94a3b8" }}>{c.ativo?"Ativo":"Inativo"}</span>
            </div>
            <div style={{ fontSize:12,color:"#64748b",display:"flex",flexDirection:"column",gap:5 }}>
              <span><b>Tipo:</b> {c.tipo}</span>
              <span><b>Responsável:</b> {c.responsavel}</span>
              <span><b>Contato:</b> {c.contato}</span>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Novo Credor" onClose={()=>setModal(false)}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Inp label="Nome / Razão Social" value={form.nome} onChange={v=>F("nome",v)} span={2} />
            <Inp label="CPF / CNPJ" value={form.cpf_cnpj} onChange={v=>F("cpf_cnpj",v)} />
            <Inp label="Tipo" value={form.tipo} onChange={v=>F("tipo",v)} options={["PF","PJ"]} />
            <Inp label="Responsável" value={form.responsavel} onChange={v=>F("responsavel",v)} />
            <Inp label="Contato" value={form.contato} onChange={v=>F("contato",v)} />
          </div>
          <div style={{ display:"flex",gap:10,marginTop:20 }}>
            <Btn onClick={save}>Salvar</Btn>
            <Btn onClick={()=>setModal(false)} outline>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROCESSOS
// ═══════════════════════════════════════════════════════════════
function Processos({ processos, setProcessos, devedores, credores, andamentos, setAndamentos }) {
  const [search,setSearch] = useState("");
  const [modal,setModal] = useState(false);
  const [sel,setSel] = useState(null);
  const [andForm,setAndForm] = useState({ tipo:"Petição",descricao:"",data:new Date().toISOString().slice(0,10),prazo:"" });
  const [form,setForm] = useState({ numero:"",devedor_id:"",credor_id:"",tipo:"Cumprimento de Sentença",fase:"Citação",valor:"",status:"em_andamento",tribunal:"TJGO",vara:"",proximo_prazo:"" });
  const F = (k,v)=>setForm(f=>({...f,[k]:v}));

  const filtered = processos.filter(p => p.numero.includes(search)||(devedores.find(d=>d.id===p.devedor_id)?.nome||"").toLowerCase().includes(search.toLowerCase()));

  function save() {
    const dev=devedores.find(d=>d.id==form.devedor_id), cred=credores.find(c=>c.id==form.credor_id);
    setProcessos(p=>[...p,{...form,id:Date.now(),valor:parseFloat(form.valor)||0}]);
    setModal(false);
  }

  function addAnd() {
    setAndamentos(p=>[...p,{...andForm,id:Date.now(),processo_id:sel.id,usuario:"Advair"}]);
    setAndForm({ tipo:"Petição",descricao:"",data:new Date().toISOString().slice(0,10),prazo:"" });
  }

  const TIPOS=["Cumprimento de Sentença","Execução de Título","Agravo de Instrumento","Agravo Interno","Recurso Especial","Ação de Cobrança","Ação de Despejo"];
  const FASES=["Citação","Contestação","Instrução","Sentença","Recurso","Penhora","Avaliação","Leilão","Pagamento","Encerrado"];
  const TIPOS_AND=["Petição","Decisão","Despacho","Citação","Penhora","Audiência","Recurso","Pagamento","Outro"];

  const procAnds = sel ? andamentos.filter(a=>a.processo_id===sel.id).sort((a,b)=>new Date(b.data)-new Date(a.data)) : [];

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
        <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a" }}>Processos</h2>
        <Btn onClick={()=>setModal(true)}>{I.plus} Novo Processo</Btn>
      </div>
      <div style={{ position:"relative",marginBottom:14 }}>
        <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#94a3b8" }}>{I.search}</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar número ou devedor..." style={{ width:"100%",padding:"10px 12px 10px 36px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish" }} />
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {filtered.map(p => {
          const dev = devedores.find(d=>d.id===p.devedor_id);
          const cred = credores.find(c=>c.id===p.credor_id);
          const diff = p.proximo_prazo ? Math.ceil((new Date(p.proximo_prazo)-new Date())/86400000) : null;
          return (
            <div key={p.id} style={{ background:"#fff",borderRadius:16,padding:18,border:"1px solid #f1f5f9",borderLeft:`4px solid ${p.status==="em_andamento"?"#4f46e5":p.status==="aguardando"?"#d97706":"#64748b"}` }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
                <div>
                  <p style={{ fontFamily:"monospace",fontSize:12,color:"#4f46e5",fontWeight:700 }}>{p.numero}</p>
                  <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#0f172a",marginTop:2 }}>{dev?.nome||"—"}</p>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <Badge s={p.status}/>
                  <button onClick={()=>setSel(p)} style={{ color:"#94a3b8",background:"none",border:"none",cursor:"pointer",display:"flex" }}>{I.eye}</button>
                </div>
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:"6px 20px",fontSize:12,color:"#64748b" }}>
                <span><b style={{ color:"#94a3b8" }}>Tipo:</b> {p.tipo}</span>
                <span><b style={{ color:"#94a3b8" }}>Fase:</b> <b style={{ color:"#0f172a" }}>{p.fase}</b></span>
                <span><b style={{ color:"#94a3b8" }}>Valor:</b> <b style={{ color:"#4f46e5" }}>{fmt(p.valor)}</b></span>
                <span><b style={{ color:"#94a3b8" }}>Credor:</b> {cred?.nome?.split(" ")[0]||"—"}</span>
                {diff!==null && <span style={{ color: diff<=3?"#dc2626":"#d97706",fontWeight:700 }}>⚑ Prazo: {fmtDate(p.proximo_prazo)} ({diff}d)</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal novo */}
      {modal && (
        <Modal title="Novo Processo" onClose={()=>setModal(false)}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Inp label="Número do Processo" value={form.numero} onChange={v=>F("numero",v)} placeholder="0000000-00.0000.8.09.0000" span={2} />
            <Inp label="Devedor" value={form.devedor_id} onChange={v=>F("devedor_id",v)} options={[{v:"",l:"Selecione..."},...devedores.map(d=>({v:d.id,l:d.nome}))]} />
            <Inp label="Credor" value={form.credor_id} onChange={v=>F("credor_id",v)} options={[{v:"",l:"Selecione..."},...credores.map(c=>({v:c.id,l:c.nome}))]} />
            <Inp label="Tipo" value={form.tipo} onChange={v=>F("tipo",v)} options={TIPOS} />
            <Inp label="Fase" value={form.fase} onChange={v=>F("fase",v)} options={FASES} />
            <Inp label="Valor (R$)" value={form.valor} onChange={v=>F("valor",v)} type="number" />
            <Inp label="Próximo Prazo" value={form.proximo_prazo} onChange={v=>F("proximo_prazo",v)} type="date" />
            <Inp label="Tribunal" value={form.tribunal} onChange={v=>F("tribunal",v)} />
            <Inp label="Vara / Câmara" value={form.vara} onChange={v=>F("vara",v)} span={2} />
          </div>
          <div style={{ display:"flex",gap:10,marginTop:20 }}>
            <Btn onClick={save}>Salvar</Btn>
            <Btn onClick={()=>setModal(false)} outline>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal detalhes */}
      {sel && (
        <Modal title={`Processo ${sel.numero}`} onClose={()=>setSel(null)} wide>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:14,background:"#f8fafc",borderRadius:12,marginBottom:20,fontSize:13 }}>
            {[["Devedor",devedores.find(d=>d.id===sel.devedor_id)?.nome],["Credor",credores.find(c=>c.id===sel.credor_id)?.nome],["Tipo",sel.tipo],["Fase",sel.fase],["Valor",fmt(sel.valor)],["Vara",sel.vara]].map(([k,v])=>(
              <div key={k}><span style={{ color:"#94a3b8",fontSize:11 }}>{k}:</span> <b style={{ color:"#0f172a" }}>{v}</b></div>
            ))}
          </div>

          <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:12 }}>Andamentos</p>
          <div style={{ maxHeight:220,overflowY:"auto",marginBottom:16,display:"flex",flexDirection:"column",gap:8 }}>
            {procAnds.length===0 && <p style={{ fontSize:13,color:"#94a3b8" }}>Nenhum andamento registrado.</p>}
            {procAnds.map(a=>(
              <div key={a.id} style={{ display:"flex",gap:10,padding:12,background:"#f8fafc",borderRadius:12 }}>
                <div style={{ width:8,height:8,borderRadius:99,background:"#4f46e5",marginTop:5,flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:2 }}>
                    <span style={{ fontSize:12,fontWeight:700,color:"#4f46e5" }}>{a.tipo}</span>
                    <span style={{ fontSize:11,color:"#94a3b8" }}>{fmtDate(a.data)}</span>
                  </div>
                  <p style={{ fontSize:13,color:"#0f172a" }}>{a.descricao}</p>
                  {a.prazo && <p style={{ fontSize:11,color:"#dc2626",marginTop:3 }}>⚑ Prazo: {fmtDate(a.prazo)}</p>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:"1px solid #f1f5f9",paddingTop:16 }}>
            <p style={{ fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:10 }}>Registrar Andamento</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <Inp label="Tipo" value={andForm.tipo} onChange={v=>setAndForm(f=>({...f,tipo:v}))} options={TIPOS_AND} />
              <Inp label="Data" value={andForm.data} onChange={v=>setAndForm(f=>({...f,data:v}))} type="date" />
              <Inp label="Descrição" value={andForm.descricao} onChange={v=>setAndForm(f=>({...f,descricao:v}))} span={2} placeholder="Descreva o andamento..." />
              <Inp label="Prazo (opcional)" value={andForm.prazo} onChange={v=>setAndForm(f=>({...f,prazo:v}))} type="date" />
            </div>
            <div style={{ marginTop:12 }}><Btn onClick={addAnd}>{I.plus} Registrar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RÉGUA
// ═══════════════════════════════════════════════════════════════
function Regua({ processos, devedores, regua, setRegua }) {
  const [selId, setSelId] = useState(processos[0]?.id||null);
  const proc = processos.find(p=>p.id===selId);
  const etapas = regua.filter(r=>r.processo_id===selId);
  const ETAPAS_PAD = ["Notificação Extrajudicial","Protesto","Negativação SPC/Serasa","Ajuizamento","Citação/Penhora","Avaliação/Perícia","Leilão/Adjudicação","Recurso","Pagamento/Encerramento"];

  function addEtapa(et) {
    if(etapas.find(e=>e.etapa===et)) return;
    setRegua(r=>[...r,{id:Date.now(),processo_id:selId,etapa:et,status:"pendente",data_realizada:null}]);
  }
  function toggle(id) {
    setRegua(r=>r.map(e => {
      if(e.id!==id) return e;
      const ns = e.status==="pendente"?"em_andamento":e.status==="em_andamento"?"concluido":"pendente";
      return {...e,status:ns,data_realizada:ns==="concluido"?new Date().toISOString().slice(0,10):null};
    }));
  }

  const colors = { pendente:"#e2e8f0", em_andamento:"#fbbf24", concluido:"#22c55e" };

  return (
    <div>
      <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:18 }}>Régua de Cobrança</h2>
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12,fontWeight:700,color:"#64748b",display:"block",marginBottom:6 }}>Selecionar Processo</label>
        <select value={selId||""} onChange={e=>setSelId(parseInt(e.target.value))}
          style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:12,fontSize:13,outline:"none",fontFamily:"Mulish" }}>
          {processos.map(p=><option key={p.id} value={p.id}>{p.numero} — {devedores.find(d=>d.id===p.devedor_id)?.nome}</option>)}
        </select>
      </div>

      {proc && (
        <div style={{ background:"#fff",borderRadius:18,padding:24,border:"1px solid #f1f5f9" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
            <div>
              <p style={{ fontFamily:"monospace",fontSize:12,color:"#4f46e5",fontWeight:700 }}>{proc.numero}</p>
              <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:16,color:"#0f172a" }}>{devedores.find(d=>d.id===proc.devedor_id)?.nome}</p>
            </div>
            <span style={{ fontFamily:"Syne",fontWeight:800,fontSize:18,color:"#4f46e5" }}>{fmt(proc.valor)}</span>
          </div>

          {/* Timeline visual */}
          <div style={{ position:"relative",paddingLeft:32 }}>
            {etapas.length===0 && <p style={{ fontSize:13,color:"#94a3b8" }}>Adicione etapas abaixo.</p>}
            {etapas.map((e,i)=>(
              <div key={e.id} style={{ position:"relative",marginBottom:16 }}>
                {/* linha */}
                {i < etapas.length-1 && <div style={{ position:"absolute",left:-20,top:16,bottom:-16,width:2,background:"#f1f5f9" }} />}
                {/* círculo */}
                <div onClick={()=>toggle(e.id)}
                  style={{ position:"absolute",left:-24,top:6,width:12,height:12,borderRadius:99,background:colors[e.status],cursor:"pointer",border:"2px solid #fff",boxShadow:"0 0 0 2px "+colors[e.status] }} />
                <div style={{ padding:"10px 14px",background:e.status==="concluido"?"#f0fdf4":e.status==="em_andamento"?"#fefce8":"#f8fafc",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:13,fontWeight:600,color:e.status==="concluido"?"#15803d":"#0f172a",textDecoration:e.status==="concluido"?"line-through":"none" }}>{e.etapa}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    {e.data_realizada && <span style={{ fontSize:11,color:"#22c55e" }}>✓ {fmtDate(e.data_realizada)}</span>}
                    <Badge s={e.status}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:"1px solid #f1f5f9",paddingTop:16,marginTop:8 }}>
            <p style={{ fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".05em",marginBottom:10 }}>+ Adicionar Etapa</p>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {ETAPAS_PAD.filter(ep=>!etapas.find(e=>e.etapa===ep)).map(ep=>(
                <button key={ep} onClick={()=>addEtapa(ep)}
                  style={{ fontSize:11,fontWeight:700,background:"#f1f5f9",color:"#475569",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer" }}>
                  + {ep}
                </button>
              ))}
            </div>
            <p style={{ fontSize:11,color:"#94a3b8",marginTop:10 }}>💡 Clique no círculo para avançar o status da etapa</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALCULADORA — Atualização Monetária + Honorários
// ═══════════════════════════════════════════════════════════════
function Calculadora({ devedores }) {
  const [aba, setAba]                   = useState("correcao"); // "correcao" | "honorarios"
  const [devId, setDevId]               = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [indexador, setIndexador]       = useState("igpm");
  const [jurosAM, setJurosAM]           = useState("1");
  const [multa, setMulta]               = useState("2");
  const [resultado, setResultado]       = useState(null);

  // Honorários
  const [baseCalculo, setBaseCalculo]   = useState("total_atualizado"); // "divida_original" | "total_atualizado" | "personalizado"
  const [valorBase, setValorBase]       = useState("");
  const [tipoHonorario, setTipoHonorario] = useState("percentual"); // "percentual" | "fixo"
  const [percentual, setPercentual]     = useState("20");
  const [valorFixo, setValorFixo]       = useState("");
  const [faseProcessual, setFaseProcessual] = useState("extrajudicial");
  const [resultadoHon, setResultadoHon] = useState(null);

  function loadDev(id) {
    setDevId(id);
    const d = devedores.find(x=>x.id==id);
    if(d) {
      setValorOriginal(String(d.valor_original));
      setDataVencimento(d.data_vencimento||"");
    }
  }

  function calcular() {
    const r = calcCorrecao({ valorOriginal:parseFloat(valorOriginal), dataVencimento, indexador, jurosAM:parseFloat(jurosAM), multa:parseFloat(multa) });
    setResultado(r);
  }

  function calcularHonorarios() {
    let base = 0;
    if (baseCalculo === "divida_original") {
      base = parseFloat(valorOriginal)||0;
    } else if (baseCalculo === "total_atualizado") {
      base = resultado ? resultado.total : (parseFloat(valorOriginal)||0);
    } else {
      base = parseFloat(valorBase)||0;
    }

    let valorHon = 0;
    if (tipoHonorario === "percentual") {
      valorHon = base * (parseFloat(percentual)||0) / 100;
    } else {
      valorHon = parseFloat(valorFixo)||0;
    }

    // Limites OAB (Tabela de Honorários OAB/GO — referência)
    const limites = {
      extrajudicial: { min: 10, max: 30, label: "Extrajudicial" },
      conhecimento:  { min: 10, max: 30, label: "Fase de Conhecimento" },
      execucao:      { min: 10, max: 30, label: "Fase de Execução / Cumprimento" },
      recursal:      { min: 5,  max: 20, label: "Fase Recursal" },
      stj_stf:       { min: 5,  max: 20, label: "STJ / STF" },
    };
    const limite = limites[faseProcessual];
    const pctReal = base > 0 ? (valorHon/base*100) : 0;
    const abaixoMin = tipoHonorario==="percentual" && parseFloat(percentual) < limite.min;
    const acimaMax  = tipoHonorario==="percentual" && parseFloat(percentual) > limite.max;

    setResultadoHon({ base, valorHon, pctReal, limite, abaixoMin, acimaMax, faseLabel: limite.label });
  }

  const idx = { igpm:"IGP-M", ipca:"IPCA", selic:"SELIC/CDI" };
  const FASES = [
    { v:"extrajudicial", l:"Extrajudicial (cobrança amigável)" },
    { v:"conhecimento",  l:"Fase de Conhecimento" },
    { v:"execucao",      l:"Fase de Execução / Cumprimento de Sentença" },
    { v:"recursal",      l:"Fase Recursal (TJ)" },
    { v:"stj_stf",       l:"STJ / STF" },
  ];

  return (
    <div>
      <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:4 }}>Calculadora</h2>
      <p style={{ fontSize:13,color:"#64748b",marginBottom:18 }}>Atualização monetária e cálculo de honorários advocatícios.</p>

      {/* Abas */}
      <div style={{ display:"flex",gap:6,marginBottom:20,borderBottom:"2px solid #f1f5f9",paddingBottom:0 }}>
        {[["correcao","🧮 Atualização Monetária"],["honorarios","⚖️ Honorários Advocatícios"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{ padding:"9px 20px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:13,
              color:aba===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${aba===id?"#4f46e5":"transparent"}`,marginBottom:-2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ABA CORREÇÃO ─────────────────────────────────────── */}
      {aba==="correcao" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div style={{ background:"#fff",borderRadius:18,padding:24,border:"1px solid #f1f5f9" }}>
            <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,marginBottom:14,color:"#0f172a" }}>Parâmetros</p>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em" }}>Carregar Devedor (opcional)</label>
              <select value={devId} onChange={e=>loadDev(e.target.value)} style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"Mulish",outline:"none" }}>
                <option value="">— Digitar manualmente —</option>
                {devedores.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <Inp label="Valor Original (R$)" value={valorOriginal} onChange={setValorOriginal} type="number" span={2}/>
              <Inp label="Data de Vencimento"  value={dataVencimento} onChange={setDataVencimento} type="date" span={2}/>
              <Inp label="Indexador" value={indexador} onChange={setIndexador} options={[{v:"igpm",l:"IGP-M"},{v:"ipca",l:"IPCA"},{v:"selic",l:"SELIC/CDI"}]}/>
              <Inp label="Juros (% ao mês)" value={jurosAM} onChange={setJurosAM} type="number"/>
              <Inp label="Multa (%)" value={multa} onChange={setMulta} type="number"/>
            </div>
            <div style={{ marginTop:16,display:"flex",gap:8 }}>
              <Btn onClick={calcular}>Calcular →</Btn>
              {resultado && <Btn onClick={()=>setAba("honorarios")} outline color="#4f46e5">⚖️ Calcular Honorários</Btn>}
            </div>
          </div>

          <div style={{ background:resultado?"linear-gradient(135deg,#0f172a,#1e1b4b)":"#f8fafc",borderRadius:18,padding:24,border:"1px solid #f1f5f9" }}>
            {!resultado ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:280 }}>
                <div style={{ fontSize:40,marginBottom:12 }}>🧮</div>
                <p style={{ color:"#94a3b8",fontSize:13,textAlign:"center" }}>Preencha os parâmetros e clique em Calcular</p>
              </div>
            ) : (
              <div>
                <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:16 }}>Resultado — {idx[indexador]}</p>
                <p style={{ color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:3 }}>Valor Total Atualizado</p>
                <p style={{ fontFamily:"Syne",fontWeight:800,fontSize:32,color:"#fff",marginBottom:4 }}>{fmt(resultado.total)}</p>
                <p style={{ color:"rgba(255,255,255,.4)",fontSize:11,marginBottom:16 }}>Período: {resultado.meses} meses ({resultado.dias} dias)</p>
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {[["Valor Original",resultado.valorOriginal,"#94a3b8"],["Correção "+idx[indexador],resultado.correcao,"#818cf8"],["Juros ("+jurosAM+"%am)",resultado.juros,"#fbbf24"],["Multa ("+multa+"%)",resultado.multa,"#f87171"]].map(([l,v,c])=>(
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"7px 11px",background:"rgba(255,255,255,.06)",borderRadius:9 }}>
                      <span style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>{l}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:c }}>{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"9px 11px",background:"rgba(255,255,255,.15)",borderRadius:9 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#fff" }}>TOTAL ATUALIZADO</span>
                    <span style={{ fontSize:14,fontWeight:800,color:"#a5f3fc" }}>{fmt(resultado.total)}</span>
                  </div>
                </div>
                <p style={{ fontSize:10,color:"rgba(255,255,255,.25)",marginTop:12,lineHeight:1.5 }}>* Taxas médias históricas. Para petições use planilha oficial TJGO/STJ.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA HONORÁRIOS ───────────────────────────────────── */}
      {aba==="honorarios" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div style={{ background:"#fff",borderRadius:18,padding:24,border:"1px solid #f1f5f9" }}>
            <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,marginBottom:16,color:"#0f172a" }}>Parâmetros dos Honorários</p>

            {/* Fase processual */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em" }}>Fase Processual</label>
              <select value={faseProcessual} onChange={e=>setFaseProcessual(e.target.value)} style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Mulish" }}>
                {FASES.map(f=><option key={f.v} value={f.v}>{f.l}</option>)}
              </select>
            </div>

            {/* Base de cálculo */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:".04em" }}>Base de Cálculo</label>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {[
                  ["divida_original",  `Dívida original ${valorOriginal?`— ${fmt(parseFloat(valorOriginal)||0)}`:""}` ],
                  ["total_atualizado", `Total atualizado ${resultado?`— ${fmt(resultado.total)}`:"(calcule primeiro)"}`],
                  ["personalizado",    "Valor personalizado"],
                ].map(([v,l])=>(
                  <label key={v} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",borderRadius:10,background:baseCalculo===v?"#ede9fe":"#f8fafc",border:`1.5px solid ${baseCalculo===v?"#4f46e5":"#e2e8f0"}` }}>
                    <input type="radio" name="base" value={v} checked={baseCalculo===v} onChange={()=>setBaseCalculo(v)} style={{ accentColor:"#4f46e5" }}/>
                    <span style={{ fontSize:13,color:baseCalculo===v?"#4f46e5":"#475569",fontWeight:baseCalculo===v?700:400 }}>{l}</span>
                  </label>
                ))}
              </div>
              {baseCalculo==="personalizado" && (
                <div style={{ marginTop:10 }}>
                  <Inp label="Valor Base (R$)" value={valorBase} onChange={setValorBase} type="number"/>
                </div>
              )}
            </div>

            {/* Tipo de honorário */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:8,textTransform:"uppercase",letterSpacing:".04em" }}>Tipo de Honorário</label>
              <div style={{ display:"flex",gap:8 }}>
                {[["percentual","% Percentual"],["fixo","R$ Valor Fixo"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTipoHonorario(v)}
                    style={{ flex:1,padding:"9px",border:`1.5px solid ${tipoHonorario===v?"#4f46e5":"#e2e8f0"}`,borderRadius:10,background:tipoHonorario===v?"#4f46e5":"#fff",color:tipoHonorario===v?"#fff":"#64748b",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Mulish" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {tipoHonorario==="percentual" ? (
              <div>
                <label style={{ fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".04em" }}>Percentual (%)</label>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <input type="range" min="1" max="50" step="0.5" value={percentual} onChange={e=>setPercentual(e.target.value)} style={{ flex:1,accentColor:"#4f46e5" }}/>
                  <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                    <input type="number" value={percentual} onChange={e=>setPercentual(e.target.value)} style={{ width:65,padding:"6px 8px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,fontWeight:700,color:"#4f46e5",outline:"none",textAlign:"center" }}/>
                    <span style={{ fontWeight:700,color:"#4f46e5",fontSize:16 }}>%</span>
                  </div>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#94a3b8" }}>
                  <span>1%</span><span style={{ color:"#4f46e5",fontWeight:700 }}>{percentual}% selecionado</span><span>50%</span>
                </div>
              </div>
            ) : (
              <Inp label="Valor Fixo dos Honorários (R$)" value={valorFixo} onChange={setValorFixo} type="number"/>
            )}

            <div style={{ marginTop:18 }}>
              <Btn onClick={calcularHonorarios}>⚖️ Calcular Honorários</Btn>
            </div>
          </div>

          {/* Resultado honorários */}
          <div style={{ background:resultadoHon?"linear-gradient(135deg,#0f172a,#1e1b4b)":"#f8fafc",borderRadius:18,padding:24,border:"1px solid #f1f5f9" }}>
            {!resultadoHon ? (
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:320 }}>
                <div style={{ fontSize:44,marginBottom:12 }}>⚖️</div>
                <p style={{ color:"#94a3b8",fontSize:13,textAlign:"center" }}>Configure os parâmetros e clique em<br/>Calcular Honorários</p>
              </div>
            ) : (
              <div>
                <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:6 }}>Honorários — {resultadoHon.faseLabel}</p>

                {/* Alerta OAB */}
                {(resultadoHon.abaixoMin||resultadoHon.acimaMax) && (
                  <div style={{ background:resultadoHon.abaixoMin?"rgba(251,191,36,.15)":"rgba(248,113,113,.15)",border:`1px solid ${resultadoHon.abaixoMin?"#fbbf24":"#f87171"}`,borderRadius:10,padding:"8px 12px",marginBottom:14 }}>
                    <p style={{ fontSize:12,color:resultadoHon.abaixoMin?"#fbbf24":"#f87171",fontWeight:700 }}>
                      {resultadoHon.abaixoMin ? `⚠️ Abaixo do mínimo OAB (${resultadoHon.limite.min}%)` : `⚠️ Acima do máximo OAB (${resultadoHon.limite.max}%)`}
                    </p>
                    <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2 }}>Tabela OAB/GO: {resultadoHon.limite.min}% a {resultadoHon.limite.max}%</p>
                  </div>
                )}
                {!resultadoHon.abaixoMin && !resultadoHon.acimaMax && tipoHonorario==="percentual" && (
                  <div style={{ background:"rgba(34,197,94,.15)",border:"1px solid #22c55e",borderRadius:10,padding:"8px 12px",marginBottom:14 }}>
                    <p style={{ fontSize:12,color:"#22c55e",fontWeight:700 }}>✓ Dentro dos limites OAB ({resultadoHon.limite.min}% a {resultadoHon.limite.max}%)</p>
                  </div>
                )}

                {/* Valor principal */}
                <div style={{ marginBottom:16 }}>
                  <p style={{ color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:3 }}>Valor dos Honorários</p>
                  <p style={{ fontFamily:"Syne",fontWeight:800,fontSize:36,color:"#fbbf24" }}>{fmt(resultadoHon.valorHon)}</p>
                  {tipoHonorario==="percentual" && <p style={{ color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2 }}>{percentual}% sobre {fmt(resultadoHon.base)}</p>}
                </div>

                {/* Breakdown */}
                <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                  {[
                    ["Base de Cálculo",   resultadoHon.base,     "#94a3b8"],
                    ["Honorários",        resultadoHon.valorHon, "#fbbf24"],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"7px 11px",background:"rgba(255,255,255,.06)",borderRadius:9 }}>
                      <span style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>{l}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:c }}>{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex",justifyContent:"space-between",padding:"9px 11px",background:"rgba(255,255,255,.15)",borderRadius:9 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#fff" }}>TOTAL (dívida + honorários)</span>
                    <span style={{ fontSize:14,fontWeight:800,color:"#a5f3fc" }}>{fmt(resultadoHon.base + resultadoHon.valorHon)}</span>
                  </div>
                </div>

                {/* Tabela OAB referência */}
                <div style={{ marginTop:16,padding:"10px 12px",background:"rgba(255,255,255,.05)",borderRadius:10 }}>
                  <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",fontWeight:700,marginBottom:6 }}>TABELA OAB — LIMITES POR FASE</p>
                  {[
                    ["Extrajudicial","10% a 30%"],
                    ["Conhecimento / Execução","10% a 30%"],
                    ["Fase Recursal","5% a 20%"],
                    ["STJ / STF","5% a 20%"],
                  ].map(([f,v])=>(
                    <div key={f} style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:3 }}>
                      <span>{f}</span><span style={{ fontWeight:700 }}>{v}</span>
                    </div>
                  ))}
                  <p style={{ fontSize:10,color:"rgba(255,255,255,.25)",marginTop:6 }}>* Referência OAB/GO. Consulte a tabela vigente.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════════════
function Relatorios({ devedores, processos, andamentos }) {
  const total = devedores.reduce((s,d)=>s+d.valor_original,0);
  const recuperado = devedores.filter(d=>d.status==="pago").reduce((s,d)=>s+d.valor_original,0);
  const taxa = total ? (recuperado/total*100).toFixed(1) : 0;

  function exportCSV(dados, nome) {
    const keys = Object.keys(dados[0]||{});
    const csv = [keys.join(";"), ...dados.map(r=>keys.map(k=>JSON.stringify(r[k]??"")+";").join(""))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));
    a.download = nome; a.click();
  }

  const porStatus = {};
  devedores.forEach(d=>{ porStatus[d.status]=(porStatus[d.status]||0)+1; });
  const porFase = {};
  processos.forEach(p=>{ porFase[p.fase]=(porFase[p.fase]||0)+1; });

  return (
    <div>
      <h2 style={{ fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:18 }}>Relatórios</h2>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24 }}>
        {[["Carteira Total",fmt(total),"#4f46e5"],["Recuperado",fmt(recuperado),"#059669"],["Taxa Recuperação",taxa+"%","#d97706"],["Processos Ativos",processos.filter(p=>p.status==="em_andamento").length,"#dc2626"]].map(([l,v,c])=>(
          <div key={l} style={{ background:"#fff",borderRadius:16,padding:20,border:"1px solid #f1f5f9" }}>
            <p style={{ fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>{l}</p>
            <p style={{ fontFamily:"Syne",fontWeight:800,fontSize:24,color:c }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20 }}>
        <div style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9" }}>
          <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:14 }}>Devedores por Status</p>
          {Object.entries(porStatus).map(([s,q])=>(
            <div key={s} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <Badge s={s}/><b style={{ fontSize:14,color:"#0f172a" }}>{q}</b>
            </div>
          ))}
        </div>
        <div style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9" }}>
          <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:14 }}>Processos por Fase</p>
          {Object.entries(porFase).map(([f,q])=>(
            <div key={f} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,fontSize:13 }}>
              <span style={{ color:"#475569" }}>{f}</span><b style={{ color:"#0f172a" }}>{q}</b>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #f1f5f9" }}>
        <p style={{ fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:14 }}>Exportar para Excel / Planilhas</p>
        <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
          <Btn onClick={()=>exportCSV(devedores,"devedores.csv")} color="#059669">{I.dl} Carteira de Devedores</Btn>
          <Btn onClick={()=>exportCSV(processos,"processos.csv")}>{I.dl} Processos</Btn>
          <Btn onClick={()=>exportCSV(andamentos,"andamentos.csv")} color="#d97706">{I.dl} Andamentos</Btn>
        </div>
        <p style={{ fontSize:11,color:"#94a3b8",marginTop:10 }}>Arquivos CSV compatíveis com Excel e Google Planilhas.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP — dados em tempo real via Supabase
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]             = useState(null);
  const [tab, setTab]               = useState("dashboard");
  const [sideOpen, setSideOpen]     = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [devedores,  setDevedores]  = useState([]);
  const [credores,   setCredores]   = useState([]);
  const [processos,  setProcessos]  = useState([]);
  const [andamentos, setAndamentos] = useState([]);
  const [regua,      setRegua]      = useState([]);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const [devs, creds, procs, ands, reg] = await Promise.all([
        dbGet("devedores"), dbGet("credores"), dbGet("processos"), dbGet("andamentos"), dbGet("regua"),
      ]);
      setDevedores((devs||[]).map(d=>({ ...d, parcelas: typeof d.parcelas==="string"?JSON.parse(d.parcelas||"[]"):(d.parcelas||[]) })));
      setCredores(creds||[]);
      setProcessos(procs||[]);
      setAndamentos(ands||[]);
      setRegua(reg||[]);
    } catch(e) { console.error(e); }
    setCarregando(false);
  }, []);

  useEffect(() => { if(user) carregarTudo(); }, [user, carregarTudo]);
  useEffect(() => {
    if(!user) return;
    const iv = setInterval(carregarTudo, 30000);
    return () => clearInterval(iv);
  }, [user, carregarTudo]);

  if(!user) return <Login onLogin={setUser}/>;

  const NAV = [
    { id:"dashboard",  label:"Dashboard",  icon: I.dash  },
    { id:"devedores",  label:"Devedores",  icon: I.dev   },
    { id:"credores",   label:"Credores",   icon: I.cred  },
    { id:"processos",  label:"Processos",  icon: I.proc  },
    { id:"regua",      label:"Régua",      icon: I.regua },
    { id:"calculadora",label:"Calculadora",icon: I.calc  },
    { id:"relatorios", label:"Relatórios", icon: I.rel   },
  ];

  const PAGE = {
    dashboard:   <Dashboard   devedores={devedores} processos={processos} andamentos={andamentos} user={user}/>,
    devedores:   <Devedores   devedores={devedores} setDevedores={setDevedores} credores={credores}/>,
    credores:    <Credores    credores={credores}   setCredores={setCredores}/>,
    processos:   <Processos   processos={processos} setProcessos={setProcessos} devedores={devedores} credores={credores} andamentos={andamentos} setAndamentos={setAndamentos}/>,
    regua:       <Regua       processos={processos} devedores={devedores} regua={regua} setRegua={setRegua}/>,
    calculadora: <Calculadora devedores={devedores}/>,
    relatorios:  <Relatorios  devedores={devedores} processos={processos} andamentos={andamentos}/>,
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",fontFamily:"Mulish",background:"#f8fafc" }}>
      <FontLink/>
      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:30 }}/>}

      <aside style={{ position:"fixed",top:0,left:0,bottom:0,width:220,background:"#0f172a",display:"flex",flexDirection:"column",zIndex:40,transform:sideOpen?"translateX(0)":"translateX(-100%)",transition:"transform .2s" }} className="lg-sidebar">
        <style>{`.lg-sidebar{transform:translateX(0)!important}@media(max-width:768px){.lg-sidebar{transform:${sideOpen?"translateX(0)":"translateX(-100%)"}}}`}</style>
        <div style={{ padding:"20px 18px",borderBottom:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:14 }}>MR</span>
            </div>
            <div>
              <p style={{ color:"#fff",fontFamily:"Syne",fontWeight:700,fontSize:14,lineHeight:1.1 }}>MR Cobranças</p>
              <p style={{ color:"rgba(255,255,255,.4)",fontSize:10 }}>CRM Jurídico</p>
            </div>
          </div>
        </div>
        <nav style={{ flex:1,padding:"14px 10px",display:"flex",flexDirection:"column",gap:2 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ setTab(n.id); setSideOpen(false); }}
              style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Mulish",fontSize:13,fontWeight:600,background:tab===n.id?"linear-gradient(135deg,#4f46e5,#7c3aed)":"transparent",color:tab===n.id?"#fff":"rgba(255,255,255,.5)",transition:"all .15s" }}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:30,height:30,borderRadius:99,background:"rgba(99,102,241,.3)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <span style={{ color:"#818cf8",fontFamily:"Syne",fontWeight:800,fontSize:11 }}>{user.nome[0]}</span>
              </div>
              <div>
                <p style={{ color:"#fff",fontSize:11,fontWeight:700 }}>{user.nome.split(" ")[0]}</p>
                <p style={{ color:"rgba(255,255,255,.35)",fontSize:10 }}>{user.oab}</p>
              </div>
            </div>
            <div style={{ display:"flex",gap:4 }}>
              <button onClick={carregarTudo} title="Atualizar" style={{ color:"rgba(255,255,255,.4)",background:"none",border:"none",cursor:"pointer",fontSize:14,padding:4 }}>🔄</button>
              <button onClick={()=>setUser(null)} title="Sair" style={{ color:"rgba(255,255,255,.3)",background:"none",border:"none",cursor:"pointer",padding:4 }}>{I.logout}</button>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex:1,marginLeft:220,display:"flex",flexDirection:"column",minWidth:0 }}>
        <style>{`@media(max-width:768px){main{margin-left:0!important}}`}</style>
        <header style={{ background:"#fff",borderBottom:"1px solid #f1f5f9",padding:"12px 24px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:20 }}>
          <button onClick={()=>setSideOpen(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex",padding:4 }}>{I.menu}</button>
          <span style={{ fontFamily:"Syne",fontWeight:700,fontSize:16,color:"#0f172a" }}>{NAV.find(n=>n.id===tab)?.label}</span>
          {carregando && <span style={{ fontSize:11,color:"#94a3b8" }}>⏳ sincronizando...</span>}
          <span style={{ marginLeft:"auto",fontSize:12,color:"#94a3b8" }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span>
        </header>
        <div style={{ flex:1,padding:24,overflowY:"auto" }}>
          {carregando && devedores.length===0 ? (
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200,flexDirection:"column",gap:12 }}>
              <div style={{ fontSize:36 }}>⏳</div>
              <p style={{ color:"#94a3b8",fontSize:14 }}>Carregando dados do servidor...</p>
            </div>
          ) : PAGE[tab]}
        </div>
      </main>
    </div>
  );
}

  if(!user) return <Login onLogin={setUser} />;

  const NAV = [
    { id:"dashboard", label:"Dashboard", icon: I.dash },
    { id:"devedores", label:"Devedores", icon: I.dev },
    { id:"credores", label:"Credores", icon: I.cred },
    { id:"processos", label:"Processos", icon: I.proc },
    { id:"regua", label:"Régua", icon: I.regua },
    { id:"calculadora", label:"Calculadora", icon: I.calc },
    { id:"relatorios", label:"Relatórios", icon: I.rel },
  ];

  const PAGE = {
    dashboard: <Dashboard devedores={devedores} processos={processos} andamentos={andamentos} user={user}/>,
    devedores: <Devedores devedores={devedores} setDevedores={setDevedores}/>,
    credores: <Credores credores={credores} setCredores={setCredores}/>,
    processos: <Processos processos={processos} setProcessos={setProcessos} devedores={devedores} credores={credores} andamentos={andamentos} setAndamentos={setAndamentos}/>,
    regua: <Regua processos={processos} devedores={devedores} regua={regua} setRegua={setRegua}/>,
    calculadora: <Calculadora devedores={devedores}/>,
    relatorios: <Relatorios devedores={devedores} processos={processos} andamentos={andamentos}/>,
  };

  return (
    <div style={{ minHeight:"100vh",display:"flex",fontFamily:"Mulish",background:"#f8fafc" }}>
      <FontLink />

      {/* Mobile overlay */}
      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:30 }}/>}

      {/* SIDEBAR */}
      <aside style={{ position:"fixed",top:0,left:0,bottom:0,width:220,background:"#0f172a",display:"flex",flexDirection:"column",zIndex:40,transform: sideOpen ? "translateX(0)" : "translateX(-100%)",transition:"transform .2s" }}
        className="lg-sidebar">
        <style>{`.lg-sidebar { transform: translateX(0) !important; } @media(max-width:768px){ .lg-sidebar { transform: ${sideOpen?"translateX(0)":"translateX(-100%)"}; } }`}</style>

        {/* Logo */}
        <div style={{ padding:"20px 18px",borderBottom:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ color:"#fff",fontFamily:"Syne",fontWeight:800,fontSize:14 }}>MR</span>
            </div>
            <div>
              <p style={{ color:"#fff",fontFamily:"Syne",fontWeight:700,fontSize:14,lineHeight:1.1 }}>MR Cobranças</p>
              <p style={{ color:"rgba(255,255,255,.4)",fontSize:10 }}>CRM Jurídico</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"14px 10px",display:"flex",flexDirection:"column",gap:2 }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ setTab(n.id); setSideOpen(false); }}
              style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",fontFamily:"Mulish",fontSize:13,fontWeight:600,background: tab===n.id?"linear-gradient(135deg,#4f46e5,#7c3aed)":"transparent",color: tab===n.id?"#fff":"rgba(255,255,255,.5)",transition:"all .15s" }}>
              {n.icon} {n.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:30,height:30,borderRadius:99,background:"rgba(99,102,241,.3)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <span style={{ color:"#818cf8",fontFamily:"Syne",fontWeight:800,fontSize:11 }}>{user.nome[0]}</span>
              </div>
              <div>
                <p style={{ color:"#fff",fontSize:11,fontWeight:700 }}>{user.nome.split(" ")[0]}</p>
                <p style={{ color:"rgba(255,255,255,.35)",fontSize:10 }}>{user.oab}</p>
              </div>
            </div>
            <button onClick={()=>setUser(null)} style={{ color:"rgba(255,255,255,.3)",background:"none",border:"none",cursor:"pointer",padding:4 }} title="Sair">{I.logout}</button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1,marginLeft:220,display:"flex",flexDirection:"column",minWidth:0 }}>
        <style>{`@media(max-width:768px){ main { margin-left: 0 !important; } }`}</style>

        {/* Topbar */}
        <header style={{ background:"#fff",borderBottom:"1px solid #f1f5f9",padding:"12px 24px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:20 }}>
          <button onClick={()=>setSideOpen(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex",padding:4 }}>{I.menu}</button>
          <span style={{ fontFamily:"Syne",fontWeight:700,fontSize:16,color:"#0f172a" }}>{NAV.find(n=>n.id===tab)?.label}</span>
          <span style={{ marginLeft:"auto",fontSize:12,color:"#94a3b8" }}>
            {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </span>
        </header>

        <div style={{ flex:1,padding:24,overflowY:"auto" }}>
          {PAGE[tab]}
        </div>
      </main>
    </div>
  );
}
