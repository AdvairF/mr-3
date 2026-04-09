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
      const user = USERS.find(u => u.email === email && u.senha === senha);
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
  const totalCarteira = devedores.reduce((s,d)=>{
    const dividas = d.dividas||[];
    const valorDividas = dividas.reduce((ss,div)=>ss+(div.valor_total||0),0);
    // Usar valor das dívidas se existir, senão valor_nominal ou valor_original (qualquer um que tiver)
    const valorBase = valorDividas || d.valor_nominal || d.valor_original || 0;
    return s + valorBase;
  },0);
  const totalRecuperado = devedores.reduce((s,d)=>{
    // Parcelas de dívidas avulsas
    const parcsDividas = (d.dividas||[]).flatMap(div=>div.parcelas||[]);
    const recDividas = parcsDividas.filter(p=>p.status==="pago").reduce((ss,p)=>ss+(p.valor||0),0);
    // Parcelas de acordos
    const recAcordos = calcularTotaisAcordo(d.acordos||[]).recuperado;
    return s + recDividas + recAcordos;
  },0);
  const totalAcordos = devedores.reduce((s,d)=>s+(d.acordos||[]).length,0);
  const acordosAtivos = devedores.reduce((s,d)=>s+(d.acordos||[]).filter(a=>a.status==="ativo").length,0);
  const ativos = processos.filter(p => p.status==="em_andamento").length;
  const prazos7 = andamentos.filter(a => { if(!a.prazo) return false; const d=(new Date(a.prazo)-new Date())/86400000; return d>=0&&d<=7; }).length;

  const kpis = [
    { l:"Carteira Total", v: fmt(totalCarteira), sub:`${devedores.length} devedores`, g:"linear-gradient(135deg,#4f46e5,#6d28d9)" },
    { l:"Valor Recuperado", v: fmt(totalRecuperado), sub:`${totalCarteira?(totalRecuperado/totalCarteira*100).toFixed(1):0}% da carteira`, g:"linear-gradient(135deg,#059669,#065f46)" },
    { l:"Prazos Críticos", v: prazos7, sub:"próximos 7 dias", g:"linear-gradient(135deg,#dc2626,#9f1239)" },
    { l:"Processos Ativos", v: ativos, sub:`${processos.length} total`, g:"linear-gradient(135deg,#d97706,#b45309)" },
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
// STATUS + CONSTANTES
// ═══════════════════════════════════════════════════════════════
const STATUS_DEV = [
  { v:"novo",           l:"🆕 Novo",              cor:"#64748b", bg:"#f1f5f9" },
  { v:"em_localizacao", l:"🔍 Em Localização",     cor:"#2563eb", bg:"#dbeafe" },
  { v:"notificado",     l:"📬 Notificado",          cor:"#7c3aed", bg:"#ede9fe" },
  { v:"em_negociacao",  l:"🤝 Em Negociação",       cor:"#d97706", bg:"#fef3c7" },
  { v:"acordo_firmado", l:"✅ Acordo Firmado",       cor:"#16a34a", bg:"#dcfce7" },
  { v:"pago_integral",  l:"💰 Pago Integralmente",  cor:"#065f46", bg:"#d1fae5" },
  { v:"pago_parcial",   l:"💵 Pago Parcialmente",   cor:"#0f766e", bg:"#ccfbf1" },
  { v:"irrecuperavel",  l:"❌ Irrecuperável",        cor:"#dc2626", bg:"#fee2e2" },
  { v:"ajuizado",       l:"⚖️ Ajuizado",             cor:"#c2410c", bg:"#ffedd5" },
];
function BadgeDev({status}){
  const s=STATUS_DEV.find(x=>x.v===status)||STATUS_DEV[0];
  return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,background:s.bg,color:s.cor,whiteSpace:"nowrap"}}>{s.l}</span>;
}
const UFS=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const maskCPF=v=>{const n=v.replace(/\D/g,"");return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4").slice(0,14);};
const maskCNPJ=v=>{const n=v.replace(/\D/g,"");return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5").slice(0,18);};
const maskTel=v=>{const n=v.replace(/\D/g,"");return n.length<=10?n.replace(/(\d{2})(\d{4})(\d{4})/,"($1) $2-$3"):n.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/,"($1) $2 $3-$4").slice(0,16);};
const maskCEP=v=>v.replace(/\D/g,"").replace(/(\d{5})(\d{3})/,"$1-$2").slice(0,9);

// Componentes de input internos
function INP({label,value,onChange,type="text",span,opts,placeholder}){
  const sty={width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"};
  return(
    <div style={span?{gridColumn:"1/-1"}:{}}>
      {label&&<label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</label>}
      {opts
        ?<select value={value} onChange={e=>onChange(e.target.value)} style={sty}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
        :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={sty}/>
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPERS DE ACORDO
// ═══════════════════════════════════════════════════════════════
function gerarParcelasAcordo(total, qtd, dataInicio){
  const arr=[];
  for(let i=0;i<qtd;i++){
    const d=new Date(dataInicio+"T12:00:00");
    d.setMonth(d.getMonth()+i);
    arr.push({
      id:Date.now()+i, numeroParcela:i+1,
      valorParcela:Math.round(total/qtd*100)/100,
      dataVencimento:d.toISOString().slice(0,10),
      dataPagamento:null, valorPago:null,
      status:"pendente", formaPagamento:"", observacoes:""
    });
  }
  return arr;
}

function verificarAtrasados(parcelas){
  const hoje=new Date().toISOString().slice(0,10);
  return parcelas.map(p=>
    p.status==="pendente"&&p.dataVencimento<hoje
      ? {...p, status:"atrasado"}
      : p
  );
}

function calcularTotaisAcordo(acordos=[]){
  let recuperado=0, emAberto=0;
  for(const ac of acordos){
    for(const p of (ac.parcelas||[])){
      if(p.status==="pago"||p.status==="pago_parcial") recuperado+=(p.valorPago||0);
      if(p.status==="pendente"||p.status==="atrasado") emAberto+=p.valorParcela;
    }
  }
  return { recuperado, emAberto };
}

// ═══════════════════════════════════════════════════════════════
// MODAL DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════
function ModalPagamento({parcela, onConfirmar, onFechar}){
  const hoje=new Date().toISOString().slice(0,10);
  const [dataPag, setDataPag]=useState(hoje);
  const [valorPago, setValorPago]=useState(String(parcela.valorParcela));
  const [forma, setForma]=useState("pix");
  const [obs, setObs]=useState("");
  return(
    <Modal title={`💰 Registrar Pagamento — Parcela ${parcela.numeroParcela}`} onClose={onFechar}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#f8fafc",borderRadius:10,padding:12,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"#64748b"}}>Valor da parcela</span>
          <span style={{fontSize:16,fontWeight:800,color:"#4f46e5"}}>{fmt(parcela.valorParcela)}</span>
        </div>
        <INP label="Data do Pagamento" value={dataPag} onChange={setDataPag} type="date"/>
        <INP label="Valor Pago (R$)" value={valorPago} onChange={setValorPago} type="number"/>
        <INP label="Forma de Pagamento" value={forma} onChange={setForma} opts={[
          {v:"pix",l:"PIX"},{v:"ted",l:"TED"},{v:"boleto",l:"Boleto"},
          {v:"dinheiro",l:"Dinheiro"},{v:"outro",l:"Outro"}
        ]}/>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em"}}>Observações</label>
          <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2}
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
        </div>
        {parseFloat(valorPago)<parcela.valorParcela&&(
          <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400e"}}>
            ⚠️ Valor abaixo do esperado — parcela ficará como <b>Pago Parcialmente</b>
          </div>
        )}
        <Btn onClick={()=>onConfirmar({dataPagamento:dataPag, valorPago:parseFloat(valorPago)||0, formaPagamento:forma, observacoes:obs})}>
          ✅ Confirmar Pagamento
        </Btn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORMULÁRIO NOVO ACORDO
// ═══════════════════════════════════════════════════════════════
function FormNovoAcordo({devedor, credores, user, onSalvar, onCancelar}){
  const hoje=new Date().toISOString().slice(0,10);
  const valorDivida=(devedor.dividas||[]).reduce((s,d)=>s+(d.valor_total||0),0)||devedor.valor_original||devedor.valor_nominal||0;
  const [valorOriginal]=useState(valorDivida);
  const [valorNegociado, setValorNegociado]=useState(String(valorDivida));
  const [dataAcordo, setDataAcordo]=useState(hoje);
  const [numParcelas, setNumParcelas]=useState("1");
  const [dataPrimVenc, setDataPrimVenc]=useState(hoje);
  const [obs, setObs]=useState("");
  const [parcelas, setParcelas]=useState([]);
  const [gerado, setGerado]=useState(false);

  const vNeg=parseFloat(valorNegociado)||0;
  const desconto=valorOriginal>0?((valorOriginal-vNeg)/valorOriginal*100):0;

  function gerar(){
    const qtd=parseInt(numParcelas)||1;
    if(!dataPrimVenc) return alert("Informe a data do primeiro vencimento.");
    if(vNeg<=0) return alert("Informe o valor negociado.");
    setParcelas(gerarParcelasAcordo(vNeg,qtd,dataPrimVenc));
    setGerado(true);
  }

  function editParcela(id,campo,val){
    setParcelas(ps=>ps.map(p=>p.id!==id?p:{...p,[campo]:campo==="valorParcela"?parseFloat(val)||0:val}));
  }

  function salvar(){
    if(!gerado||!parcelas.length) return alert("Gere as parcelas antes de salvar.");
    const acordo={
      id:Date.now(),
      devedorId:devedor.id, credorId:devedor.credor_id,
      dataAcordo, valorOriginalDivida:valorOriginal,
      valorTotalNegociado:vNeg, desconto,
      numeroParcelas:parseInt(numParcelas)||1,
      observacoes:obs, status:"ativo",
      criadoPor:user?.nome||"Sistema",
      criadoEm:new Date().toISOString(),
      parcelas,
    };
    onSalvar(acordo);
  }

  return(
    <div style={{background:"#f8fafc",borderRadius:14,padding:16,border:"2px solid #4f46e5"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontFamily:"Syne",fontWeight:800,fontSize:14,color:"#4f46e5"}}>🤝 Novo Acordo</p>
        <button onClick={onCancelar} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18}}>✕</button>
      </div>

      {/* Valores */}
      <div style={{background:"#fff",borderRadius:10,padding:14,marginBottom:12,border:"1px solid #e2e8f0"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Valor Original da Dívida</label>
            <div style={{padding:"9px 12px",background:"#f1f5f9",borderRadius:9,fontWeight:700,fontSize:14,color:"#64748b"}}>{fmt(valorOriginal)}</div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Valor Total Negociado (R$)</label>
            <input type="number" value={valorNegociado} onChange={e=>setValorNegociado(e.target.value)}
              style={{width:"100%",padding:"8px 10px",border:"1.5px solid #4f46e5",borderRadius:9,fontSize:14,fontWeight:700,color:"#4f46e5",outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        {valorOriginal>0&&(
          <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,
            background:desconto>=0?"#dcfce7":"#fee2e2",
            border:`1px solid ${desconto>=0?"#16a34a":"#dc2626"}`}}>
            <span style={{fontSize:13,fontWeight:700,color:desconto>=0?"#065f46":"#dc2626"}}>
              {desconto>=0?"✅ Desconto concedido: ":"⬆️ Acréscimo: "}
              <b>{Math.abs(desconto).toFixed(2)}%</b>
              {" = "+fmt(Math.abs(valorOriginal-vNeg))}
            </span>
          </div>
        )}
      </div>

      {/* Parâmetros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
        <INP label="Data do Acordo" value={dataAcordo} onChange={setDataAcordo} type="date"/>
        <INP label="Nº de Parcelas" value={numParcelas} onChange={setNumParcelas} type="number"/>
        <INP label="Data 1º Vencimento" value={dataPrimVenc} onChange={setDataPrimVenc} type="date"/>
      </div>

      {vNeg>0&&numParcelas>0&&(
        <div style={{background:"#ede9fe",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12}}>
          <b style={{color:"#4f46e5"}}>{numParcelas}x de {fmt(vNeg/parseInt(numParcelas||1))}</b>
          <span style={{color:"#7c3aed"}}> · Total: {fmt(vNeg)}</span>
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <Btn onClick={gerar} outline color="#4f46e5">🔄 Gerar Parcelas</Btn>
      </div>

      {/* Tabela de parcelas editável */}
      {gerado&&parcelas.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{maxHeight:220,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#ede9fe"}}>
                  {["Parcela","Vencimento","Valor (R$)",""].map(h=>(
                    <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#4f46e5",fontWeight:700,fontSize:10}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p,i)=>(
                  <tr key={p.id} style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafe"}}>
                    <td style={{padding:"6px 10px",fontWeight:700,color:"#7c3aed"}}>{i+1}</td>
                    <td style={{padding:"6px 10px"}}>
                      <input type="date" value={p.dataVencimento}
                        onChange={e=>editParcela(p.id,"dataVencimento",e.target.value)}
                        style={{padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:11,outline:"none"}}/>
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <input type="number" value={p.valorParcela}
                        onChange={e=>editParcela(p.id,"valorParcela",e.target.value)}
                        style={{width:90,padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:12,fontWeight:700,color:"#4f46e5",outline:"none"}}/>
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      <button onClick={()=>setParcelas(ps=>ps.filter(x=>x.id!==p.id))}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer",fontSize:10}}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 10px",background:"#f8fafc",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",borderTop:"none",fontSize:12}}>
            <span style={{color:"#64748b"}}>Total: <b style={{color:"#4f46e5"}}>{fmt(parcelas.reduce((s,p)=>s+p.valorParcela,0))}</b></span>
          </div>
        </div>
      )}

      {/* Observações */}
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2}
          style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
      </div>

      <div style={{display:"flex",gap:8}}>
        <Btn onClick={salvar} color="#059669">💾 Salvar Acordo</Btn>
        <Btn onClick={onCancelar} outline color="#64748b">Cancelar</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LISTAGEM DE ACORDOS (aba Acordos na ficha do devedor)
// ═══════════════════════════════════════════════════════════════
function AbaAcordos({devedor, acordos, credores, user, onAtualizarDevedor}){
  const [novoAcordo, setNovoAcordo]=useState(false);
  const [modalPag, setModalPag]=useState(null); // {acordoId, parcela}
  const [acordosLocal, setAcordosLocal]=useState(acordos||[]);

  // Verificar atrasados ao montar
  useEffect(()=>{
    setAcordosLocal((acordos||[]).map(ac=>({
      ...ac, parcelas:verificarAtrasados(ac.parcelas||[])
    })));
  },[acordos]);

  async function salvarNovoAcordo(acordo){
    const novos=[...acordosLocal, acordo];
    setAcordosLocal(novos);
    setNovoAcordo(false);
    // Salvar no Supabase
    try {
      await dbUpdate("devedores", devedor.id, {
        acordos:JSON.stringify(novos),
        status:"acordo_firmado",
      });
      onAtualizarDevedor({...devedor, acordos:novos, status:"acordo_firmado"});
      alert("✅ Acordo salvo! Status do devedor atualizado para Acordo Firmado.");
    } catch(e){ alert("Acordo salvo localmente. Erro ao sincronizar: "+e.message); }
  }

  async function confirmarPagamento({acordoId, parcela, dados}){
    const vPago=parseFloat(dados.valorPago)||0;
    const statusParcela=vPago>=parcela.valorParcela?"pago":"pago_parcial";
    const novosAcordos=acordosLocal.map(ac=>{
      if(ac.id!==acordoId) return ac;
      const novasParcelas=ac.parcelas.map(p=>
        p.id!==parcela.id?p:{
          ...p, status:statusParcela,
          dataPagamento:dados.dataPagamento,
          valorPago:vPago,
          formaPagamento:dados.formaPagamento,
          observacoes:dados.observacoes,
        }
      );
      // Atualizar status do acordo
      const todasPagas=novasParcelas.every(p=>p.status==="pago");
      const algumaPaga=novasParcelas.some(p=>p.status==="pago"||p.status==="pago_parcial");
      return {...ac, parcelas:novasParcelas, status:todasPagas?"quitado":algumaPaga?"ativo":"ativo"};
    });

    // Status do devedor
    const todasAcordosQuitados=novosAcordos.every(ac=>ac.status==="quitado");
    const algumPagamento=novosAcordos.some(ac=>ac.parcelas.some(p=>p.status==="pago"||p.status==="pago_parcial"));
    const novoStatusDev=todasAcordosQuitados?"pago_integral":algumPagamento?"pago_parcial":"acordo_firmado";

    setAcordosLocal(novosAcordos);
    setModalPag(null);

    try {
      await dbUpdate("devedores", devedor.id, {
        acordos:JSON.stringify(novosAcordos),
        status:novoStatusDev,
      });
      onAtualizarDevedor({...devedor, acordos:novosAcordos, status:novoStatusDev});
    } catch(e){ console.error(e); }
  }

  async function excluirAcordo(acordoId){
    if(!window.confirm("Excluir este acordo e todas as parcelas?")) return;
    const novos=acordosLocal.filter(a=>a.id!==acordoId);
    setAcordosLocal(novos);
    try { await dbUpdate("devedores", devedor.id, {acordos:JSON.stringify(novos)}); } catch(e){}
    onAtualizarDevedor({...devedor, acordos:novos});
  }

  const BADGE_PARC={
    pago:        {bg:"#dcfce7",cor:"#065f46",l:"✓ Pago"},
    pago_parcial:{bg:"#ccfbf1",cor:"#0f766e",l:"↗ Parcial"},
    atrasado:    {bg:"#fee2e2",cor:"#dc2626",l:"⚠ Atrasado"},
    pendente:    {bg:"#f1f5f9",cor:"#64748b",l:"⏳ Pendente"},
  };
  const BADGE_AC={
    ativo:   {bg:"#dbeafe",cor:"#1d4ed8",l:"Em andamento"},
    quitado: {bg:"#dcfce7",cor:"#065f46",l:"✅ Quitado"},
    quebrado:{bg:"#fee2e2",cor:"#dc2626",l:"❌ Quebrado"},
  };

  const totais=calcularTotaisAcordo(acordosLocal);

  return(
    <div>
      {/* Resumo de totais */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        {[
          ["Total Negociado", fmt(acordosLocal.reduce((s,a)=>s+a.valorTotalNegociado,0)), "#4f46e5","#ede9fe"],
          ["💰 Recuperado", fmt(totais.recuperado), "#065f46","#dcfce7"],
          ["⏳ Em Aberto", fmt(totais.emAberto), "#dc2626","#fee2e2"],
        ].map(([l,v,cor,bg])=>(
          <div key={l} style={{background:bg,borderRadius:10,padding:"10px 14px"}}>
            <p style={{fontSize:10,fontWeight:700,color:cor,textTransform:"uppercase",marginBottom:4}}>{l}</p>
            <p style={{fontSize:16,fontWeight:800,color:cor}}>{v}</p>
          </div>
        ))}
      </div>

      {/* Botão novo acordo */}
      {!novoAcordo&&(
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
          <Btn onClick={()=>setNovoAcordo(true)} color="#4f46e5">🤝 + Novo Acordo</Btn>
        </div>
      )}

      {/* Formulário novo acordo */}
      {novoAcordo&&(
        <FormNovoAcordo
          devedor={devedor} credores={credores} user={user}
          onSalvar={salvarNovoAcordo}
          onCancelar={()=>setNovoAcordo(false)}
        />
      )}

      {/* Lista de acordos */}
      {acordosLocal.length===0&&!novoAcordo&&(
        <div style={{textAlign:"center",padding:32,color:"#94a3b8",background:"#f8fafc",borderRadius:12}}>
          <div style={{fontSize:36,marginBottom:8}}>🤝</div>
          <p style={{fontWeight:600}}>Nenhum acordo registrado</p>
          <p style={{fontSize:12,marginTop:4}}>Clique em "+ Novo Acordo" para registrar um acordo de parcelamento.</p>
        </div>
      )}

      {acordosLocal.map(ac=>{
        const bs=BADGE_AC[ac.status]||BADGE_AC.ativo;
        const pagas=ac.parcelas.filter(p=>p.status==="pago"||p.status==="pago_parcial").length;
        const pct=ac.parcelas.length>0?Math.round(pagas/ac.parcelas.length*100):0;
        return(
          <div key={ac.id} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:16,marginBottom:14,background:"#fff"}}>
            {/* Cabeçalho do acordo */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#0f172a"}}>Acordo — {fmtDate(ac.dataAcordo)}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:bs.bg,color:bs.cor}}>{bs.l}</span>
                </div>
                <div style={{display:"flex",gap:14,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
                  <span>Original: <b style={{color:"#64748b"}}>{fmt(ac.valorOriginalDivida)}</b></span>
                  <span>Negociado: <b style={{color:"#4f46e5"}}>{fmt(ac.valorTotalNegociado)}</b></span>
                  {ac.desconto>0&&<span style={{color:"#16a34a",fontWeight:700}}>↓{ac.desconto.toFixed(1)}% desconto</span>}
                  <span>{ac.numeroParcelas}x · por {ac.criadoPor}</span>
                </div>
              </div>
              <button onClick={()=>excluirAcordo(ac.id)}
                style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:10,fontWeight:700}}>
                🗑
              </button>
            </div>

            {/* Barra de progresso */}
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                <span>{pagas} de {ac.parcelas.length} parcelas pagas</span>
                <span style={{fontWeight:700,color:"#4f46e5"}}>{pct}%</span>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:99}}>
                <div style={{height:6,width:`${pct}%`,background:"linear-gradient(90deg,#4f46e5,#7c3aed)",borderRadius:99,transition:"width .4s"}}/>
              </div>
            </div>

            {/* Tabela de parcelas */}
            <div style={{maxHeight:240,overflowY:"auto",border:"1px solid #f1f5f9",borderRadius:10,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#f8fafc",position:"sticky",top:0}}>
                    {["#","Vencimento","Valor","Status","Data Pag.","Forma","Ação"].map(h=>(
                      <th key={h} style={{padding:"6px 8px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:10}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ac.parcelas||[]).map(p=>{
                    const bp=BADGE_PARC[p.status]||BADGE_PARC.pendente;
                    return(
                      <tr key={p.id} style={{borderTop:"1px solid #f8fafc"}}>
                        <td style={{padding:"5px 8px",fontWeight:700,color:"#7c3aed"}}>{p.numeroParcela}</td>
                        <td style={{padding:"5px 8px",color:"#64748b"}}>{fmtDate(p.dataVencimento)}</td>
                        <td style={{padding:"5px 8px",fontWeight:700,color:"#4f46e5"}}>{fmt(p.valorParcela)}</td>
                        <td style={{padding:"5px 8px"}}>
                          <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,background:bp.bg,color:bp.cor}}>{bp.l}</span>
                        </td>
                        <td style={{padding:"5px 8px",color:"#64748b",fontSize:10}}>{p.dataPagamento?fmtDate(p.dataPagamento):"—"}</td>
                        <td style={{padding:"5px 8px",color:"#64748b",fontSize:10,textTransform:"uppercase"}}>{p.formaPagamento||"—"}</td>
                        <td style={{padding:"5px 8px"}}>
                          {(p.status==="pendente"||p.status==="atrasado")&&(
                            <button onClick={()=>setModalPag({acordoId:ac.id, parcela:p})}
                              style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
                              💰 Pagar
                            </button>
                          )}
                          {(p.status==="pago"||p.status==="pago_parcial")&&(
                            <span style={{fontSize:10,color:"#16a34a",fontWeight:700}}>✓ {fmt(p.valorPago)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {ac.observacoes&&(
              <p style={{fontSize:11,color:"#94a3b8",marginTop:8,fontStyle:"italic",padding:"6px 10px",background:"#f8fafc",borderRadius:7}}>
                📝 {ac.observacoes}
              </p>
            )}
          </div>
        );
      })}

      {/* Modal de pagamento */}
      {modalPag&&(
        <ModalPagamento
          parcela={modalPag.parcela}
          onConfirmar={dados=>confirmarPagamento({acordoId:modalPag.acordoId, parcela:modalPag.parcela, dados})}
          onFechar={()=>setModalPag(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEVEDORES — COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const FORM_DEV_VAZIO = {
  nome:"", cpf_cnpj:"", tipo:"PJ", rg:"", data_nascimento:"", profissao:"",
  socio_nome:"", socio_cpf:"", email:"", telefone:"", telefone2:"",
  cep:"", logradouro:"", numero:"", complemento:"", bairro:"", cidade:"Goiânia", uf:"GO",
  credor_id:"", valor_nominal:"", data_origem_divida:"", data_recebimento_carteira:"", descricao_divida:"",
  status:"novo", responsavel:"", observacoes:"",
};
const DIVIDA_VAZIA={descricao:"",valor_total:"",data_origem:"",data_primeira_parcela:"",qtd_parcelas:"1",parcelas:[],indexador:"igpm",multa_pct:"2",juros_am:"1",honorarios_pct:"20",data_inicio_atualizacao:"",despesas:"0",observacoes:""};
const SECOES=[["id","👤 Identificação"],["end","📍 Endereço"],["divida","💰 Dívida"],["ctrl","⚙️ Controle"]];

function Devedores({ devedores, setDevedores, credores, onModalChange, user, processos=[], setTab }) {
  const [search,setSearch]=useState("");
  const [filtroStatus,setFiltroStatus]=useState("");
  const [filtroCredor,setFiltroCredor]=useState("");
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [abaFicha,setAbaFicha]=useState("dados");
  const [editando,setEditando]=useState(false);
  const [secaoForm,setSecaoForm]=useState("id");
  const [form,setForm]=useState({...FORM_DEV_VAZIO,responsavel:user?.nome||""});
  const [formEdit,setFormEdit]=useState({});
  const [loading,setLoading]=useState(false);
  const [loadingEdit,setLoadingEdit]=useState(false);
  const [buscandoCep,setBuscandoCep]=useState(false);
  const [buscandoCEPEdit,setBuscandoCEPEdit]=useState(false);
  const [nd,setNd]=useState(DIVIDA_VAZIA);
  const [wp,setWp]=useState(null);
  const [novoContato,setNovoContato]=useState({tipo:"ligacao",resultado:"sem_resposta",obs:""});

  const F=(k,v)=>setForm(f=>({...f,[k]:v}));
  const FE=(k,v)=>setFormEdit(f=>({...f,[k]:v}));
  const ND=(k,v)=>setNd(d=>({...d,[k]:v}));

  function abrirModal(tipo,dev=null){
    setModal(tipo);
    if(tipo==="novo"){setForm({...FORM_DEV_VAZIO,responsavel:user?.nome||""});setSecaoForm("id");}
    if(tipo==="ficha"&&dev){
      const d={...dev,dividas:dev.dividas||[],contatos:dev.contatos||[],acordos:dev.acordos||[]};
      // Verificar atrasados nos acordos
      d.acordos=d.acordos.map(ac=>({...ac,parcelas:verificarAtrasados(ac.parcelas||[])}));
      setSel(d);
      setAbaFicha("dados");
      setEditando(false);
      setFormEdit({...dev,valor_nominal:dev.valor_nominal||dev.valor_original||0});
    }
    onModalChange&&onModalChange(true);
  }
  function fecharModal(){setModal(null);setSel(null);setNd(DIVIDA_VAZIA);setEditando(false);onModalChange&&onModalChange(false);}
  function abrirWp(d){setWp(d);onModalChange&&onModalChange(true);}
  function fecharWp(){setWp(null);onModalChange&&onModalChange(false);}

  async function buscarCep(){
    const c=form.cep.replace(/\D/g,"");
    if(c.length!==8) return alert("CEP inválido.");
    setBuscandoCep(true);
    try{const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);const d=await r.json();if(d.erro)return alert("CEP não encontrado.");setForm(f=>({...f,logradouro:d.logradouro||"",bairro:d.bairro||"",cidade:d.localidade||"",uf:d.uf||"GO"}));}catch(e){alert("Erro ao buscar CEP.");}
    setBuscandoCep(false);
  }
  async function buscarCEPEdit(){
    const c=(formEdit.cep||"").replace(/\D/g,"");
    if(c.length!==8) return alert("CEP inválido.");
    setBuscandoCEPEdit(true);
    try{const r=await fetch(`https://viacep.com.br/ws/${c}/json/`);const d=await r.json();if(d.erro)return alert("CEP não encontrado.");setFormEdit(f=>({...f,logradouro:d.logradouro||"",bairro:d.bairro||"",cidade:d.localidade||"",uf:d.uf||"GO"}));}catch(e){}
    setBuscandoCEPEdit(false);
  }

  // ── Salvar devedor (fallback progressivo) ────────────────────
  async function salvarDevedor(){
    if(!form.nome.trim()) return alert("Informe o nome.");
    setLoading(true);
    const valorNominal = parseFloat(form.valor_nominal)||0;
    // Tentativas em ordem — remove colunas inexistentes progressivamente
    const tentativas=[
      // #1 — completo (após SQL executado)
      {nome:form.nome,cpf_cnpj:form.cpf_cnpj,tipo:form.tipo,email:form.email||null,
       telefone:form.telefone||null,cidade:form.cidade||"Goiânia",
       credor_id:form.credor_id?parseInt(form.credor_id):null,
       valor_original:valorNominal,status:form.status||"novo",dividas:JSON.stringify([]),
       rg:form.rg||null,profissao:form.profissao||null,socio_nome:form.socio_nome||null,
       socio_cpf:form.socio_cpf||null,telefone2:form.telefone2||null,cep:form.cep||null,
       logradouro:form.logradouro||null,numero:form.numero||null,complemento:form.complemento||null,
       bairro:form.bairro||null,uf:form.uf||"GO",descricao_divida:form.descricao_divida||null,
       observacoes:form.observacoes||null,contatos:JSON.stringify([]),acordos:JSON.stringify([])},
      // #2 — sem colunas extras de endereço/sócio mas COM valor_original
      {nome:form.nome,cpf_cnpj:form.cpf_cnpj,tipo:form.tipo,email:form.email||null,
       telefone:form.telefone||null,cidade:form.cidade||"Goiânia",
       credor_id:form.credor_id?parseInt(form.credor_id):null,
       valor_original:valorNominal,status:form.status||"novo",dividas:JSON.stringify([])},
      // #3 — sem valor_original mas embute valor no JSON de dividas para persistir
      {nome:form.nome,cpf_cnpj:form.cpf_cnpj,tipo:form.tipo,email:form.email||null,
       telefone:form.telefone||null,status:form.status||"novo",
       dividas:JSON.stringify(valorNominal>0?[{id:"init",descricao:"Valor nominal",valor_total:valorNominal,parcelas:[],_nominal:true}]:[])},
      // #4 — mínimo absoluto com valor embutido
      {nome:form.nome,tipo:form.tipo||"PJ",
       dividas:JSON.stringify(valorNominal>0?[{id:"init",descricao:"Valor nominal",valor_total:valorNominal,parcelas:[],_nominal:true}]:[])},
    ];
    let novo=null, nivelUsado=0;
    for(let i=0;i<tentativas.length;i++){
      const res=await dbInsert("devedores",tentativas[i]);
      const r=Array.isArray(res)?res[0]:res;
      if(r?.id){novo=r;nivelUsado=i;break;}
    }
    if(novo?.id){
      // SEMPRE preservar valor_nominal do formulário — nunca usar o que veio do banco
      const local={
        ...novo,                        // dados do banco
        dividas:[], contatos:[], acordos:[],
        // sobrescrever com dados do formulário (que podem não ter ido ao banco)
        valor_original: valorNominal,   // <- FIXO: sempre do formulário
        valor_nominal:  valorNominal,   // <- FIXO: sempre do formulário
        rg:form.rg, profissao:form.profissao,
        socio_nome:form.socio_nome, socio_cpf:form.socio_cpf,
        telefone2:form.telefone2, cep:form.cep,
        logradouro:form.logradouro, numero:form.numero,
        complemento:form.complemento, bairro:form.bairro, uf:form.uf,
        cidade:form.cidade||"Goiânia",
        credor_id:form.credor_id?parseInt(form.credor_id):null,
        descricao_divida:form.descricao_divida,
        observacoes:form.observacoes,
        status:form.status||"novo",
      };
      setDevedores(p=>[...p,local]);
      fecharModal();
      setForm({...FORM_DEV_VAZIO,responsavel:user?.nome||""});
      if(nivelUsado>=2){
        alert(`✅ Devedor "${novo.nome}" cadastrado!

⚠️ Alguns campos (valor, endereço) não foram salvos no banco porque o SQL ainda não foi executado no Supabase.

Execute o arquivo supabase_prompt3.sql para salvar todos os campos.`);
      } else {
        alert(`✅ Devedor "${novo.nome}" cadastrado com sucesso!`);
      }
    } else {
      alert("Erro ao salvar. Verifique a conexão com o Supabase.");
    }
    setLoading(false);
  }

  // ── Editar devedor ───────────────────────────────────────────
  async function salvarEdicao(){
    if(!formEdit.nome?.trim()) return alert("Informe o nome.");
    setLoadingEdit(true);
    try{
      const payload={nome:formEdit.nome,cpf_cnpj:formEdit.cpf_cnpj,tipo:formEdit.tipo,email:formEdit.email||null,telefone:formEdit.telefone||null,cidade:formEdit.cidade||"Goiânia",credor_id:formEdit.credor_id?parseInt(formEdit.credor_id):null,valor_original:parseFloat(formEdit.valor_nominal)||sel.valor_original||0,status:formEdit.status||"novo",rg:formEdit.rg||null,profissao:formEdit.profissao||null,socio_nome:formEdit.socio_nome||null,socio_cpf:formEdit.socio_cpf||null,telefone2:formEdit.telefone2||null,cep:formEdit.cep||null,logradouro:formEdit.logradouro||null,numero:formEdit.numero||null,complemento:formEdit.complemento||null,bairro:formEdit.bairro||null,uf:formEdit.uf||"GO",descricao_divida:formEdit.descricao_divida||null,observacoes:formEdit.observacoes||null};
      const res=await dbUpdate("devedores",sel.id,payload);
      const atu=Array.isArray(res)?res[0]:res;
      const valorEdit=parseFloat(formEdit.valor_nominal)||sel.valor_original||sel.valor_nominal||0;
      if(atu||true){ // aceita mesmo sem retorno do banco
        const atualizado={
          ...sel,                     // base local
          ...(atu||{}),               // dados do banco (se houver)
          ...formEdit,                // dados do formulário (prioridade máxima)
          dividas:sel.dividas||[], contatos:sel.contatos||[], acordos:sel.acordos||[],
          valor_original:valorEdit,   // sempre preservar
          valor_nominal:valorEdit,
          credor_id:formEdit.credor_id?parseInt(formEdit.credor_id):sel.credor_id,
        };
        setDevedores(prev=>prev.map(d=>d.id===sel.id?atualizado:d));
        setSel(atualizado);setEditando(false);
        alert("✅ Cadastro atualizado!");
      }
    }catch(e){alert("Erro: "+e.message);}
    setLoadingEdit(false);
  }

  // ── Contatos ─────────────────────────────────────────────────
  async function registrarContato(){
    if(!sel) return;
    const contato={id:Date.now(),data:new Date().toLocaleString("pt-BR"),tipo:novoContato.tipo,resultado:novoContato.resultado,responsavel:user?.nome||"Sistema",obs:novoContato.obs};
    const contatos=[...(sel.contatos||[]),contato];
    try{
      const res=await dbUpdate("devedores",sel.id,{contatos:JSON.stringify(contatos)});
      const atu=Array.isArray(res)?res[0]:res;
      if(atu){const parsed={...atu,dividas:sel.dividas||[],contatos,acordos:sel.acordos||[]};setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);setNovoContato({tipo:"ligacao",resultado:"sem_resposta",obs:""});}
    }catch(e){alert("Erro: "+e.message);}
  }

  // ── Dívidas/Parcelas ─────────────────────────────────────────
  function gerarParcs(total,qtd,dataInicio){const arr=[];for(let i=0;i<qtd;i++){const d=new Date(dataInicio+"T12:00:00");d.setMonth(d.getMonth()+i);arr.push({id:Date.now()+i,num:i+1,valor:Math.round(total/qtd*100)/100,venc:d.toISOString().slice(0,10),status:"pendente",pago_em:null});}return arr;}
  function confirmarParcelas(){const total=parseFloat(nd.valor_total)||0,qtd=parseInt(nd.qtd_parcelas)||1;if(!nd.data_primeira_parcela)return alert("Informe a data.");setNd(d=>({...d,parcelas:gerarParcs(total,qtd,d.data_primeira_parcela)}));}
  function editParc(id,campo,val){setNd(d=>({...d,parcelas:d.parcelas.map(p=>p.id!==id?p:{...p,[campo]:campo==="valor"?parseFloat(val)||0:val})}));}
  function addParc(){setNd(d=>{const ul=d.parcelas[d.parcelas.length-1];const pD=ul?(()=>{const dd=new Date(ul.venc+"T12:00:00");dd.setMonth(dd.getMonth()+1);return dd.toISOString().slice(0,10);})():new Date().toISOString().slice(0,10);return{...d,parcelas:[...d.parcelas,{id:Date.now(),num:d.parcelas.length+1,valor:ul?.valor||0,venc:pD,status:"pendente",pago_em:null}]};});}
  function remParc(id){setNd(d=>({...d,parcelas:d.parcelas.filter(p=>p.id!==id)}));}

  // Helper: monta objeto devedor preservando dados locais mesmo se banco retornar null
  function montarDevAtualizado(atu, dividas, extras={}) {
    const valor_original = dividas.reduce((s,d)=>s+(d.valor_total||0),0) || atu?.valor_original || sel?.valor_original || 0;
    return {
      ...sel,           // base: tudo que já tínhamos localmente
      ...(atu||{}),     // sobrescreve com o que veio do banco
      dividas,          // sempre usa dividas locais (já parseadas)
      contatos: sel?.contatos||[],
      acordos:  sel?.acordos||[],
      valor_original,   // recalculado — nunca perde o valor
      valor_nominal: sel?.valor_nominal || valor_original,
      ...extras,
    };
  }

  async function adicionarDivida(){
    if(!sel)return;
    const total=parseFloat(nd.valor_total)||0;
    if(!total)return alert("Informe o valor.");
    if(!nd.parcelas.length)return alert("Gere as parcelas antes de salvar.");
    const divida={id:Date.now(),descricao:nd.descricao||"Dívida",valor_total:total,data_origem:nd.data_origem,data_vencimento:nd.data_primeira_parcela,parcelas:nd.parcelas,criada_em:new Date().toISOString().slice(0,10),indexador:nd.indexador,multa_pct:parseFloat(nd.multa_pct)||2,juros_am:parseFloat(nd.juros_am)||1,honorarios_pct:parseFloat(nd.honorarios_pct)||20,data_inicio_atualizacao:nd.data_inicio_atualizacao||nd.data_primeira_parcela,despesas:parseFloat(nd.despesas)||0,observacoes:nd.observacoes||""};
    const dividas=[...(sel.dividas||[]),divida];
    const valor_original=dividas.reduce((s,d)=>s+(d.valor_total||0),0);
    try{
      const res=await dbUpdate("devedores",sel.id,{dividas:JSON.stringify(dividas),valor_original});
      const atu=Array.isArray(res)?res[0]:res;
      const parsed=montarDevAtualizado(atu,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));
      setSel(parsed);setNd(DIVIDA_VAZIA);
      alert("✅ Dívida adicionada com sucesso!");
    }catch(e){
      // Salvar localmente mesmo sem banco
      const parsed=montarDevAtualizado(null,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));
      setSel(parsed);setNd(DIVIDA_VAZIA);
      alert("Dívida salva localmente. Erro de sincronização: "+e.message);
    }
  }

  async function toggleParcela(dividaId,parcId,novoStatus){
    if(!sel)return;
    const dividas=(sel.dividas||[]).map(div=>{if(div.id!==dividaId)return div;return{...div,parcelas:div.parcelas.map(p=>p.id!==parcId?p:{...p,status:novoStatus,pago_em:novoStatus==="pago"?new Date().toISOString().slice(0,10):null})};});
    const todasPagas=dividas.every(div=>div.parcelas.every(p=>p.status==="pago"));
    const algumaPaga=dividas.some(div=>div.parcelas.some(p=>p.status==="pago"));
    const nSt=todasPagas?"pago_integral":algumaPaga?"pago_parcial":sel.status;
    try{
      const res=await dbUpdate("devedores",sel.id,{dividas:JSON.stringify(dividas),status:nSt});
      const atu=Array.isArray(res)?res[0]:res;
      const parsed=montarDevAtualizado(atu,dividas,{status:nSt});
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }catch(e){
      const parsed=montarDevAtualizado(null,dividas,{status:nSt});
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }
  }

  async function excluirDivida(dId){
    if(!sel||!window.confirm("Excluir esta dívida?"))return;
    const dividas=(sel.dividas||[]).filter(d=>d.id!==dId);
    const valor_original=dividas.reduce((s,d)=>s+(d.valor_total||0),0);
    try{
      const res=await dbUpdate("devedores",sel.id,{dividas:JSON.stringify(dividas),valor_original});
      const atu=Array.isArray(res)?res[0]:res;
      const parsed=montarDevAtualizado(atu,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }catch(e){
      const parsed=montarDevAtualizado(null,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }
  }

  async function atualizarStatus(novoStatus){
    if(!sel)return;
    try{
      const res=await dbUpdate("devedores",sel.id,{status:novoStatus});
      const atu=Array.isArray(res)?res[0]:res;
      const parsed=montarDevAtualizado(atu,sel.dividas||[],{status:novoStatus});
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }catch(e){
      const parsed={...sel,status:novoStatus};
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));setSel(parsed);
    }
  }

  async function excluirDevedor(d){
    if(!window.confirm(`Excluir "${d.nome}"?`))return;
    await dbDelete("devedores",d.id);
    setDevedores(prev=>prev.filter(x=>x.id!==d.id));
    fecharModal();
  }

  function onAtualizarDevedor(devAtualizado){
    setDevedores(prev=>prev.map(d=>d.id===devAtualizado.id?devAtualizado:d));
    setSel(devAtualizado);
  }

  // ── Filtros ──────────────────────────────────────────────────
  const filtered=devedores.filter(d=>{
    const ok1=(d.nome||"").toLowerCase().includes(search.toLowerCase())||(d.cpf_cnpj||"").includes(search);
    const ok2=!filtroStatus||d.status===filtroStatus;
    const ok3=!filtroCredor||String(d.credor_id)===String(filtroCredor);
    return ok1&&ok2&&ok3;
  });

  const WP_MSGS=d=>[
    {titulo:"Notificação",msg:`Prezado(a) *${d.nome}*, consta débito em aberto.\n\nEntre em contato para regularização.\n\n*MR Cobranças* | (62) 9 9999-0000`},
    {titulo:"Proposta de Acordo",msg:`Olá *${(d.nome||"").split(" ")[0]}*! Condições especiais para quitação.\n\n*MR Cobranças* | (62) 9 9999-0000`},
    {titulo:"Aviso Judicial",msg:`*AVISO — ${d.nome}*\n\nSeu débito foi encaminhado para cobrança judicial.\n\n*Escritório MR Cobranças*`},
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER FICHA INDIVIDUAL
  // ─────────────────────────────────────────────────────────────
  if(modal==="ficha"&&sel){
    const dividas=sel.dividas||[];
    const acordos=sel.acordos||[];
    const contatos=[...(sel.contatos||[])].reverse();
    const credor=credores.find(c=>String(c.id)===String(sel.credor_id));
    const totalNominal=dividas.reduce((s,d)=>s+(d.valor_total||0),0)||sel.valor_original||sel.valor_nominal||0;
    const totalRecuperadoAcordos=calcularTotaisAcordo(acordos).recuperado;
    const procsDevedor=(processos||[]).filter(p=>String(p.devedor_id)===String(sel.id));

    return(
      <div style={{minHeight:"60vh"}}>
        {/* Cabeçalho */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderRadius:16,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <button onClick={fecharModal} style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",border:"none",borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:12,marginBottom:10}}>← Voltar</button>
            <p style={{fontFamily:"Syne",fontWeight:800,fontSize:24,color:"#fff",marginBottom:6}}>{sel.nome}</p>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <BadgeDev status={sel.status}/>
              {credor&&<span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Credor: <b style={{color:"#a5f3fc"}}>{credor.nome?.split(" ").slice(0,3).join(" ")}</b></span>}
              <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Dívida: <b style={{color:"#fbbf24"}}>{fmt(totalNominal)}</b></span>
              {totalRecuperadoAcordos>0&&<span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Recuperado: <b style={{color:"#4ade80"}}>{fmt(totalRecuperadoAcordos)}</b></span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <label style={{fontSize:10,color:"rgba(255,255,255,.5)",display:"block",marginBottom:3,textTransform:"uppercase"}}>Alterar Status</label>
              <select value={sel.status} onChange={e=>atualizarStatus(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"none",fontSize:12,fontFamily:"Mulish",background:"rgba(255,255,255,.1)",color:"#fff",outline:"none"}}>
                {STATUS_DEV.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            {sel.telefone&&<button onClick={()=>abrirWp(sel)} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>📱 WhatsApp</button>}
            <button onClick={()=>excluirDevedor(sel)} style={{background:"rgba(220,38,38,.3)",color:"#fca5a5",border:"1px solid rgba(220,38,38,.4)",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑 Excluir</button>
          </div>
        </div>

        {/* Abas */}
        <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid #f1f5f9",overflowX:"auto"}}>
          {[["dados","📋 Dados"],["contatos","📞 Contatos"],["dividas","💳 Dívidas"],["acordos","🤝 Acordos"],["processos","⚖️ Processos"]].map(([id,label])=>(
            <button key={id} onClick={()=>setAbaFicha(id)}
              style={{padding:"9px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:12,color:abaFicha===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaFicha===id?"#4f46e5":"transparent"}`,marginBottom:-2,whiteSpace:"nowrap"}}>
              {label}
              {id==="acordos"&&acordos.length>0&&<span style={{marginLeft:5,background:"#4f46e5",color:"#fff",borderRadius:99,fontSize:9,padding:"1px 5px"}}>{acordos.length}</span>}
            </button>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,border:"1px solid #f1f5f9"}}>

          {/* ABA DADOS */}
          {abaFicha==="dados"&&!editando&&(
            <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
                <button onClick={()=>{setEditando(true);setFormEdit({...sel,valor_nominal:sel.valor_nominal||sel.valor_original||0});}}
                  style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:9,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>✏️ Editar</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                {[
                  ["Tipo",sel.tipo==="PF"?"Pessoa Física":"Pessoa Jurídica"],
                  ["CPF/CNPJ",sel.cpf_cnpj],
                  ...(sel.tipo==="PF"?[["RG",sel.rg],["Nascimento",fmtDate(sel.data_nascimento)],["Profissão",sel.profissao]]:[["Sócio",sel.socio_nome],["CPF Sócio",sel.socio_cpf]]),
                  ["E-mail",sel.email],["Telefone",sel.telefone],["Telefone 2",sel.telefone2],
                  ["CEP",sel.cep],["Logradouro",sel.logradouro],["Número",sel.numero],
                  ["Bairro",sel.bairro],["Cidade",sel.cidade],["UF",sel.uf],
                  ["Credor",credor?.nome],
                  ["Valor Nominal",sel.valor_nominal||sel.valor_original?fmt(sel.valor_nominal||sel.valor_original):null],
                  ["Origem Dívida",fmtDate(sel.data_origem_divida)],
                  ["Recebimento",fmtDate(sel.data_recebimento_carteira)],
                  ["Responsável",sel.responsavel],["Status",(STATUS_DEV.find(s=>s.v===sel.status)||STATUS_DEV[0]).l],
                ].filter(([,v])=>v&&v!=="—").map(([k,v])=>(
                  <div key={k} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10}}>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>{k}</p>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:13}}>{v||"—"}</p>
                  </div>
                ))}
              </div>
              {sel.descricao_divida&&<div style={{marginTop:10,padding:"10px 14px",background:"#f8fafc",borderRadius:10}}><p style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Descrição da Dívida</p><p style={{fontSize:13,color:"#0f172a"}}>{sel.descricao_divida}</p></div>}
              {sel.observacoes&&<div style={{marginTop:10,padding:"10px 14px",background:"#fef9c3",borderRadius:10}}><p style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Observações</p><p style={{fontSize:13,color:"#0f172a"}}>{sel.observacoes}</p></div>}
              <div style={{display:"flex",gap:8,marginTop:14}}>
                {sel.telefone&&<Btn onClick={()=>abrirWp(sel)}>📱 WhatsApp</Btn>}
                <Btn onClick={()=>excluirDevedor(sel)} danger>🗑 Excluir</Btn>
              </div>
            </div>
          )}

          {/* ABA DADOS — MODO EDIÇÃO */}
          {abaFicha==="dados"&&editando&&(
            <div style={{background:"#f8fafc",borderRadius:16,padding:20,border:"2px solid #4f46e5"}}>
              <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#4f46e5",marginBottom:16}}>✏️ Editando Cadastro</p>
              <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"1px solid #e2e8f0"}}>
                {SECOES.map(([id,label])=>(
                  <button key={id} onClick={()=>setSecaoForm(id)}
                    style={{padding:"6px 14px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:11,color:secaoForm===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${secaoForm===id?"#4f46e5":"transparent"}`,marginBottom:-1}}>
                    {label}
                  </button>
                ))}
              </div>
              {secaoForm==="id"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <INP label="Nome / Razão Social *" value={formEdit.nome||""} onChange={v=>FE("nome",v)} span={2}/>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                    <div style={{display:"flex",gap:8}}>{["PF","PJ"].map(t=><button key={t} onClick={()=>FE("tipo",t)} style={{flex:1,padding:"8px",border:`1.5px solid ${formEdit.tipo===t?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:formEdit.tipo===t?"#4f46e5":"#fff",color:formEdit.tipo===t?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Mulish"}}>{t==="PF"?"👤 PF":"🏢 PJ"}</button>)}</div>
                  </div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CPF / CNPJ</label><input value={formEdit.cpf_cnpj||""} onChange={e=>FE("cpf_cnpj",formEdit.tipo==="PF"?maskCPF(e.target.value):maskCNPJ(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/></div>
                  {formEdit.tipo==="PF"?(<><INP label="RG" value={formEdit.rg||""} onChange={v=>FE("rg",v)}/><INP label="Data de Nascimento" value={formEdit.data_nascimento||""} onChange={v=>FE("data_nascimento",v)} type="date"/><INP label="Profissão" value={formEdit.profissao||""} onChange={v=>FE("profissao",v)} span={2}/></>):(<><INP label="Sócio / Responsável" value={formEdit.socio_nome||""} onChange={v=>FE("socio_nome",v)} span={2}/><INP label="CPF do Sócio" value={formEdit.socio_cpf||""} onChange={v=>FE("socio_cpf",maskCPF(v))}/></>)}
                  <INP label="E-mail" value={formEdit.email||""} onChange={v=>FE("email",v)} type="email"/>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone</label><input value={formEdit.telefone||""} onChange={e=>FE("telefone",maskTel(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/></div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone 2</label><input value={formEdit.telefone2||""} onChange={e=>FE("telefone2",maskTel(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/></div>
                </div>
              )}
              {secaoForm==="end"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CEP</label><div style={{display:"flex",gap:8}}><input value={formEdit.cep||""} onChange={e=>FE("cep",maskCEP(e.target.value))} placeholder="00000-000" style={{flex:1,padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"monospace"}}/><button onClick={buscarCEPEdit} disabled={buscandoCEPEdit} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:9,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{buscandoCEPEdit?"⏳":"🔍"}</button></div></div>
                  <INP label="UF" value={formEdit.uf||"GO"} onChange={v=>FE("uf",v)} opts={UFS.map(u=>({v:u,l:u}))}/>
                  <INP label="Logradouro" value={formEdit.logradouro||""} onChange={v=>FE("logradouro",v)} span={2}/>
                  <INP label="Número" value={formEdit.numero||""} onChange={v=>FE("numero",v)}/>
                  <INP label="Complemento" value={formEdit.complemento||""} onChange={v=>FE("complemento",v)}/>
                  <INP label="Bairro" value={formEdit.bairro||""} onChange={v=>FE("bairro",v)}/>
                  <INP label="Cidade" value={formEdit.cidade||""} onChange={v=>FE("cidade",v)}/>
                </div>
              )}
              {secaoForm==="divida"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <INP label="Credor" value={formEdit.credor_id||""} onChange={v=>FE("credor_id",v)} opts={[{v:"",l:"— Nenhum —"},...credores.map(c=>({v:c.id,l:c.nome}))]} span={2}/>
                  <INP label="Valor Nominal (R$)" value={formEdit.valor_nominal||""} onChange={v=>FE("valor_nominal",v)} type="number"/>
                  <INP label="Data de Origem" value={formEdit.data_origem_divida||""} onChange={v=>FE("data_origem_divida",v)} type="date"/>
                  <INP label="Recebimento Carteira" value={formEdit.data_recebimento_carteira||""} onChange={v=>FE("data_recebimento_carteira",v)} type="date" span={2}/>
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição / Origem</label><textarea value={formEdit.descricao_divida||""} onChange={e=>FE("descricao_divida",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/></div>
                </div>
              )}
              {secaoForm==="ctrl"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <INP label="Status" value={formEdit.status||"novo"} onChange={v=>FE("status",v)} opts={STATUS_DEV.map(s=>({v:s.v,l:s.l}))} span={2}/>
                  <INP label="Responsável" value={formEdit.responsavel||""} onChange={v=>FE("responsavel",v)} span={2}/>
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label><textarea value={formEdit.observacoes||""} onChange={e=>FE("observacoes",e.target.value)} rows={4} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/></div>
                </div>
              )}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <Btn onClick={salvarEdicao} disabled={loadingEdit}>{loadingEdit?"Salvando...":"💾 Salvar Alterações"}</Btn>
                <Btn onClick={()=>setEditando(false)} outline color="#64748b">Cancelar</Btn>
              </div>
            </div>
          )}

          {/* ABA CONTATOS */}
          {abaFicha==="contatos"&&(
            <div>
              <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginBottom:16,border:"1.5px dashed #e2e8f0"}}>
                <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:10}}>+ Registrar Contato</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <INP label="Tipo de Contato" value={novoContato.tipo} onChange={v=>setNovoContato(c=>({...c,tipo:v}))} opts={[{v:"ligacao",l:"📞 Ligação"},{v:"whatsapp",l:"📱 WhatsApp"},{v:"email",l:"📧 E-mail"},{v:"carta",l:"✉️ Carta"},{v:"visita",l:"🚗 Visita"},{v:"outro",l:"🔹 Outro"}]}/>
                  <INP label="Resultado" value={novoContato.resultado} onChange={v=>setNovoContato(c=>({...c,resultado:v}))} opts={[{v:"sem_resposta",l:"Sem resposta"},{v:"numero_invalido",l:"Número inválido"},{v:"contato_estabelecido",l:"Contato estabelecido"},{v:"recusou_negociar",l:"Recusou negociar"},{v:"demonstrou_interesse",l:"Demonstrou interesse"},{v:"acordo_verbal",l:"Acordo verbal"},{v:"outro",l:"Outro"}]}/>
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label><textarea value={novoContato.obs} onChange={e=>setNovoContato(c=>({...c,obs:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/></div>
                </div>
                <Btn onClick={registrarContato}>✅ Registrar</Btn>
              </div>
              {contatos.length===0?<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:24}}>Nenhum contato registrado.</p>:contatos.map(c=>(
                <div key={c.id} style={{border:"1px solid #f1f5f9",borderRadius:12,padding:12,marginBottom:8,background:"#fafafe"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#ede9fe",color:"#4f46e5"}}>{c.tipo}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#f1f5f9",color:"#475569"}}>{c.resultado}</span>
                    </div>
                    <span style={{fontSize:10,color:"#94a3b8"}}>{c.data} · {c.responsavel}</span>
                  </div>
                  {c.obs&&<p style={{fontSize:12,color:"#64748b",marginTop:6,fontStyle:"italic"}}>{c.obs}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ABA DÍVIDAS */}
          {abaFicha==="dividas"&&(
            <div>
              {dividas.length===0&&<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:24,background:"#f8fafc",borderRadius:12}}>Nenhuma dívida cadastrada.</p>}
              {dividas.map(div=>{
                const pct=div.parcelas?.length>0?Math.round(div.parcelas.filter(p=>p.status==="pago").length/div.parcelas.length*100):0;
                return(
                  <div key={div.id} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <p style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{div.descricao}</p>
                        <p style={{fontSize:11,color:"#64748b"}}>{div.parcelas?.length||0} parcelas · <b style={{color:"#4f46e5"}}>{fmt(div.valor_total)}</b> · {pct}% pago</p>
                        {div.indexador&&<p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Índice: {div.indexador?.toUpperCase()} · Juros: {div.juros_am}%am · Multa: {div.multa_pct}% · Honorários: {div.honorarios_pct}%</p>}
                      </div>
                      <button onClick={()=>excluirDivida(div.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:10}}>🗑</button>
                    </div>
                    <div style={{height:4,background:"#f1f5f9",borderRadius:99,marginBottom:10}}><div style={{height:4,width:`${pct}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:99}}/></div>
                    <div style={{maxHeight:160,overflowY:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:"#f8fafc"}}>{["Nº","Valor","Vencimento","Status",""].map(h=><th key={h} style={{padding:"5px 8px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
                        <tbody>{(div.parcelas||[]).map((p,pi)=>{
                          const atr=p.status==="pendente"&&new Date((p.venc||p.vencimento)+"T12:00:00")<new Date();
                          const sR=atr?"atrasado":p.status;
                          const cS={pago:"#16a34a",atrasado:"#dc2626",pendente:"#64748b"};
                          const bS={pago:"#dcfce7",atrasado:"#fee2e2",pendente:"#f1f5f9"};
                          return(
                            <tr key={p.id} style={{borderTop:"1px solid #f8fafc"}}>
                              <td style={{padding:"5px 8px",fontWeight:700}}>{pi+1}</td>
                              <td style={{padding:"5px 8px",color:"#4f46e5",fontWeight:700}}>{fmt(p.valor)}</td>
                              <td style={{padding:"5px 8px",color:"#64748b"}}>{fmtDate(p.venc||p.vencimento)}</td>
                              <td style={{padding:"5px 8px"}}><span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99,background:bS[sR]||"#f1f5f9",color:cS[sR]||"#64748b"}}>{sR==="pago"?"Pago":sR==="atrasado"?"Atrasado":"Pendente"}</span></td>
                              <td style={{padding:"5px 8px"}}>{p.status!=="pago"?<button onClick={()=>toggleParcela(div.id,p.id,"pago")} style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:5,padding:"2px 7px",cursor:"pointer",fontSize:10,fontWeight:700}}>✓</button>:<button onClick={()=>toggleParcela(div.id,p.id,"pendente")} style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:5,padding:"2px 7px",cursor:"pointer",fontSize:10}}>↩</button>}</td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              {/* Formulário nova dívida */}
              <div style={{background:"#f8fafc",borderRadius:14,padding:16,border:"1.5px dashed #e2e8f0",marginTop:8}}>
                <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>➕ Nova Dívida</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Inp label="Descrição" value={nd.descricao} onChange={v=>ND("descricao",v)} span={2}/>
                  <Inp label="Valor Total (R$)" value={nd.valor_total} onChange={v=>ND("valor_total",v)} type="number"/>
                  <Inp label="Data de Origem" value={nd.data_origem} onChange={v=>ND("data_origem",v)} type="date"/>
                </div>
                <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:12,marginBottom:10}}>
                  <p style={{fontSize:10,fontWeight:700,color:"#4f46e5",textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>📋 Diretrizes do Contrato</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Inp label="Índice" value={nd.indexador} onChange={v=>ND("indexador",v)} options={[{v:"igpm",l:"IGP-M"},{v:"ipca",l:"IPCA"},{v:"selic",l:"SELIC"},{v:"inpc",l:"INPC"},{v:"nenhum",l:"Sem correção"}]}/>
                    <Inp label="Data Início Atualização" value={nd.data_inicio_atualizacao} onChange={v=>ND("data_inicio_atualizacao",v)} type="date"/>
                    <Inp label="Multa (%)" value={nd.multa_pct} onChange={v=>ND("multa_pct",v)} type="number"/>
                    <Inp label="Juros (%am)" value={nd.juros_am} onChange={v=>ND("juros_am",v)} type="number"/>
                    <Inp label="Honorários (%)" value={nd.honorarios_pct} onChange={v=>ND("honorarios_pct",v)} type="number"/>
                    <Inp label="Despesas (R$)" value={nd.despesas} onChange={v=>ND("despesas",v)} type="number"/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Inp label="Data da 1ª Parcela" value={nd.data_primeira_parcela} onChange={v=>ND("data_primeira_parcela",v)} type="date"/>
                  <Inp label="Nº de Parcelas" value={nd.qtd_parcelas} onChange={v=>ND("qtd_parcelas",v)} type="number"/>
                </div>
                {nd.valor_total&&nd.qtd_parcelas&&<div style={{background:"#ede9fe",borderRadius:8,padding:"6px 12px",marginBottom:10,fontSize:12}}><b style={{color:"#4f46e5"}}>{nd.qtd_parcelas}x de {fmt((parseFloat(nd.valor_total)||0)/parseInt(nd.qtd_parcelas||1))}</b></div>}
                <Btn onClick={confirmarParcelas} outline color="#4f46e5">🔄 Gerar Parcelas</Btn>
                {nd.parcelas.length>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{maxHeight:180,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:"#f8fafc"}}>{["Nº","Valor (R$)","Vencimento",""].map(h=><th key={h} style={{padding:"6px 9px",textAlign:"left",color:"#64748b",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
                        <tbody>{nd.parcelas.map((p,i)=>(
                          <tr key={p.id} style={{borderTop:"1px solid #f8fafc"}}>
                            <td style={{padding:"5px 9px",fontWeight:700}}>{i+1}</td>
                            <td style={{padding:"5px 9px"}}><input type="number" value={p.valor} onChange={e=>editParc(p.id,"valor",e.target.value)} style={{width:85,padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:12,fontWeight:700,color:"#4f46e5",outline:"none"}}/></td>
                            <td style={{padding:"5px 9px"}}><input type="date" value={p.venc} onChange={e=>editParc(p.id,"venc",e.target.value)} style={{padding:"3px 6px",border:"1.5px solid #e2e8f0",borderRadius:6,fontSize:11,outline:"none"}}/></td>
                            <td style={{padding:"5px 9px"}}><button onClick={()=>remParc(p.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:5,padding:"2px 6px",cursor:"pointer",fontSize:10}}>✕</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                      <button onClick={addParc} style={{background:"#f1f5f9",color:"#475569",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Parcela</button>
                      <span style={{fontSize:11,color:"#94a3b8"}}>Total: <b style={{color:"#4f46e5"}}>{fmt(nd.parcelas.reduce((s,p)=>s+p.valor,0))}</b></span>
                      <div style={{flex:1}}/>
                      <Btn onClick={adicionarDivida} color="#059669">💾 Salvar Dívida</Btn>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA ACORDOS */}
          {abaFicha==="acordos"&&(
            <AbaAcordos
              devedor={sel}
              acordos={sel.acordos||[]}
              credores={credores}
              user={user}
              onAtualizarDevedor={onAtualizarDevedor}
            />
          )}

          {/* ABA PROCESSOS */}
          {abaFicha==="processos"&&(
            <div>
              {procsDevedor.length===0?(
                <div style={{textAlign:"center",padding:32,color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:12}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚖️</div>
                  <p>Nenhum processo vinculado.</p>
                  <button onClick={()=>{fecharModal();setTab&&setTab("processos");}} style={{marginTop:14,background:"#4f46e5",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Mulish"}}>+ Cadastrar Processo</button>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#0f172a"}}>{procsDevedor.length} processo(s)</p>
                    <button onClick={()=>{fecharModal();setTab&&setTab("processos");}} style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Mulish"}}>+ Novo</button>
                  </div>
                  {procsDevedor.map(p=>(
                    <div key={p.id} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:16,marginBottom:10,background:"#fff"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div><p style={{fontFamily:"monospace",fontSize:12,color:"#4f46e5",fontWeight:700,marginBottom:2}}>{p.numero}</p><p style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{p.tipo||"Execução"}</p></div>
                        <span style={{fontSize:13,fontWeight:800,color:"#4f46e5"}}>{fmt(p.valor)}</span>
                      </div>
                      <div style={{display:"flex",gap:16,fontSize:11,color:"#64748b",flexWrap:"wrap"}}>
                        {p.vara&&<span>🏛 {p.vara}</span>}{p.fase&&<span>📌 {p.fase}</span>}{p.data_distribuicao&&<span>📅 {fmtDate(p.data_distribuicao)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Modal */}
        {wp&&(
          <Modal title={`WhatsApp — ${wp.nome}`} onClose={fecharWp}>
            {WP_MSGS(wp).map((m,i)=>(
              <div key={i} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:10}}>
                <p style={{fontWeight:700,color:"#0f172a",fontSize:13,marginBottom:8}}>{m.titulo}</p>
                <p style={{fontSize:11,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#f8fafc",padding:10,borderRadius:8,marginBottom:10}}>{m.msg}</p>
                <a href={`https://wa.me/55${phoneFmt(wp.telefone)}?text=${encodeURIComponent(m.msg)}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"#16a34a",color:"#fff",borderRadius:9,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>{I.wp} Abrir no WhatsApp</a>
              </div>
            ))}
          </Modal>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER LISTAGEM
  // ─────────────────────────────────────────────────────────────
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <h2 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a"}}>Devedores</h2>
        <Btn onClick={()=>{setForm({...FORM_DEV_VAZIO,responsavel:user?.nome||""});setSecaoForm("id");abrirModal("novo")}}>{I.plus} Novo Devedor</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,marginBottom:16,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Credor</label>
          <select value={filtroCredor} onChange={e=>setFiltroCredor(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todos os credores</option>
            {credores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Status</label>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todos os status</option>
            {STATUS_DEV.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Buscar</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou CPF/CNPJ..." style={{padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Mulish",minWidth:200}}/>
        </div>
      </div>

      {/* Tabela */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8fafc"}}>
              {["Nome","CPF/CNPJ","Credor","Status","Valor Dívida","Acordos","Ações"].map(h=>(
                <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".05em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0&&(
              <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:"#94a3b8",fontSize:13}}>Nenhum devedor encontrado.</td></tr>
            )}
            {filtered.map(d=>{
              const cr=credores.find(c=>String(c.id)===String(d.credor_id));
              const acordosDev=d.acordos||[];
              const totais=calcularTotaisAcordo(acordosDev);
              const valorDiv=d.dividas?.reduce((s,div)=>s+(div.valor_total||0),0)||d.valor_original||d.valor_nominal||0;
              return(
                <tr key={d.id} style={{borderTop:"1px solid #f8fafc",cursor:"pointer"}} onClick={()=>abrirModal("ficha",d)}
                  onMouseEnter={e=>e.currentTarget.style.background="#fafafe"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <td style={{padding:"12px 16px"}}>
                    <p style={{fontWeight:700,color:"#0f172a",fontSize:13}}>{d.nome}</p>
                    <p style={{fontSize:10,color:"#94a3b8"}}>{d.tipo==="PF"?"PF":"PJ"} · {d.cidade||"—"}</p>
                  </td>
                  <td style={{padding:"12px 16px",fontFamily:"monospace",fontSize:12,color:"#475569"}}>{d.cpf_cnpj||"—"}</td>
                  <td style={{padding:"12px 16px",fontSize:12,color:"#64748b"}}>{cr?.nome?.split(" ")[0]||"—"}</td>
                  <td style={{padding:"12px 16px"}}><BadgeDev status={d.status}/></td>
                  <td style={{padding:"12px 16px"}}>
                    <p style={{fontWeight:700,color:"#4f46e5",fontSize:13}}>{fmt(valorDiv)}</p>
                    {totais.recuperado>0&&<p style={{fontSize:10,color:"#16a34a"}}>✓ {fmt(totais.recuperado)} rec.</p>}
                  </td>
                  <td style={{padding:"12px 16px",fontSize:12,color:"#64748b"}}>
                    {acordosDev.length>0?<span style={{background:"#ede9fe",color:"#4f46e5",borderRadius:99,padding:"2px 8px",fontSize:10,fontWeight:700}}>{acordosDev.length} acordo{acordosDev.length>1?"s":""}</span>:"—"}
                  </td>
                  <td style={{padding:"12px 16px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:6}}>
                      {d.telefone&&<button onClick={()=>abrirWp(d)} style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:12}} title="WhatsApp">{I.wp}</button>}
                      <button onClick={()=>abrirModal("ficha",d)} style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:11,fontWeight:700}}>Ver →</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"10px 16px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8"}}>{filtered.length} de {devedores.length} devedores</p>
          {(filtroStatus||filtroCredor||search)&&<button onClick={()=>{setFiltroStatus("");setFiltroCredor("");setSearch("");}} style={{fontSize:11,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>✕ Limpar filtros</button>}
        </div>
      </div>

      {/* Modal novo devedor */}
      {modal==="novo"&&(
        <Modal title="Novo Devedor" onClose={fecharModal} width={640}>
          {/* Navegação entre seções */}
          <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"1px solid #e2e8f0"}}>
            {SECOES.map(([id,label],i)=>(
              <button key={id} onClick={()=>setSecaoForm(id)}
                style={{flex:1,padding:"8px 4px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:11,color:secaoForm===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${secaoForm===id?"#4f46e5":"transparent"}`,marginBottom:-1,textAlign:"center"}}>
                {label}
              </button>
            ))}
          </div>

          {secaoForm==="id"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <INP label="Nome / Razão Social *" value={form.nome} onChange={v=>F("nome",v)} span={2}/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                <div style={{display:"flex",gap:8}}>{["PF","PJ"].map(t=><button key={t} onClick={()=>F("tipo",t)} style={{flex:1,padding:"8px",border:`1.5px solid ${form.tipo===t?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:form.tipo===t?"#4f46e5":"#fff",color:form.tipo===t?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Mulish"}}>{t==="PF"?"👤 Pessoa Física":"🏢 Pessoa Jurídica"}</button>)}</div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CPF / CNPJ</label>
                <input value={form.cpf_cnpj} onChange={e=>F("cpf_cnpj",form.tipo==="PF"?maskCPF(e.target.value):maskCNPJ(e.target.value))} placeholder={form.tipo==="PF"?"000.000.000-00":"00.000.000/0000-00"} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>
              {form.tipo==="PF"?(<><INP label="RG" value={form.rg} onChange={v=>F("rg",v)}/><INP label="Data de Nascimento" value={form.data_nascimento} onChange={v=>F("data_nascimento",v)} type="date"/><INP label="Profissão" value={form.profissao} onChange={v=>F("profissao",v)} span={2}/></>):(<><INP label="Sócio / Responsável" value={form.socio_nome} onChange={v=>F("socio_nome",v)} span={2}/><INP label="CPF do Sócio" value={form.socio_cpf} onChange={v=>F("socio_cpf",maskCPF(v))}/></>)}
              <INP label="E-mail" value={form.email} onChange={v=>F("email",v)} type="email"/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone Principal (WhatsApp)</label>
                <input value={form.telefone} onChange={e=>F("telefone",maskTel(e.target.value))} placeholder="(62) 9 0000-0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone Secundário</label>
                <input value={form.telefone2} onChange={e=>F("telefone2",maskTel(e.target.value))} placeholder="(62) 9 0000-0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
              </div>
            </div>
          )}
          {secaoForm==="end"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CEP</label>
                <div style={{display:"flex",gap:8}}>
                  <input value={form.cep} onChange={e=>F("cep",maskCEP(e.target.value))} placeholder="00000-000" style={{flex:1,padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"monospace"}}/>
                  <button onClick={buscarCep} disabled={buscandoCep} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:9,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{buscandoCep?"⏳":"🔍 Buscar"}</button>
                </div>
              </div>
              <INP label="UF" value={form.uf} onChange={v=>F("uf",v)} opts={UFS.map(u=>({v:u,l:u}))}/>
              <INP label="Logradouro" value={form.logradouro} onChange={v=>F("logradouro",v)} span={2}/>
              <INP label="Número" value={form.numero} onChange={v=>F("numero",v)}/>
              <INP label="Complemento" value={form.complemento} onChange={v=>F("complemento",v)}/>
              <INP label="Bairro" value={form.bairro} onChange={v=>F("bairro",v)}/>
              <INP label="Cidade" value={form.cidade} onChange={v=>F("cidade",v)}/>
            </div>
          )}
          {secaoForm==="divida"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <INP label="Credor Vinculado" value={form.credor_id} onChange={v=>F("credor_id",v)} opts={[{v:"",l:"— Nenhum —"},...credores.map(c=>({v:c.id,l:c.nome}))]} span={2}/>
              <INP label="Valor Nominal (R$)" value={form.valor_nominal} onChange={v=>F("valor_nominal",v)} type="number"/>
              <INP label="Data de Origem da Dívida" value={form.data_origem_divida} onChange={v=>F("data_origem_divida",v)} type="date"/>
              <INP label="Data de Recebimento da Carteira" value={form.data_recebimento_carteira} onChange={v=>F("data_recebimento_carteira",v)} type="date" span={2}/>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição / Origem</label>
                <textarea value={form.descricao_divida} onChange={e=>F("descricao_divida",e.target.value)} placeholder="Ex: Contrato de Compra e Venda nº 001/2023" rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
              </div>
            </div>
          )}
          {secaoForm==="ctrl"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:13}}>
              <INP label="Status" value={form.status} onChange={v=>F("status",v)} opts={STATUS_DEV.map(s=>({v:s.v,l:s.l}))}/>
              <INP label="Responsável pelo Caso" value={form.responsavel} onChange={v=>F("responsavel",v)}/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
                <textarea value={form.observacoes} onChange={e=>F("observacoes",e.target.value)} placeholder="Informações adicionais..." rows={4} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
              </div>
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20,paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
            <div style={{display:"flex",gap:8}}>
              {SECOES.findIndex(([id])=>id===secaoForm)>0&&(
                <Btn onClick={()=>setSecaoForm(SECOES[SECOES.findIndex(([id])=>id===secaoForm)-1][0])} outline color="#64748b">← Anterior</Btn>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              {SECOES.findIndex(([id])=>id===secaoForm)<SECOES.length-1?(
                <Btn onClick={()=>setSecaoForm(SECOES[SECOES.findIndex(([id])=>id===secaoForm)+1][0])}>Próximo →</Btn>
              ):(
                <Btn onClick={salvarDevedor} disabled={loading}>{loading?"Salvando...":"💾 Cadastrar Devedor"}</Btn>
              )}
              <Btn onClick={fecharModal} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* WhatsApp Modal */}
      {wp&&(
        <Modal title={`WhatsApp — ${wp.nome}`} onClose={fecharWp}>
          {WP_MSGS(wp).map((m,i)=>(
            <div key={i} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:10}}>
              <p style={{fontWeight:700,color:"#0f172a",fontSize:13,marginBottom:8}}>{m.titulo}</p>
              <p style={{fontSize:11,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#f8fafc",padding:10,borderRadius:8,marginBottom:10}}>{m.msg}</p>
              <a href={`https://wa.me/55${phoneFmt(wp.telefone)}?text=${encodeURIComponent(m.msg)}`} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:"#16a34a",color:"#fff",borderRadius:9,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>{I.wp} Abrir no WhatsApp</a>
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
// PROCESSOS — Módulo completo expandido
// ═══════════════════════════════════════════════════════════════
const PROC_TIPOS   = ["Cumprimento de Sentença","Execução de Título","Execução Fiscal","Agravo de Instrumento","Agravo Interno","Recurso Especial","Recurso Extraordinário","Ação de Cobrança","Ação de Despejo","Embargos de Declaração","Mandado de Segurança","Outro"];
const PROC_FASES   = ["Citação","Contestação","Instrução","Sentença","Recurso","Penhora","Avaliação","Leilão","Pagamento","Encerrado"];
const PROC_STATUS  = ["em_andamento","aguardando","encerrado","suspenso"];
const PROC_INST    = ["1ª Instância","2ª Instância / Câmara","STJ","STF"];
const PROC_TRIB    = ["TJGO","JFGO (TRF1)","TJDF","TJSP","TJRJ","TJMG","TJMT","TJMS","TJPR","TJBA","STJ","STF","Outro"];
const AND_TIPOS    = ["Citação","Contestação","Audiência","Decisão Interlocutória","Sentença","Recurso","Penhora","Leilão","Extinção","Petição","Despacho","Pagamento","Outros"];

const FORM_PROC_VAZIO = {
  numero:"", numero_origem:"", devedor_id:"", credor_id:"",
  tipo:"Cumprimento de Sentença", fase:"Citação", instancia:"1ª Instância",
  tribunal:"TJGO", vara:"", valor:"", status:"em_andamento",
  data_ajuizamento:"", data_distribuicao:"", proximo_prazo:"", observacoes:"",
};

// Badge de status para processos
function BadgeProc({ status }) {
  const map = {
    em_andamento:{ bg:"#dbeafe", cor:"#1d4ed8", l:"Em Andamento" },
    aguardando:  { bg:"#fef3c7", cor:"#d97706", l:"Aguardando"   },
    encerrado:   { bg:"#dcfce7", cor:"#065f46", l:"Encerrado"    },
    suspenso:    { bg:"#f1f5f9", cor:"#64748b", l:"Suspenso"     },
  };
  const s = map[status]||map.em_andamento;
  return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:99,background:s.bg,color:s.cor}}>{s.l}</span>;
}

function Processos({ processos, setProcessos, devedores, credores, andamentos, setAndamentos, user }) {
  const hoje = new Date().toISOString().slice(0,10);
  const [search, setSearch]   = useState("");
  const [filtroCredor, setFiltroCredor]   = useState("");
  const [filtroFase, setFiltroFase]       = useState("");
  const [filtroTrib, setFiltroTrib]       = useState("");
  const [modal, setModal]     = useState(false);  // novo processo
  const [fichaId, setFichaId] = useState(null);   // id do processo em detalhe
  const [abaFicha, setAbaFicha] = useState("dados");
  const [editando, setEditando] = useState(false);
  const [form, setForm]       = useState({...FORM_PROC_VAZIO});
  const [formEdit, setFormEdit] = useState({});
  const [andForm, setAndForm] = useState({ tipo:"Citação", descricao:"", data:hoje, prazo:"", responsavel:user?.nome||"" });
  const [loading, setLoading] = useState(false);
  const F  = (k,v) => setForm(f=>({...f,[k]:v}));
  const FE = (k,v) => setFormEdit(f=>({...f,[k]:v}));

  const sel = fichaId ? processos.find(p=>p.id===fichaId) : null;

  // ── Filtros ───────────────────────────────────────────────────
  const filtered = processos.filter(p=>{
    const dev = devedores.find(d=>d.id===p.devedor_id);
    const ok1 = (p.numero||"").includes(search)||(dev?.nome||"").toLowerCase().includes(search.toLowerCase());
    const ok2 = !filtroCredor || String(p.credor_id)===String(filtroCredor);
    const ok3 = !filtroFase   || p.fase===filtroFase;
    const ok4 = !filtroTrib   || p.tribunal===filtroTrib;
    return ok1&&ok2&&ok3&&ok4;
  });

  // ── Cor de prazo na tabela ────────────────────────────────────
  function corPrazo(prazo) {
    if(!prazo) return null;
    const dias = Math.ceil((new Date(prazo+"T12:00:00")-new Date())/86400000);
    if(dias<=7)  return "#fee2e2"; // vermelho
    if(dias<=15) return "#fef3c7"; // amarelo
    return null;
  }

  // ── Salvar novo processo ──────────────────────────────────────
  async function salvarProcesso() {
    if(!form.numero.trim()) return alert("Informe o número do processo.");
    setLoading(true);
    try {
      const payload = {
        numero:form.numero, numero_origem:form.numero_origem||null,
        devedor_id:form.devedor_id?parseInt(form.devedor_id):null,
        credor_id:form.credor_id?parseInt(form.credor_id):null,
        tipo:form.tipo, fase:form.fase, instancia:form.instancia,
        tribunal:form.tribunal, vara:form.vara,
        valor:parseFloat(form.valor)||0, status:form.status,
        data_ajuizamento:form.data_ajuizamento||null,
        data_distribuicao:form.data_distribuicao||null,
        proximo_prazo:form.proximo_prazo||null,
        observacoes:form.observacoes||null,
      };
      const res = await dbInsert("processos", payload);
      const novo = Array.isArray(res)?res[0]:res;
      if(novo?.id) {
        setProcessos(p=>[...p, novo]);
        setModal(false);
        setForm({...FORM_PROC_VAZIO});
        alert("✅ Processo cadastrado!");
      } else {
        // fallback local
        setProcessos(p=>[...p,{...payload,id:Date.now()}]);
        setModal(false);
        setForm({...FORM_PROC_VAZIO});
      }
    } catch(e) {
      setProcessos(p=>[...p,{...form,id:Date.now(),valor:parseFloat(form.valor)||0}]);
      setModal(false);
      setForm({...FORM_PROC_VAZIO});
    }
    setLoading(false);
  }

  // ── Salvar edição ─────────────────────────────────────────────
  async function salvarEdicao() {
    if(!sel) return;
    try {
      const payload = {
        numero:formEdit.numero, numero_origem:formEdit.numero_origem||null,
        devedor_id:formEdit.devedor_id?parseInt(formEdit.devedor_id):null,
        credor_id:formEdit.credor_id?parseInt(formEdit.credor_id):null,
        tipo:formEdit.tipo, fase:formEdit.fase, instancia:formEdit.instancia,
        tribunal:formEdit.tribunal, vara:formEdit.vara,
        valor:parseFloat(formEdit.valor)||0, status:formEdit.status,
        data_ajuizamento:formEdit.data_ajuizamento||null,
        data_distribuicao:formEdit.data_distribuicao||null,
        proximo_prazo:formEdit.proximo_prazo||null,
        observacoes:formEdit.observacoes||null,
      };
      const res = await dbUpdate("processos", sel.id, payload);
      const atu = Array.isArray(res)?res[0]:res;
      const atualizado = atu?.id ? atu : {...sel,...payload};
      setProcessos(prev=>prev.map(p=>p.id===sel.id?atualizado:p));
      setFichaId(atualizado.id);
      setEditando(false);
      alert("Processo atualizado!");
    } catch(e) {
      setProcessos(prev=>prev.map(p=>p.id===sel.id?{...sel,...formEdit}:p));
      setEditando(false);
    }
  }

  // ── Registrar andamento ───────────────────────────────────────
  async function addAnd() {
    if(!sel||!andForm.descricao.trim()) return alert("Informe a descrição do andamento.");
    const novoAnd = {
      ...andForm, id:Date.now(), processo_id:sel.id,
      responsavel:user?.nome||"Sistema",
      data:andForm.data||hoje,
    };
    // Atualizar proximo_prazo do processo se houver prazo no andamento
    if(andForm.prazo) {
      try { await dbUpdate("processos",sel.id,{proximo_prazo:andForm.prazo}); } catch(e){}
      setProcessos(prev=>prev.map(p=>p.id===sel.id?{...p,proximo_prazo:andForm.prazo}:p));
    }
    try {
      const res = await dbInsert("andamentos", novoAnd);
      const salvo = Array.isArray(res)?res[0]:res;
      setAndamentos(p=>[...p, salvo?.id?salvo:novoAnd]);
    } catch(e) {
      setAndamentos(p=>[...p, novoAnd]);
    }
    setAndForm({ tipo:"Citação", descricao:"", data:hoje, prazo:"", responsavel:user?.nome||"" });
  }

  async function excluirProcesso(id) {
    if(!window.confirm("Excluir este processo?")) return;
    try { await dbDelete("processos",id); } catch(e){}
    setProcessos(prev=>prev.filter(p=>p.id!==id));
    setFichaId(null);
  }

  // ── Andamentos do processo selecionado ────────────────────────
  const procAnds = sel
    ? andamentos.filter(a=>a.processo_id===sel.id).sort((a,b)=>new Date(b.data)-new Date(a.data))
    : [];

  const proximoPrazoGlobal = sel?.proximo_prazo ||
    procAnds.find(a=>a.prazo&&a.prazo>=hoje)?.prazo || null;

  // ─────────────────────────────────────────────────────────────
  // RENDER FICHA DO PROCESSO
  // ─────────────────────────────────────────────────────────────
  if(fichaId && sel) {
    const dev  = devedores.find(d=>d.id===sel.devedor_id||String(d.id)===String(sel.devedor_id));
    const cred = credores.find(c=>c.id===sel.credor_id||String(c.id)===String(sel.credor_id));
    const diasPrazo = sel.proximo_prazo ? Math.ceil((new Date(sel.proximo_prazo+"T12:00:00")-new Date())/86400000) : null;
    const urgente = diasPrazo!==null && diasPrazo<=7;

    return (
      <div>
        {/* Cabeçalho */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderRadius:16,padding:"20px 24px",marginBottom:20}}>
          <button onClick={()=>{setFichaId(null);setEditando(false);}} style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",border:"none",borderRadius:7,padding:"4px 12px",cursor:"pointer",fontSize:12,marginBottom:10}}>← Voltar</button>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
            <div>
              <p style={{fontFamily:"monospace",fontSize:13,color:"#a5f3fc",fontWeight:700,marginBottom:4}}>{sel.numero}</p>
              <p style={{fontFamily:"Syne",fontWeight:800,fontSize:20,color:"#fff",marginBottom:6}}>{dev?.nome||"Devedor não vinculado"}</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <BadgeProc status={sel.status}/>
                <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Tipo: <b style={{color:"#e0e7ff"}}>{sel.tipo}</b></span>
                <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Fase: <b style={{color:"#fbbf24"}}>{sel.fase}</b></span>
                <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Valor: <b style={{color:"#4ade80"}}>{fmt(sel.valor)}</b></span>
                {diasPrazo!==null&&(
                  <span style={{fontSize:12,fontWeight:700,color:urgente?"#fca5a5":"#fde68a"}}>
                    ⚑ Prazo: {fmtDate(sel.proximo_prazo)} ({diasPrazo}d)
                  </span>
                )}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>excluirProcesso(sel.id)} style={{background:"rgba(220,38,38,.3)",color:"#fca5a5",border:"1px solid rgba(220,38,38,.4)",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑 Excluir</button>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid #f1f5f9"}}>
          {[["dados","📋 Dados do Processo"],["andamentos","📌 Andamentos"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setAbaFicha(id);setEditando(false);}}
              style={{padding:"9px 20px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:13,color:abaFicha===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaFicha===id?"#4f46e5":"transparent"}`,marginBottom:-2}}>
              {label}
              {id==="andamentos"&&procAnds.length>0&&<span style={{marginLeft:5,background:"#4f46e5",color:"#fff",borderRadius:99,fontSize:9,padding:"1px 5px"}}>{procAnds.length}</span>}
            </button>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:20,border:"1px solid #f1f5f9"}}>

          {/* ABA DADOS */}
          {abaFicha==="dados"&&!editando&&(
            <div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
                <button onClick={()=>{setEditando(true);setFormEdit({...sel});}}
                  style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:9,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>✏️ Editar</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>
                {[
                  ["Número do Processo", sel.numero],
                  ["Número de Origem", sel.numero_origem],
                  ["Devedor", dev?.nome],
                  ["Credor", cred?.nome],
                  ["Tipo", sel.tipo],
                  ["Fase", sel.fase],
                  ["Instância", sel.instancia],
                  ["Tribunal", sel.tribunal],
                  ["Vara / Câmara", sel.vara],
                  ["Valor", fmt(sel.valor)],
                  ["Status", sel.status],
                  ["Data de Ajuizamento", fmtDate(sel.data_ajuizamento)],
                  ["Data de Distribuição", fmtDate(sel.data_distribuicao)],
                  ["Próximo Prazo", sel.proximo_prazo?fmtDate(sel.proximo_prazo)+(diasPrazo!==null?` (${diasPrazo}d)`:""):null],
                ].filter(([,v])=>v&&v!=="—"&&v!=="R$ 0,00").map(([k,v])=>(
                  <div key={k} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10}}>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>{k}</p>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:13}}>{v||"—"}</p>
                  </div>
                ))}
              </div>
              {sel.observacoes&&(
                <div style={{marginTop:10,padding:"10px 14px",background:"#fef9c3",borderRadius:10}}>
                  <p style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Observações</p>
                  <p style={{fontSize:13,color:"#0f172a"}}>{sel.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* ABA DADOS — EDIÇÃO */}
          {abaFicha==="dados"&&editando&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                {/* Número */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Número do Processo *</label>
                  <input value={formEdit.numero||""} onChange={e=>FE("numero",e.target.value)} placeholder="0000000-00.0000.8.09.0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #4f46e5",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Número do Processo de Origem (opcional)</label>
                  <input value={formEdit.numero_origem||""} onChange={e=>FE("numero_origem",e.target.value)} placeholder="0000000-00.0000.8.09.0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
                </div>
                {/* Partes */}
                {[["Devedor",devedores.map(d=>({v:d.id,l:d.nome})),"devedor_id"],["Credor",credores.map(c=>({v:c.id,l:c.nome})),"credor_id"]].map(([label,opts,key])=>(
                  <div key={key}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                    <select value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                      <option value="">— Selecione —</option>
                      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                {/* Tipo, Fase, Instância, Tribunal */}
                {[["Tipo",PROC_TIPOS,"tipo"],["Fase",PROC_FASES,"fase"],["Instância",PROC_INST,"instancia"],["Tribunal",PROC_TRIB,"tribunal"]].map(([label,opts,key])=>(
                  <div key={key}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                    <select value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {/* Vara, Valor, Datas */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Vara / Câmara</label>
                  <input value={formEdit.vara||""} onChange={e=>FE("vara",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
                </div>
                {[["Valor (R$)","valor","number"],["Data de Ajuizamento","data_ajuizamento","date"],["Data de Distribuição","data_distribuicao","date"],["Próximo Prazo","proximo_prazo","date"]].map(([label,key,type])=>(
                  <div key={key}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                    <input type={type} value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Status</label>
                  <select value={formEdit.status||"em_andamento"} onChange={e=>FE("status",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                    {PROC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
                  <textarea value={formEdit.observacoes||""} onChange={e=>FE("observacoes",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <Btn onClick={salvarEdicao}>💾 Salvar</Btn>
                <Btn onClick={()=>setEditando(false)} outline color="#64748b">Cancelar</Btn>
              </div>
            </div>
          )}

          {/* ABA ANDAMENTOS */}
          {abaFicha==="andamentos"&&(
            <div>
              {/* Formulário novo andamento */}
              <div style={{background:"#f8fafc",borderRadius:12,padding:14,marginBottom:20,border:"1.5px dashed #e2e8f0"}}>
                <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>+ Registrar Andamento</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                    <select value={andForm.tipo} onChange={e=>setAndForm(f=>({...f,tipo:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                      {AND_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Data do Andamento</label>
                    <input type="date" value={andForm.data} onChange={e=>setAndForm(f=>({...f,data:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição *</label>
                    <textarea value={andForm.descricao} onChange={e=>setAndForm(f=>({...f,descricao:e.target.value}))} rows={3} placeholder="Descreva o andamento processual..." style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Próximo Prazo (opcional)</label>
                    <input type="date" value={andForm.prazo} onChange={e=>setAndForm(f=>({...f,prazo:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Responsável</label>
                    <input value={andForm.responsavel||user?.nome||""} onChange={e=>setAndForm(f=>({...f,responsavel:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <Btn onClick={addAnd} color="#4f46e5">📌 Registrar Andamento</Btn>
                </div>
              </div>

              {/* Lista de andamentos */}
              {procAnds.length===0&&(
                <p style={{fontSize:13,color:"#94a3b8",textAlign:"center",padding:24,background:"#f8fafc",borderRadius:12}}>Nenhum andamento registrado.</p>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {procAnds.map((a,i)=>{
                  const temPrazo = a.prazo && a.prazo >= hoje;
                  const diasP = a.prazo ? Math.ceil((new Date(a.prazo+"T12:00:00")-new Date())/86400000) : null;
                  const corTipo = {
                    "Citação":"#dbeafe","Contestação":"#ede9fe","Audiência":"#fef3c7",
                    "Sentença":"#dcfce7","Recurso":"#ffedd5","Penhora":"#fee2e2",
                    "Decisão Interlocutória":"#f0fdf4","Leilão":"#fdf4ff","Extinção":"#f1f5f9",
                  };
                  return(
                    <div key={a.id} style={{display:"flex",gap:14,padding:14,background:"#fff",borderRadius:12,border:"1px solid #f1f5f9",position:"relative"}}>
                      {/* linha timeline */}
                      {i<procAnds.length-1&&<div style={{position:"absolute",left:22,top:40,bottom:-10,width:2,background:"#f1f5f9"}}/>}
                      {/* ponto */}
                      <div style={{width:16,height:16,borderRadius:99,background:corTipo[a.tipo]||"#ede9fe",border:"2px solid #4f46e5",flexShrink:0,marginTop:3,zIndex:1}}/>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,flexWrap:"wrap",gap:6}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:12,fontWeight:700,padding:"2px 9px",borderRadius:99,background:corTipo[a.tipo]||"#ede9fe",color:"#4f46e5"}}>{a.tipo}</span>
                            {temPrazo&&<span style={{fontSize:11,fontWeight:700,color:diasP<=7?"#dc2626":"#d97706"}}>⚑ Prazo: {fmtDate(a.prazo)} ({diasP}d)</span>}
                          </div>
                          <div style={{display:"flex",gap:8,fontSize:11,color:"#94a3b8"}}>
                            <span>{fmtDate(a.data)}</span>
                            {a.responsavel&&<span>· {a.responsavel}</span>}
                          </div>
                        </div>
                        <p style={{fontSize:13,color:"#0f172a",lineHeight:1.6}}>{a.descricao}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER LISTAGEM
  // ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <h2 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a"}}>Processos</h2>
        <Btn onClick={()=>{setForm({...FORM_PROC_VAZIO});setModal(true)}}>{I.plus} Novo Processo</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:14,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Credor</label>
          <select value={filtroCredor} onChange={e=>setFiltroCredor(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todos os credores</option>
            {credores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Fase</label>
          <select value={filtroFase} onChange={e=>setFiltroFase(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todas as fases</option>
            {PROC_FASES.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tribunal</label>
          <select value={filtroTrib} onChange={e=>setFiltroTrib(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todos os tribunais</option>
            {PROC_TRIB.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Buscar</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número ou devedor..." style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Mulish",minWidth:180}}/>
        </div>
      </div>

      {/* Tabela */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f8fafc"}}>
              {["Nº do Processo","Devedor","Credor","Tipo","Fase","Próximo Prazo","Tribunal","Ações"].map(h=>(
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0&&(
              <tr><td colSpan={8} style={{padding:32,textAlign:"center",color:"#94a3b8",fontSize:13}}>Nenhum processo encontrado.</td></tr>
            )}
            {filtered.map(p=>{
              const dev  = devedores.find(d=>d.id===p.devedor_id||String(d.id)===String(p.devedor_id));
              const cred = credores.find(c=>c.id===p.credor_id||String(c.id)===String(p.credor_id));
              const bg   = corPrazo(p.proximo_prazo);
              const dias = p.proximo_prazo ? Math.ceil((new Date(p.proximo_prazo+"T12:00:00")-new Date())/86400000) : null;
              return (
                <tr key={p.id} style={{borderTop:"1px solid #f8fafc",background:bg||"",cursor:"pointer"}}
                  onClick={()=>{setFichaId(p.id);setAbaFicha("dados");}}
                  onMouseEnter={e=>{if(!bg) e.currentTarget.style.background="#fafafe";}}
                  onMouseLeave={e=>{if(!bg) e.currentTarget.style.background="";}}>
                  <td style={{padding:"10px 12px"}}>
                    <p style={{fontFamily:"monospace",fontSize:11,color:"#4f46e5",fontWeight:700}}>{p.numero}</p>
                    {p.numero_origem&&<p style={{fontSize:10,color:"#94a3b8",marginTop:1}}>origem: {p.numero_origem.slice(0,15)}…</p>}
                  </td>
                  <td style={{padding:"10px 12px",fontSize:12,fontWeight:600,color:"#0f172a"}}>{dev?.nome?.split(" ").slice(0,2).join(" ")||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:"#64748b"}}>{cred?.nome?.split(" ")[0]||"—"}</td>
                  <td style={{padding:"10px 12px",fontSize:11,color:"#475569"}}>{(p.tipo||"").split(" ").slice(0,2).join(" ")}</td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#fef3c7",color:"#d97706"}}>{p.fase}</span>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    {dias!==null?(
                      <span style={{fontSize:11,fontWeight:700,color:dias<=7?"#dc2626":dias<=15?"#d97706":"#64748b"}}>
                        {dias<=7?"🔴":dias<=15?"🟡":"📅"} {fmtDate(p.proximo_prazo)}
                        <br/><span style={{fontSize:10,color:"#94a3b8"}}>({dias}d)</span>
                      </span>
                    ):"—"}
                  </td>
                  <td style={{padding:"10px 12px",fontSize:11,color:"#64748b"}}>{p.tribunal||"—"}</td>
                  <td style={{padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setFichaId(p.id);setAbaFicha("andamentos");}} style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>📌 And.</button>
                      <button onClick={()=>{setFichaId(p.id);setAbaFicha("dados");}} style={{background:"#f8fafc",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:11}}>Ver →</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"10px 16px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <p style={{fontSize:11,color:"#94a3b8"}}>{filtered.length} de {processos.length} processos</p>
          <div style={{display:"flex",gap:12,fontSize:11}}>
            <span style={{color:"#dc2626"}}>🔴 = prazo ≤ 7 dias</span>
            <span style={{color:"#d97706"}}>🟡 = prazo 8–15 dias</span>
          </div>
          {(filtroCredor||filtroFase||filtroTrib||search)&&<button onClick={()=>{setFiltroCredor("");setFiltroFase("");setFiltroTrib("");setSearch("");}} style={{fontSize:11,color:"#4f46e5",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>✕ Limpar</button>}
        </div>
      </div>

      {/* Modal Novo Processo */}
      {modal&&(
        <Modal title="Novo Processo" onClose={()=>setModal(false)} width={640}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            {/* Número */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Número do Processo *</label>
              <input value={form.numero} onChange={e=>F("numero",e.target.value)} placeholder="0000000-00.0000.8.09.0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #4f46e5",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Número do Processo de Origem (opcional)</label>
              <input value={form.numero_origem} onChange={e=>F("numero_origem",e.target.value)} placeholder="0000000-00.0000.8.09.0000 (opcional)" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
            </div>
            {/* Partes */}
            {[["Devedor",devedores.map(d=>({v:d.id,l:d.nome})),"devedor_id"],["Credor",credores.map(c=>({v:c.id,l:c.nome})),"credor_id"]].map(([label,opts,key])=>(
              <div key={key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                <select value={form[key]||""} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                  <option value="">— Selecione —</option>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {/* Tipo, Fase, Instância, Tribunal */}
            {[["Tipo",PROC_TIPOS,"tipo"],["Fase",PROC_FASES,"fase"],["Instância",PROC_INST,"instancia"],["Tribunal",PROC_TRIB,"tribunal"]].map(([label,opts,key])=>(
              <div key={key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                <select value={form[key]||opts[0]} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                  {opts.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {/* Vara */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Vara / Câmara</label>
              <input value={form.vara} onChange={e=>F("vara",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
            </div>
            {/* Datas e valor */}
            {[["Valor (R$)","valor","number"],["Data de Ajuizamento","data_ajuizamento","date"],["Data de Distribuição","data_distribuicao","date"],["Próximo Prazo","proximo_prazo","date"]].map(([label,key,type])=>(
              <div key={key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                <input type={type} value={form[key]||""} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish"}}/>
              </div>
            ))}
            {/* Observações */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
              <textarea value={form.observacoes||""} onChange={e=>F("observacoes",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Mulish",resize:"vertical"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Btn onClick={salvarProcesso} disabled={loading}>{loading?"Salvando...":"💾 Salvar Processo"}</Btn>
            <Btn onClick={()=>setModal(false)} outline>Cancelar</Btn>
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
// ÍNDICES MENSAIS REAIS (2020-2024)
// ═══════════════════════════════════════════════════════════════
const INDICES = {
  igpm: {
    "2020-01":0.0037,"2020-02":0.0024,"2020-03":0.0131,"2020-04":0.0099,"2020-05":0.0044,"2020-06":0.0189,
    "2020-07":0.0287,"2020-08":0.0296,"2020-09":0.0440,"2020-10":0.0324,"2020-11":0.0331,"2020-12":0.0231,
    "2021-01":0.0318,"2021-02":0.0288,"2021-03":0.0293,"2021-04":0.0352,"2021-05":0.0416,"2021-06":0.0375,
    "2021-07":0.0196,"2021-08":0.0083,"2021-09":-0.0064,"2021-10":-0.0052,"2021-11":-0.0026,"2021-12":0.0087,
    "2022-01":0.0174,"2022-02":0.0188,"2022-03":0.0153,"2022-04":0.0116,"2022-05":0.0073,"2022-06":-0.0046,
    "2022-07":-0.0441,"2022-08":-0.0070,"2022-09":-0.0025,"2022-10":0.0042,"2022-11":0.0054,"2022-12":0.0046,
    "2023-01":-0.0047,"2023-02":-0.0007,"2023-03":-0.0015,"2023-04":-0.0032,"2023-05":-0.0072,"2023-06":-0.0071,
    "2023-07":-0.0025,"2023-08":0.0050,"2023-09":0.0053,"2023-10":0.0039,"2023-11":0.0043,"2023-12":0.0054,
    "2024-01":0.0071,"2024-02":0.0074,"2024-03":0.0069,"2024-04":0.0083,"2024-05":0.0046,"2024-06":0.0085,
    "2024-07":0.0076,"2024-08":0.0044,"2024-09":0.0044,"2024-10":0.0122,"2024-11":0.0122,"2024-12":0.0052,
  },
  ipca: {
    "2020-01":0.0021,"2020-02":0.0025,"2020-03":0.0007,"2020-04":-0.0031,"2020-05":-0.0038,"2020-06":0.0026,
    "2020-07":0.0036,"2020-08":0.0024,"2020-09":0.0064,"2020-10":0.0086,"2020-11":0.0089,"2020-12":0.0123,
    "2021-01":0.0025,"2021-02":0.0086,"2021-03":0.0093,"2021-04":0.0031,"2021-05":0.0083,"2021-06":0.0053,
    "2021-07":0.0096,"2021-08":0.0087,"2021-09":0.0164,"2021-10":0.0110,"2021-11":0.0095,"2021-12":0.0073,
    "2022-01":0.0054,"2022-02":0.0100,"2022-03":0.0116,"2022-04":0.0106,"2022-05":0.0047,"2022-06":0.0067,
    "2022-07":-0.0068,"2022-08":-0.0029,"2022-09":0.0059,"2022-10":0.0059,"2022-11":0.0041,"2022-12":0.0054,
    "2023-01":0.0053,"2023-02":0.0084,"2023-03":0.0071,"2023-04":0.0061,"2023-05":0.0023,"2023-06":-0.0008,
    "2023-07":0.0012,"2023-08":0.0061,"2023-09":0.0026,"2023-10":0.0024,"2023-11":0.0028,"2023-12":0.0062,
    "2024-01":0.0042,"2024-02":0.0083,"2024-03":0.0016,"2024-04":0.0038,"2024-05":0.0044,"2024-06":0.0050,
    "2024-07":0.0038,"2024-08":0.0044,"2024-09":0.0044,"2024-10":0.0056,"2024-11":0.0039,"2024-12":0.0052,
  },
  selic: {
    "2020-01":0.0038,"2020-02":0.0034,"2020-03":0.0034,"2020-04":0.0030,"2020-05":0.0026,"2020-06":0.0021,
    "2020-07":0.0019,"2020-08":0.0016,"2020-09":0.0016,"2020-10":0.0016,"2020-11":0.0015,"2020-12":0.0016,
    "2021-01":0.0015,"2021-02":0.0015,"2021-03":0.0020,"2021-04":0.0026,"2021-05":0.0033,"2021-06":0.0040,
    "2021-07":0.0043,"2021-08":0.0057,"2021-09":0.0063,"2021-10":0.0075,"2021-11":0.0075,"2021-12":0.0090,
    "2022-01":0.0073,"2022-02":0.0076,"2022-03":0.0093,"2022-04":0.0083,"2022-05":0.0102,"2022-06":0.0113,
    "2022-07":0.0114,"2022-08":0.0114,"2022-09":0.0114,"2022-10":0.0114,"2022-11":0.0114,"2022-12":0.0114,
    "2023-01":0.0113,"2023-02":0.0113,"2023-03":0.0113,"2023-04":0.0113,"2023-05":0.0113,"2023-06":0.0109,
    "2023-07":0.0108,"2023-08":0.0103,"2023-09":0.0099,"2023-10":0.0093,"2023-11":0.0092,"2023-12":0.0092,
    "2024-01":0.0097,"2024-02":0.0087,"2024-03":0.0091,"2024-04":0.0087,"2024-05":0.0083,"2024-06":0.0087,
    "2024-07":0.0090,"2024-08":0.0087,"2024-09":0.0099,"2024-10":0.0104,"2024-11":0.0111,"2024-12":0.0118,
  },
  inpc: {
    "2020-01":0.0028,"2020-02":0.0020,"2020-03":0.0009,"2020-04":-0.0022,"2020-05":-0.0009,"2020-06":0.0023,
    "2020-07":0.0044,"2020-08":0.0024,"2020-09":0.0059,"2020-10":0.0081,"2020-11":0.0093,"2020-12":0.0128,
    "2021-01":0.0057,"2021-02":0.0077,"2021-03":0.0097,"2021-04":0.0042,"2021-05":0.0077,"2021-06":0.0053,
    "2021-07":0.0096,"2021-08":0.0093,"2021-09":0.0159,"2021-10":0.0126,"2021-11":0.0104,"2021-12":0.0073,
    "2022-01":0.0073,"2022-02":0.0105,"2022-03":0.0119,"2022-04":0.0113,"2022-05":0.0060,"2022-06":0.0080,
    "2022-07":-0.0059,"2022-08":-0.0001,"2022-09":0.0067,"2022-10":0.0057,"2022-11":0.0051,"2022-12":0.0056,
    "2023-01":0.0061,"2023-02":0.0086,"2023-03":0.0077,"2023-04":0.0065,"2023-05":0.0028,"2023-06":-0.0007,
    "2023-07":0.0011,"2023-08":0.0063,"2023-09":0.0030,"2023-10":0.0021,"2023-11":0.0027,"2023-12":0.0060,
    "2024-01":0.0042,"2024-02":0.0082,"2024-03":0.0015,"2024-04":0.0038,"2024-05":0.0044,"2024-06":0.0052,
    "2024-07":0.0040,"2024-08":0.0041,"2024-09":0.0044,"2024-10":0.0056,"2024-11":0.0040,"2024-12":0.0050,
  },
};

const TAXA_MEDIA = { igpm:0.0045, ipca:0.0038, selic:0.0080, inpc:0.0040, nenhum:0 };

function calcularFatorCorrecao(indexador, dataInicio, dataFim) {
  if(indexador==="nenhum") return 1;
  const tabela = INDICES[indexador];
  let fator = 1;
  let atual = new Date(dataInicio+"T12:00:00");
  const fim  = new Date(dataFim+"T12:00:00");
  let mesesComDados = 0;
  while(atual < fim) {
    const chave = `${atual.getFullYear()}-${String(atual.getMonth()+1).padStart(2,"0")}`;
    const taxa = tabela?.[chave];
    if(taxa !== undefined) { fator *= (1+taxa); mesesComDados++; }
    else { fator *= (1+TAXA_MEDIA[indexador]); } // fallback média
    atual.setMonth(atual.getMonth()+1);
  }
  return fator;
}


// ═══════════════════════════════════════════════════════════════
// CALCULADORA — Atualização Monetária com Honorários integrados
// ═══════════════════════════════════════════════════════════════
function Calculadora({ devedores }) {
  const hoje = new Date().toISOString().slice(0,10);

  // Parâmetros da dívida
  const [devId, setDevId]               = useState("");
  const [nomeDevedor, setNomeDevedor]   = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataCalculo, setDataCalculo]   = useState(hoje);
  const [indexador, setIndexador]       = useState("igpm");
  const [regimeJuros, setRegimeJuros]   = useState("composto");
  const [jurosAM, setJurosAM]           = useState("1");
  const [multa, setMulta]               = useState("2");
  const [baseMulta, setBaseMulta]       = useState("original");
  // Honorários integrados
  const [honorariosPct, setHonorariosPct] = useState("20");
  const [incluirHonorarios, setIncluirHonorarios] = useState(true);
  // Encargos extras
  const [encargos, setEncargos]         = useState("0");
  const [bonificacao, setBonificacao]   = useState("0");
  // Resultado
  const [resultado, setResultado]       = useState(null);
  const [dividasSel, setDividasSel]     = useState([]);

  // Labels de índice
  const IDX_LABEL = { igpm:"IGP-M", ipca:"IPCA", selic:"SELIC/CDI", inpc:"INPC", nenhum:"Sem correção" };

  function loadDev(id) {
    setDevId(id); setDividasSel([]); setResultado(null);
    const d = devedores.find(x=>x.id==id);
    if(d) {
      setNomeDevedor(d.nome||"");
      const dividas = (d.dividas||[]).filter(dv=>!dv._nominal);
      // Pré-selecionar todas
      setDividasSel(dividas.map(div=>div.id));
      // Pré-carregar honorários da primeira dívida real
      const pct = dividas[0]?.honorarios_pct;
      if(pct) setHonorariosPct(String(pct));
      // Campos globais: usados só para modo manual (sem devedor)
      const totalDiv = dividas.reduce((s,div)=>s+(div.valor_total||0),0)||d.valor_original||0;
      const datas = dividas.map(div=>div.data_inicio_atualizacao||div.data_vencimento||div.data_origem).filter(Boolean).sort();
      setValorOriginal(String(totalDiv));
      setDataVencimento(datas[0]||"");
    }
  }

  function atualizarTotalSelecionado(id, checked) {
    const novas = checked ? [...dividasSel, id] : dividasSel.filter(x=>x!==id);
    setDividasSel(novas);
    setResultado(null);
  }

  // ── Calcular cada dívida individualmente pela sua data ────────
  function calcular() {
    const dFim = new Date(dataCalculo+"T12:00:00");
    const encargosVal = parseFloat(encargos)||0;
    const bonificacaoVal = parseFloat(bonificacao)||0;
    const honPct = incluirHonorarios ? (parseFloat(honorariosPct)||0) : 0;

    // Obter dívidas selecionadas do devedor
    const dev = devedores.find(x=>x.id==devId);
    const dividasParaCalc = dev
      ? (dev.dividas||[]).filter(dv=>dividasSel.includes(dv.id)&&!dv._nominal)
      : null;

    // Se não tiver devedor, usa os campos manuais como uma dívida única
    if(!dividasParaCalc || dividasParaCalc.length===0) {
      const PV = parseFloat(valorOriginal)||0;
      if(!PV || !dataVencimento || !dataCalculo) return alert("Preencha valor, data de vencimento e data de cálculo.");
      const dIni = new Date(dataVencimento+"T12:00:00");
      const meses = Math.max(0,(dFim.getFullYear()-dIni.getFullYear())*12+(dFim.getMonth()-dIni.getMonth()));
      const dias  = Math.max(0,Math.floor((dFim-dIni)/86400000));
      const fatorCorrecao = calcularFatorCorrecao(indexador, dataVencimento, dataCalculo);
      const correcao = PV * fatorCorrecao - PV;
      const principalCorrigido = PV + correcao;
      const i = (parseFloat(jurosAM)||0)/100;
      const juros = regimeJuros==="simples" ? principalCorrigido*i*meses : principalCorrigido*(Math.pow(1+i,meses)-1);
      const baseParaMulta = baseMulta==="corrigido" ? principalCorrigido : PV;
      const multaVal = baseParaMulta*(parseFloat(multa)||0)/100;
      const subtotal = principalCorrigido+juros+multaVal+encargosVal-bonificacaoVal;
      const honorariosVal = subtotal*honPct/100;
      const total = subtotal+honorariosVal;
      const linhasMes = calcularLinhasDivida({
        valor_total:PV,
        data_inicio_atualizacao:dataVencimento,
        data_vencimento:dataVencimento,
        indexador, juros_am:parseFloat(jurosAM), multa_pct:parseFloat(multa),
        honorarios_pct:honPct
      }, dataCalculo, baseMulta, encargosVal, bonificacaoVal, regimeJuros);
      return setResultado({
        valorOriginal:PV, correcao, principalCorrigido,
        juros, multa:multaVal, encargos:encargosVal, bonificacao:bonificacaoVal,
        honorarios:honorariosVal, honPct, subtotal, total,
        meses, dias, fatorCorrecao, linhasMes,
        dividasDetalhe:[],
      });
    }

    // ── Calcular cada dívida com seus próprios parâmetros ────────
    let totalValorOriginal=0, totalCorrecao=0, totalJuros=0, totalMulta=0;
    let totalHonorarios=0, totalEncargos=encargosVal, totalBonificacao=bonificacaoVal;
    let todasLinhas=[];
    const dividasDetalhe=[];

    for(const div of dividasParaCalc) {
      const PV = div.valor_total||0;
      if(!PV) continue;

      // Data de início da atualização: usa data_inicio_atualizacao do cadastro, senão data_vencimento
      const dataIni = div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;
      if(!dataIni) continue;

      const idxDiv = div.indexador || indexador;
      const jAM   = parseFloat(div.juros_am  ?? jurosAM);
      const mPct  = parseFloat(div.multa_pct ?? multa);
      const hPct  = incluirHonorarios ? parseFloat(div.honorarios_pct ?? honorariosPct) : 0;

      const dIni = new Date(dataIni+"T12:00:00");
      const meses = Math.max(0,(dFim.getFullYear()-dIni.getFullYear())*12+(dFim.getMonth()-dIni.getMonth()));
      const dias  = Math.max(0,Math.floor((dFim-dIni)/86400000));

      // Correção usando índice da dívida
      const fatorCorr = calcularFatorCorrecao(idxDiv, dataIni, dataCalculo);
      const corrDiv = PV * fatorCorr - PV;
      const pcDiv   = PV + corrDiv;

      // Juros usando taxa da dívida
      const i = jAM/100;
      const jurosDiv = regimeJuros==="simples"
        ? pcDiv*i*meses
        : pcDiv*(Math.pow(1+i,meses)-1);

      // Multa usando % da dívida
      const baseM = baseMulta==="corrigido" ? pcDiv : PV;
      const multaDiv = baseM * mPct/100;

      // Honorários individuais da dívida
      const subDiv = pcDiv + jurosDiv + multaDiv;
      const honDiv = subDiv * hPct/100;

      totalValorOriginal += PV;
      totalCorrecao      += corrDiv;
      totalJuros         += jurosDiv;
      totalMulta         += multaDiv;
      totalHonorarios    += honDiv;

      // Linhas mensais desta dívida
      const linhas = calcularLinhasDivida(
        {...div, indexador:idxDiv, juros_am:jAM, multa_pct:mPct, honorarios_pct:hPct},
        dataCalculo, baseMulta, 0, 0, regimeJuros
      );
      todasLinhas = [...todasLinhas, ...linhas];

      dividasDetalhe.push({
        descricao: div.descricao||"Dívida",
        dataIni, meses, dias,
        valor:PV, correcao:corrDiv, principalCorrigido:pcDiv,
        juros:jurosDiv, multa:multaDiv, honorarios:honDiv,
        total:pcDiv+jurosDiv+multaDiv+honDiv,
        indexador:idxDiv, jurosAM:jAM, multaPct:mPct,
      });
    }

    // Ordenar linhas por data
    todasLinhas.sort((a,b)=>a.vecto.localeCompare(b.vecto));

    // Adicionar encargos/bonificação na primeira linha
    if(todasLinhas.length>0){
      todasLinhas[0].encargos += encargosVal;
      todasLinhas[0].bonificacao += bonificacaoVal;
      todasLinhas[0].total += encargosVal - bonificacaoVal;
    }

    const totalPC = totalValorOriginal + totalCorrecao;
    const subtotal = totalPC + totalJuros + totalMulta + encargosVal - bonificacaoVal;
    const total = subtotal + totalHonorarios;
    const mesesGlobal = dividasDetalhe.length>0 ? Math.max(...dividasDetalhe.map(d=>d.meses)) : 0;

    setResultado({
      valorOriginal:totalValorOriginal,
      correcao:totalCorrecao,
      principalCorrigido:totalPC,
      juros:totalJuros, multa:totalMulta,
      encargos:encargosVal, bonificacao:bonificacaoVal,
      honorarios:totalHonorarios, honPct,
      subtotal, total,
      meses:mesesGlobal, dias:0,
      linhasMes:todasLinhas,
      dividasDetalhe,
    });
  }

  // ── Calcular linhas mensais de UMA dívida individual ─────────
  function calcularLinhasDivida(div, dataCalcStr, baseMultaParam, encargosExtra, bonificacaoExtra, regimeJurosParam) {
    const PV      = div.valor_total||0;
    const dataIni = div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;
    if(!PV || !dataIni) return [];
    const idxDiv  = div.indexador || indexador;
    const jAM     = parseFloat(div.juros_am ?? jurosAM);
    const mPct    = parseFloat(div.multa_pct ?? multa);
    const hPct    = parseFloat(div.honorarios_pct ?? 0);
    const i       = jAM/100;

    const linhas = [];
    let atual     = new Date(dataIni+"T12:00:00");
    const dFimCal = new Date(dataCalcStr+"T12:00:00");
    let mesNum    = 0;

    // Correção acumulada (fator produto)
    let fatorAcum = 1;

    while(atual < dFimCal) {
      const chave = `${atual.getFullYear()}-${String(atual.getMonth()+1).padStart(2,"0")}`;

      // Taxa de correção deste mês
      const taxaCorr = (INDICES[idxDiv]?.[chave] ?? TAXA_MEDIA[idxDiv] ?? 0);
      fatorAcum *= (1 + taxaCorr);

      // Correção ACUMULADA até este mês
      const pcAcum = PV * fatorAcum; // principal corrigido acumulado
      const corrAcum = pcAcum - PV;

      // Juros ACUMULADOS até este mês (sobre principal corrigido acumulado)
      let jurosAcum = 0;
      if(regimeJurosParam==="simples") jurosAcum = pcAcum * i * (mesNum+1);
      else jurosAcum = pcAcum * (Math.pow(1+i, mesNum+1) - 1);

      // Multa: apenas no primeiro mês (mês do vencimento)
      const baseM   = baseMultaParam==="corrigido" ? pcAcum : PV;
      const multaMes = mesNum===0 ? baseM*mPct/100 : 0;

      // Vecto: data de vencimento desta parcela mensal
      const vecto = new Date(dataIni+"T12:00:00");
      vecto.setMonth(vecto.getMonth()+mesNum);

      const totalLinha = PV + corrAcum + jurosAcum + multaMes
        + (mesNum===0?encargosExtra:0) - (mesNum===0?bonificacaoExtra:0);
      const honLinha   = totalLinha * hPct/100;

      linhas.push({
        mesRef:     chave,
        vecto:      vecto.toISOString().slice(0,10),
        descricao:  div.descricao||"",
        valor:      PV,
        multa:      multaMes,
        correcao:   corrAcum,
        juros:      jurosAcum,
        encargos:   mesNum===0 ? encargosExtra : 0,
        bonificacao:mesNum===0 ? bonificacaoExtra : 0,
        honorarios: honLinha,
        total:      totalLinha + honLinha,
      });

      atual.setMonth(atual.getMonth()+1);
      mesNum++;
      if(mesNum > 60) break;
    }
    return linhas;
  }

  // ── Exportar PDF — Resumo de Débito ──────────────────────────
  async function exportarPDF() {
    if(!resultado) return;
    try {
      const { jsPDF } = window.jspdf || {};
      if(!window.jspdf) throw new Error("jsPDF não carregado. Certifique-se de usar mr-3.vercel.app.");
      const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
      const W = doc.internal.pageSize.getWidth();

      // Cabeçalho estilo Resumo de Débito
      doc.setFillColor(255,255,255);
      doc.rect(0,0,W,297,"F");
      doc.setTextColor(0,0,0);
      doc.setFontSize(16); doc.setFont("helvetica","bold");
      doc.text("RESUMO DE DÉBITO", 14, 18);
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.text("IMPRESSO POR MR COBRANÇAS", W-14, 10, {align:"right"});

      // Dados do cliente
      const d1 = [
        ["CLIENTE DO", nomeDevedor||"Não informado"],
        ["ENDEREÇO :", "—"],
        ["NOME", ""],
      ];
      const d2 = [
        ["CNPJ :", "—"],
        ["BLOCO/APTO", ""],
      ];
      let y = 28;
      d1.forEach(([k,v])=>{ doc.setFont("helvetica","bold"); doc.text(k,14,y); doc.setFont("helvetica","normal"); doc.text(v,45,y); y+=5; });
      y = 28;
      d2.forEach(([k,v])=>{ doc.setFont("helvetica","bold"); doc.text(k,160,y); doc.setFont("helvetica","normal"); doc.text(v,180,y); y+=5; });

      // Linha separadora
      y = 47;
      doc.setDrawColor(0); doc.setLineWidth(0.3);
      doc.line(14,y,W-14,y); y+=6;

      // Cabeçalho tabela
      const cols = ["MÊS REF.","VECTO","VALOR","MULTA","CORREÇÃO","JUROS","ENCARGOS","BONIFICAÇÃO","TOTAL"];
      const colW = [20,22,22,18,22,22,22,24,22];
      let x = 14;
      doc.setFillColor(240,240,240);
      doc.rect(14,y-4,W-28,6,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7);
      cols.forEach((c,ci)=>{ doc.text(c,x+1,y); x+=colW[ci]; });
      y+=6;

      // Linhas de dados
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      const linhas = resultado.linhasMes||[];
      linhas.forEach((l,li)=>{
        if(li%2===0){ doc.setFillColor(250,250,252); doc.rect(14,y-3.5,W-28,5.5,"F"); }
        x=14;
        const vals = [
          l.mesRef, fmtDate(l.vecto),
          fmt(l.valor), fmt(l.multa), fmt(l.correcao),
          fmt(l.juros), fmt(l.encargos), fmt(l.bonificacao), fmt(l.total)
        ];
        vals.forEach((v,vi)=>{
          if(vi>=2) doc.text(v,x+colW[vi]-2,y,{align:"right"});
          else doc.text(v,x+1,y);
          x+=colW[vi];
        });
        y+=5.5;
        if(y>185){ doc.addPage(); y=15; }
      });

      // Total geral
      y+=2;
      doc.setDrawColor(0); doc.line(14,y,W-14,y); y+=4;
      doc.setFillColor(220,220,255);
      doc.rect(14,y-4,W-28,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.text("TOTAL DO IMÓVEL:",14,y);
      // Totais por coluna
      x=14+20+22; // começa no VALOR
      const tots=[resultado.valorOriginal,resultado.multa,resultado.correcao,resultado.juros,resultado.encargos,resultado.bonificacao,resultado.total];
      const tw=[22,18,22,22,22,24,22];
      tots.forEach((v,vi)=>{ doc.text(fmt(v),x+tw[vi]-2,y,{align:"right"}); x+=tw[vi]; });
      y+=10;

      // Memória de cálculo resumida
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.text("MEMÓRIA DE CÁLCULO",14,y); y+=5;
      doc.setFont("helvetica","normal"); doc.setFontSize(8);
      const mem=[
        ["Valor Original", fmt(resultado.valorOriginal)],
        ["Correção Monetária ("+IDX_LABEL[indexador]+")", fmt(resultado.correcao)],
        ["Principal Corrigido", fmt(resultado.principalCorrigido)],
        ["Juros ("+(regimeJuros==="composto"?"compostos":"simples")+" "+jurosAM+"%am)", fmt(resultado.juros)],
        ["Multa ("+multa+"% s/ "+(baseMulta==="corrigido"?"corrigido":"original")+")", fmt(resultado.multa)],
        ...(resultado.encargos>0?[["Encargos", fmt(resultado.encargos)]]:[] ),
        ...(resultado.bonificacao>0?[["Bonificação (-)", fmt(resultado.bonificacao)]]:[] ),
        ...(incluirHonorarios?[["Honorários Advocatícios ("+honorariosPct+"%)", fmt(resultado.honorarios)]]:[] ),
        ["TOTAL ATUALIZADO", fmt(resultado.total)],
      ];
      mem.forEach(([k,v],mi)=>{
        const isTotal=mi===mem.length-1;
        if(isTotal){ doc.setFillColor(79,70,229); doc.rect(14,y-3.5,90,5.5,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); }
        else{ doc.setFillColor(mi%2===0?255:248,mi%2===0?255:248,mi%2===0?255:252); doc.rect(14,y-3.5,90,5.5,"F"); doc.setTextColor(0,0,0); doc.setFont("helvetica","normal"); }
        doc.text(k,16,y); doc.text(v,102,y,{align:"right"}); y+=5.5;
      });
      doc.setTextColor(0,0,0);

      // Rodapé
      y+=5;
      doc.setFillColor(254,243,199);
      doc.rect(14,y,W-28,10,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
      doc.text("⚠ ATENÇÃO: Documento baseado em estimativas. Para fins processuais, utilize a planilha oficial homologada pelo TJGO/STJ.",16,y+4);
      doc.setFont("helvetica","normal");
      doc.text("Gerado em: "+new Date().toLocaleDateString("pt-BR")+" | MR Cobranças — CRM Jurídico",16,y+9);

      doc.save("resumo_debito_"+(nomeDevedor||"devedor").replace(/ /g,"_")+".pdf");
    } catch(e) {
      alert("Erro ao gerar PDF: "+e.message);
    }
  }

  return (
    <div>
      <h2 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:4}}>Calculadora</h2>
      <p style={{fontSize:13,color:"#64748b",marginBottom:18}}>Atualização monetária com honorários integrados — Resumo de Débito.</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

        {/* ── PAINEL ESQUERDO — Parâmetros ── */}
        <div style={{background:"#fff",borderRadius:18,padding:24,border:"1px solid #f1f5f9",display:"flex",flexDirection:"column",gap:0}}>
          <p style={{fontFamily:"Syne",fontWeight:700,fontSize:14,marginBottom:14,color:"#0f172a"}}>Parâmetros</p>

          {/* Devedor */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em"}}>Carregar Devedor (opcional)</label>
            <select value={devId} onChange={e=>loadDev(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"Mulish",outline:"none"}}>
              <option value="">— Digitar manualmente —</option>
              {devedores.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>

          {/* Checkboxes de dívidas */}
          {devId && (()=>{
            const d = devedores.find(x=>x.id==devId);
            const dividas = d?.dividas||[];
            if(!dividas.length) return null;
            return(
              <div style={{marginBottom:12,background:"#f8fafc",borderRadius:10,padding:12,border:"1px solid #e2e8f0"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase"}}>Selecionar Dívidas</p>
                {dividas.map(div=>(
                  <label key={div.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                    <input type="checkbox" checked={dividasSel.includes(div.id)} onChange={e=>atualizarTotalSelecionado(div.id,e.target.checked)} style={{accentColor:"#4f46e5",width:14,height:14}}/>
                    <span style={{color:"#0f172a",fontSize:12,flex:1}}>{div.descricao||"Dívida"}</span>
                    <span style={{color:"#4f46e5",fontWeight:700,fontSize:12}}>{fmt(div.valor_total)}</span>
                  </label>
                ))}
              </div>
            );
          })()}

          {/* Grid de campos */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {/* Valor */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Valor Original (R$)</label>
              <input type="number" value={valorOriginal} onChange={e=>setValorOriginal(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:14,fontWeight:700,color:"#4f46e5",outline:"none",boxSizing:"border-box"}}/>
            </div>
            {/* Datas */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Data de Vencimento</label>
              <input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Data de Cálculo</label>
              <input type="date" value={dataCalculo} onChange={e=>setDataCalculo(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            {/* Indexador */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Indexador</label>
              <select value={indexador} onChange={e=>setIndexador(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
                {[["igpm","IGP-M"],["ipca","IPCA"],["selic","SELIC/CDI"],["inpc","INPC"],["nenhum","Sem correção"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {/* Juros */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Juros (% ao mês)</label>
              <input type="number" value={jurosAM} onChange={e=>setJurosAM(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* Regime de juros */}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase"}}>Regime de Juros</label>
            <div style={{display:"flex",gap:8}}>
              {[["composto","Juros Compostos"],["simples","Juros Simples"]].map(([v,l])=>(
                <button key={v} onClick={()=>setRegimeJuros(v)} style={{flex:1,padding:"7px",border:`1.5px solid ${regimeJuros===v?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:regimeJuros===v?"#4f46e5":"#fff",color:regimeJuros===v?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Mulish"}}>{l}</button>
              ))}
            </div>
          </div>

          {/* Multa + base */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Multa (%)</label>
              <input type="number" value={multa} onChange={e=>setMulta(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Multa incide sobre</label>
              <select value={baseMulta} onChange={e=>setBaseMulta(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Mulish"}}>
                <option value="original">Principal original</option>
                <option value="corrigido">Principal corrigido</option>
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Encargos (R$)</label>
              <input type="number" value={encargos} onChange={e=>setEncargos(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Bonificação (R$)</label>
              <input type="number" value={bonificacao} onChange={e=>setBonificacao(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* Honorários — integrado */}
          <div style={{background:"#ede9fe",borderRadius:12,padding:12,marginBottom:12,border:"1.5px solid #c4b5fd"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:700,color:"#4f46e5",textTransform:"uppercase",letterSpacing:".04em"}}>⚖️ Honorários Advocatícios</label>
              <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:"#4f46e5",fontWeight:700}}>
                <input type="checkbox" checked={incluirHonorarios} onChange={e=>setIncluirHonorarios(e.target.checked)} style={{accentColor:"#4f46e5",width:14,height:14}}/>
                Incluir no total
              </label>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="range" min="0" max="50" step="0.5" value={honorariosPct} onChange={e=>setHonorariosPct(e.target.value)} style={{flex:1,accentColor:"#4f46e5"}} disabled={!incluirHonorarios}/>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <input type="number" value={honorariosPct} onChange={e=>setHonorariosPct(e.target.value)} disabled={!incluirHonorarios}
                  style={{width:55,padding:"5px 6px",border:"1.5px solid #c4b5fd",borderRadius:8,fontSize:14,fontWeight:700,color:"#4f46e5",outline:"none",textAlign:"center"}}/>
                <span style={{fontWeight:700,color:"#4f46e5",fontSize:15}}>%</span>
              </div>
            </div>
            {incluirHonorarios&&valorOriginal&&<p style={{fontSize:11,color:"#7c3aed",marginTop:6}}>≈ {fmt(parseFloat(valorOriginal||0)*(parseFloat(honorariosPct)||0)/100)} estimado sobre o valor original</p>}
          </div>

          {/* Alerta */}
          <div style={{background:"#FEF3C7",borderLeft:"4px solid #F59E0B",borderRadius:"0 8px 8px 0",padding:"10px 12px",marginBottom:12}}>
            <p style={{fontSize:10,fontWeight:700,color:"#92400E",marginBottom:2}}>⚠️ ATENÇÃO — VALIDADE DOS ÍNDICES</p>
            <p style={{fontSize:10,color:"#78350F",lineHeight:1.6}}>Índices históricos embutidos (2020–2024). Para uso processual utilize planilha oficial TJGO/STJ.</p>
          </div>

          <Btn onClick={calcular}>🧮 Calcular →</Btn>
        </div>

        {/* ── PAINEL DIREITO — Resultado ── */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {!resultado ? (
            <div style={{background:"#f8fafc",borderRadius:18,padding:24,border:"1px solid #f1f5f9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:320}}>
              <div style={{fontSize:44,marginBottom:12}}>🧮</div>
              <p style={{color:"#94a3b8",fontSize:13,textAlign:"center"}}>Preencha os parâmetros e clique em Calcular</p>
            </div>
          ) : (
            <>
              {/* Totalizador escuro */}
              <div style={{background:"linear-gradient(135deg,#0f172a,#1e1b4b)",borderRadius:18,padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <p style={{color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:2}}>Total Atualizado</p>
                    <p style={{fontFamily:"Syne",fontWeight:800,fontSize:30,color:"#fff"}}>{fmt(resultado.total)}</p>
                    <p style={{color:"rgba(255,255,255,.4)",fontSize:11}}>{resultado.meses} meses · {IDX_LABEL[indexador]} · {regimeJuros==="composto"?"J. Compostos":"J. Simples"}</p>
                  </div>
                  <button onClick={exportarPDF} style={{background:"rgba(255,255,255,.1)",color:"#a5f3fc",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Mulish",whiteSpace:"nowrap"}}>
                    📄 Exportar PDF
                  </button>
                </div>
                {/* Discriminação */}
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[
                    ["Valor Original", resultado.valorOriginal, "#94a3b8"],
                    ["Correção ("+IDX_LABEL[indexador]+")", resultado.correcao, "#818cf8"],
                    ["Principal Corrigido", resultado.principalCorrigido, "#c4b5fd"],
                    ["Juros ("+jurosAM+"%am "+(regimeJuros==="composto"?"comp.":"simples")+")", resultado.juros, "#fbbf24"],
                    ["Multa ("+multa+"% s/ "+(baseMulta==="corrigido"?"corrigido":"original")+")", resultado.multa, "#f87171"],
                    ...(resultado.encargos>0?[["Encargos", resultado.encargos, "#f97316"]]:[] ),
                    ...(resultado.bonificacao>0?[["Bonificação (-)", resultado.bonificacao, "#34d399"]]:[] ),
                    ...(incluirHonorarios?[["Honorários ("+honorariosPct+"%)", resultado.honorarios, "#facc15"]]:[] ),
                  ].map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 10px",background:"rgba(255,255,255,.05)",borderRadius:8}}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,.55)"}}>{l}</span>
                      <span style={{fontSize:12,fontWeight:700,color:c}}>{fmt(v)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:"rgba(255,255,255,.15)",borderRadius:8,marginTop:2}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>TOTAL ATUALIZADO</span>
                    <span style={{fontSize:14,fontWeight:800,color:"#a5f3fc"}}>{fmt(resultado.total)}</span>
                  </div>
                </div>
              </div>

              {/* Detalhe por dívida — quando há múltiplas */}
              {resultado.dividasDetalhe?.length>1&&(
                <div style={{background:"#fff",borderRadius:14,border:"1px solid #f1f5f9",overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid #f1f5f9",background:"#f8fafc"}}>
                    <p style={{fontFamily:"Syne",fontWeight:700,fontSize:12,color:"#0f172a"}}>📂 Detalhe por Dívida — {resultado.dividasDetalhe.length} dívidas calculadas individualmente</p>
                  </div>
                  {resultado.dividasDetalhe.map((d,i)=>(
                    <div key={i} style={{padding:"10px 16px",borderBottom:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafe"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                        <div>
                          <p style={{fontWeight:700,color:"#0f172a",fontSize:12}}>{d.descricao}</p>
                          <p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>
                            Início: {fmtDate(d.dataIni)} · {d.meses} meses · {({igpm:"IGP-M",ipca:"IPCA",selic:"SELIC",inpc:"INPC",nenhum:"Sem correção"})[d.indexador]||d.indexador} · {d.jurosAM}%am · multa {d.multaPct}%
                          </p>
                        </div>
                        <span style={{fontFamily:"Syne",fontWeight:800,fontSize:14,color:"#4f46e5"}}>{fmt(d.total)}</span>
                      </div>
                      <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap"}}>
                        {[["Original",d.valor,"#64748b"],["Correção",d.correcao,"#7c3aed"],["Juros",d.juros,"#d97706"],["Multa",d.multa,"#dc2626"],["Honorários",d.honorarios,"#b45309"]].map(([l,v,c])=>(
                          <span key={l} style={{fontSize:10,color:c}}><b>{l}:</b> {fmt(v)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Planilha mês a mês — estilo Resumo de Débito */}
              <div style={{background:"#fff",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <p style={{fontFamily:"Syne",fontWeight:700,fontSize:13,color:"#0f172a"}}>📋 Resumo de Débito — Mês a Mês</p>
                  <p style={{fontSize:11,color:"#94a3b8"}}>{resultado.linhasMes?.length||0} lançamentos</p>
                </div>
                <div style={{overflowX:"auto",maxHeight:320,overflowY:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
                    <thead style={{position:"sticky",top:0,zIndex:1}}>
                      <tr style={{background:"#f8fafc"}}>
                        {["MÊS REF.","VECTO",
                          ...(resultado.dividasDetalhe?.length>1?["DÍVIDA"]:[]),
                          "VALOR","MULTA","CORREÇÃO","JUROS","ENCARGOS","BONIFICAÇÃO",
                          ...(incluirHonorarios?["HONORÁRIOS"]:[]),
                          "TOTAL"
                        ].map(h=>(
                          <th key={h} style={{padding:"7px 8px",textAlign:"right",fontSize:9,fontWeight:700,color:"#64748b",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                            <span style={{display:"block",textAlign:h==="MÊS REF."||h==="VECTO"||h==="DÍVIDA"?"left":"right"}}>{h}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(resultado.linhasMes||[]).map((l,i)=>(
                        <tr key={i} style={{borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafafe"}}>
                          <td style={{padding:"5px 8px",fontWeight:700,color:"#4f46e5",fontSize:11}}>{l.mesRef}</td>
                          <td style={{padding:"5px 8px",color:"#64748b",fontSize:10}}>{fmtDate(l.vecto)}</td>
                          {resultado.dividasDetalhe?.length>1&&<td style={{padding:"5px 8px",color:"#7c3aed",fontSize:10,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.descricao}</td>}
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#0f172a",fontWeight:600}}>{fmt(l.valor)}</td>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#dc2626"}}>{fmt(l.multa)}</td>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#7c3aed"}}>{fmt(l.correcao)}</td>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#d97706"}}>{fmt(l.juros)}</td>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#64748b"}}>{fmt(l.encargos)}</td>
                          <td style={{padding:"5px 8px",textAlign:"right",color:"#16a34a"}}>{fmt(l.bonificacao)}</td>
                          {incluirHonorarios&&<td style={{padding:"5px 8px",textAlign:"right",color:"#b45309",fontWeight:700}}>{fmt(l.honorarios)}</td>}
                          <td style={{padding:"5px 8px",textAlign:"right",fontWeight:800,color:"#0f172a"}}>{fmt(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"#1e1b4b",borderTop:"2px solid #4f46e5"}}>
                        <td colSpan={2} style={{padding:"7px 8px",fontWeight:800,color:"#fff",fontSize:11}}>TOTAL DO IMÓVEL:</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#a5f3fc"}}>{fmt(resultado.valorOriginal)}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#fca5a5"}}>{fmt(resultado.multa)}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#c4b5fd"}}>{fmt(resultado.correcao)}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#fde68a"}}>{fmt(resultado.juros)}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#e2e8f0"}}>{fmt(resultado.encargos)}</td>
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#bbf7d0"}}>{fmt(resultado.bonificacao)}</td>
                        {incluirHonorarios&&<td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#fcd34d"}}>{fmt(resultado.honorarios)}</td>}
                        <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#4ade80",fontSize:13}}>{fmt(resultado.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// RELATÓRIOS & CARTEIRA
// ═══════════════════════════════════════════════════════════════
function Relatorios({ devedores, processos, andamentos, credores }) {
  const [abaRel, setAbaRel] = useState("geral"); // "geral" | "credor" | "contatos" | "despesas"
  const [credorSel, setCredorSel] = useState("");
  const [dtInicio, setDtInicio] = useState("");
  const [dtFim, setDtFim] = useState("");

  // ── Cálculos gerais ──────────────────────────────────────────
  function calcDividas(devs) {
    const todas = devs.flatMap(d=>d.dividas||[]);
    const totalNominal = todas.reduce((s,div)=>s+(div.valor_total||0),0);
    const todasParcs = todas.flatMap(div=>div.parcelas||[]);
    const pago = todasParcs.filter(p=>p.status==="pago").reduce((s,p)=>s+p.valor,0);
    const aberto = todasParcs.filter(p=>p.status!=="pago").reduce((s,p)=>s+p.valor,0);
    const atrasadas = todasParcs.filter(p=>p.status!=="pago"&&new Date((p.venc||p.vencimento)+"T12:00:00")<new Date()).length;
    const despesas = todas.reduce((s,div)=>s+(div.despesas||0),0);
    const honorarios = todas.reduce((s,div)=>s+(div.valor_total||0)*(div.honorarios_pct||0)/100,0);
    return { totalNominal, pago, aberto, atrasadas, despesas, honorarios };
  }

  const devsFiltrados = devedores.filter(d => {
    if(credorSel && String(d.credor_id)!==String(credorSel)) return false;
    return true;
  });

  const stats = calcDividas(devsFiltrados);
  const taxa = stats.totalNominal ? (stats.pago/stats.totalNominal*100).toFixed(1) : 0;

  // ── Por credor ───────────────────────────────────────────────
  const porCredor = credores.map(c=>{
    const devs = devedores.filter(d=>d.credor_id===c.id);
    const s = calcDividas(devs);
    return { ...c, ...s, qtdDevedores:devs.length, taxa: s.totalNominal?(s.pago/s.totalNominal*100).toFixed(1):0 };
  }).filter(c=>c.qtdDevedores>0);

  // ── Exportar CSV ─────────────────────────────────────────────
  function exportCSV(dados, nome) {
    if(!dados.length) return alert("Sem dados para exportar.");
    const keys = Object.keys(dados[0]);
    const csv = [keys.join(";"), ...dados.map(r=>keys.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(";"))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));
    a.download = nome; a.click();
  }

  function exportRelatorioDevedor() {
    const rows = devsFiltrados.map(d=>{
      const dividas = d.dividas||[];
      const s = calcDividas([d]);
      const credor = credores.find(c=>c.id===d.credor_id);
      return {
        Nome: d.nome, CPF_CNPJ: d.cpf_cnpj, Status: d.status,
        Credor: credor?.nome||"—",
        Qtd_Dividas: dividas.length,
        Valor_Nominal: s.totalNominal,
        Valor_Pago: s.pago,
        Valor_Em_Aberto: s.aberto,
        Parcelas_Atrasadas: s.atrasadas,
        Despesas: s.despesas,
        Honorarios_Estimados: s.honorarios,
      };
    });
    exportCSV(rows, "carteira_devedores.csv");
  }

  function exportRelatorioCredor() {
    exportCSV(porCredor.map(c=>({
      Credor: c.nome, Devedores: c.qtdDevedores,
      Nominal: c.totalNominal, Pago: c.pago, Em_Aberto: c.aberto,
      Atrasadas: c.atrasadas, Taxa_Recuperacao: c.taxa+"%",
      Despesas: c.despesas, Honorarios: c.honorarios,
    })), "carteira_por_credor.csv");
  }

  const KPI = ({l,v,c,sub}) => (
    <div style={{background:"#fff",borderRadius:16,padding:"16px 20px",border:"1px solid #f1f5f9"}}>
      <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{l}</p>
      <p style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:c||"#0f172a"}}>{v}</p>
      {sub&&<p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{sub}</p>}
    </div>
  );

  return (
    <div>
      <h2 style={{fontFamily:"Syne",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:6}}>Relatórios & Carteira</h2>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid #f1f5f9"}}>
        {[["geral","📊 Geral"],["credor","🏛 Por Credor"],["despesas","💸 Despesas"]].map(([a,l])=>(
          <button key={a} onClick={()=>setAbaRel(a)} style={{padding:"8px 18px",border:"none",background:"none",cursor:"pointer",fontFamily:"Mulish",fontWeight:700,fontSize:13,color:abaRel===a?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaRel===a?"#4f46e5":"transparent"}`,marginBottom:-2}}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Filtrar por Credor</label>
          <select value={credorSel} onChange={e=>setCredorSel(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Mulish"}}>
            <option value="">Todos os credores</option>
            {credores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <Btn onClick={exportRelatorioDevedor} color="#059669">{I.dl} Exportar Devedores</Btn>
        <Btn onClick={exportRelatorioCredor} color="#4f46e5">{I.dl} Exportar por Credor</Btn>
      </div>

      {/* ── ABA GERAL ── */}
      {abaRel==="geral"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:22}}>
            <KPI l="Carteira Nominal" v={fmt(stats.totalNominal)} c="#4f46e5"/>
            <KPI l="Valor Pago/Recuperado" v={fmt(stats.pago)} c="#059669"/>
            <KPI l="Valor em Aberto" v={fmt(stats.aberto)} c="#dc2626"/>
            <KPI l="Taxa Recuperação" v={taxa+"%"} c="#d97706"/>
            <KPI l="Parcelas Atrasadas" v={stats.atrasadas} c="#dc2626" sub="requerem atenção"/>
            <KPI l="Honorários Estimados" v={fmt(stats.honorarios)} c="#6d28d9"/>
          </div>

          {/* Tabela devedores */}
          <div style={{background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a"}}>Devedores — {devsFiltrados.length} registros</p>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Devedor","Credor","Status","Nominal","Pago","Em Aberto","Atraso"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",color:"#64748b",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {devsFiltrados.map(d=>{
                    const s = calcDividas([d]);
                    const credor = credores.find(c=>c.id===d.credor_id);
                    return(
                      <tr key={d.id} style={{borderTop:"1px solid #f8fafc"}}>
                        <td style={{padding:"10px 12px",fontWeight:700,color:"#0f172a"}}>{d.nome}</td>
                        <td style={{padding:"10px 12px",fontSize:11,color:"#64748b"}}>{(credor?.nome||"—").split(" ").slice(0,2).join(" ")}</td>
                        <td style={{padding:"10px 12px"}}><Badge s={d.status||"ativo"}/></td>
                        <td style={{padding:"10px 12px",color:"#0f172a",fontWeight:600}}>{fmt(s.totalNominal)}</td>
                        <td style={{padding:"10px 12px",color:"#059669",fontWeight:700}}>{fmt(s.pago)}</td>
                        <td style={{padding:"10px 12px",color:"#dc2626",fontWeight:700}}>{fmt(s.aberto)}</td>
                        <td style={{padding:"10px 12px"}}>
                          {s.atrasadas>0&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#fee2e2",color:"#dc2626"}}>{s.atrasadas} parc.</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA POR CREDOR ── */}
      {abaRel==="credor"&&(
        <div>
          {porCredor.length===0&&<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:32}}>Nenhum credor com devedores cadastrados.</p>}
          {porCredor.map(c=>(
            <div key={c.id} style={{background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",marginBottom:16,overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,#4f46e5,#7c3aed)",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontFamily:"Syne",fontWeight:700,fontSize:15,color:"#fff"}}>{c.nome}</p>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{c.qtdDevedores} devedor{c.qtdDevedores>1?"es":""} · Taxa de recuperação: <b style={{color:"#a5f3fc"}}>{c.taxa}%</b></p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Em aberto</p>
                  <p style={{fontFamily:"Syne",fontWeight:800,fontSize:20,color:"#fff"}}>{fmt(c.aberto)}</p>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0}}>
                {[["Nominal",fmt(c.totalNominal),"#0f172a"],["Recuperado",fmt(c.pago),"#059669"],["Honorários",fmt(c.honorarios),"#6d28d9"],["Despesas",fmt(c.despesas),"#d97706"]].map(([l,v,col])=>(
                  <div key={l} style={{padding:"12px 16px",borderTop:"1px solid #f1f5f9",borderRight:"1px solid #f1f5f9"}}>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{l}</p>
                    <p style={{fontWeight:800,fontSize:15,color:col}}>{v}</p>
                  </div>
                ))}
              </div>
              {/* Barra de progresso */}
              <div style={{padding:"10px 20px",borderTop:"1px solid #f1f5f9"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                  <span>Progresso de recuperação</span><b style={{color:"#059669"}}>{c.taxa}%</b>
                </div>
                <div style={{height:6,background:"#f1f5f9",borderRadius:99}}>
                  <div style={{height:6,width:`${Math.min(100,parseFloat(c.taxa)||0)}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:99}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ABA DESPESAS ── */}
      {abaRel==="despesas"&&(
        <div>
          <div style={{background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid #f1f5f9"}}>
              <p style={{fontFamily:"Syne",fontWeight:700,fontSize:14,color:"#0f172a"}}>Despesas por Devedor</p>
              <p style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Valores lançados nas dívidas como despesas operacionais</p>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  {["Devedor","Credor","Dívida","Despesas","Honorários Estimados","Status"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",color:"#64748b",fontWeight:700,fontSize:10,textTransform:"uppercase"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {devsFiltrados.flatMap(d=>{
                    const credor = credores.find(c=>c.id===d.credor_id);
                    return (d.dividas||[]).filter(div=>(div.despesas||0)>0).map(div=>(
                      <tr key={div.id} style={{borderTop:"1px solid #f8fafc"}}>
                        <td style={{padding:"9px 12px",fontWeight:700,color:"#0f172a"}}>{d.nome}</td>
                        <td style={{padding:"9px 12px",fontSize:11,color:"#64748b"}}>{(credor?.nome||"—").split(" ").slice(0,2).join(" ")}</td>
                        <td style={{padding:"9px 12px",color:"#475569"}}>{div.descricao}</td>
                        <td style={{padding:"9px 12px",color:"#d97706",fontWeight:700}}>{fmt(div.despesas||0)}</td>
                        <td style={{padding:"9px 12px",color:"#6d28d9",fontWeight:700}}>{fmt((div.valor_total||0)*(div.honorarios_pct||0)/100)}</td>
                        <td style={{padding:"9px 12px"}}><Badge s={d.status||"ativo"}/></td>
                      </tr>
                    ));
                  })}
                  {devsFiltrados.flatMap(d=>(d.dividas||[]).filter(div=>(div.despesas||0)>0)).length===0&&(
                    <tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#94a3b8"}}>Nenhuma despesa lançada. Adicione despesas ao cadastrar uma dívida.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{padding:"10px 18px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#64748b"}}>Total de Despesas:</span>
              <b style={{color:"#d97706"}}>{fmt(devsFiltrados.reduce((s,d)=>(d.dividas||[]).reduce((ss,div)=>ss+(div.despesas||0),s),0))}</b>
            </div>
          </div>
        </div>
      )}
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
  const [modalAberto, setModalAberto] = useState(false); // controla se tem modal aberto em qualquer módulo

  const [devedores,  setDevedores]  = useState([]);
  const [credores,   setCredores]   = useState([]);
  const [processos,  setProcessos]  = useState([]);
  const [andamentos, setAndamentos] = useState([]);
  const [regua,      setRegua]      = useState([]);

  const carregarTudo = useCallback(async (silencioso=false) => {
    if(!silencioso) setCarregando(true);
    try {
      const [devs, creds, procs, ands, reg] = await Promise.all([
        dbGet("devedores"), dbGet("credores"), dbGet("processos"), dbGet("andamentos"), dbGet("regua"),
      ]);
      const parse = (v,fb="[]") => { try{ return typeof v==="string"?JSON.parse(v||fb):(v||JSON.parse(fb)); }catch(e){return JSON.parse(fb);} };
      setDevedores((devs||[]).map(d=>{
        const dividas  = parse(d.dividas);
        const contatos = parse(d.contatos);
        const acordos  = parse(d.acordos).map(ac=>({...ac, parcelas: verificarAtrasados(ac.parcelas||[])}));
        // valor_original pode ser calculado das dividas se o banco não tiver a coluna
        const valorCalc = dividas.reduce((s,div)=>s+(div.valor_total||0),0);
        const valorFinal = d.valor_original || valorCalc || d.valor_nominal || 0;
        return { ...d,
          dividas, contatos, acordos,
          parcelas: parse(d.parcelas),
          valor_original: valorFinal,
          valor_nominal: d.valor_nominal || valorFinal,
        };
      }));
      setCredores(creds||[]);
      setProcessos(procs||[]);
      setAndamentos(ands||[]);
      setRegua(reg||[]);
    } catch(e) { console.error(e); }
    if(!silencioso) setCarregando(false);
  }, []);

  useEffect(() => { if(user) carregarTudo(); }, [user, carregarTudo]);

  // Polling a cada 60s — mas PAUSA se houver modal aberto
  useEffect(() => {
    if(!user) return;
    const iv = setInterval(() => {
      if(!modalAberto) carregarTudo(true); // silencioso = não mostra spinner
    }, 60000);
    return () => clearInterval(iv);
  }, [user, carregarTudo, modalAberto]);

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
    devedores:   <Devedores   devedores={devedores} setDevedores={setDevedores} credores={credores} onModalChange={setModalAberto} user={user} processos={processos} setTab={setTab}/>,
    credores:    <Credores    credores={credores}   setCredores={setCredores}/>,
    processos:   <Processos   processos={processos} setProcessos={setProcessos} devedores={devedores} credores={credores} andamentos={andamentos} setAndamentos={setAndamentos} user={user}/>,
    regua:       <Regua       processos={processos} devedores={devedores} regua={regua} setRegua={setRegua}/>,
    calculadora: <Calculadora devedores={devedores}/>,
    relatorios:  <Relatorios  devedores={devedores} processos={processos} andamentos={andamentos} credores={credores}/>,
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
