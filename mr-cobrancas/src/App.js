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
  { id:1, nome:"Advair Freitas Vieira", oab:"OAB/GO 39.275", email:"advairvieira@gmail.com", senha:"010789wi", role:"admin" },
];
// Carregar usuários extras cadastrados pelo admin
function getExtraUsers(){ 
  try{ return JSON.parse(localStorage.getItem("mr_users_extra")||"[]"); }catch{ return []; } 
}
// Sincronização: busca do Supabase na inicialização e atualiza localStorage
async function syncExtraUsers() {
  try {
    const res = await dbGet("usuarios_sistema","order=criado_em.asc");
    if(Array.isArray(res)&&res.length>=0) {
      localStorage.setItem("mr_users_extra", JSON.stringify(res));
    }
  } catch(e) { /* silencioso — usa localStorage como fallback */ }
}

// ─── FONT ────────────────────────────────────────────────────
const FontLink = () => (
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
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
  // Dashboard — grade moderna com cantos arredondados
  dash: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>,
  // Devedores — pessoa com cifrão
  dev: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M19 8v6M16 11h6"/></svg>,
  // Credores — banco/instituição
  cred: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18"/><path d="M6 22V11"/><path d="M10 22V11"/><path d="M14 22V11"/><path d="M18 22V11"/><path d="M2 11l10-8 10 8"/></svg>,
  proc: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  regua: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  // Calculadora — moderna com display
  calc: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="3"/><rect x="7" y="5" width="10" height="4" rx="1"/><circle cx="8" cy="14" r="1" fill="currentColor"/><circle cx="12" cy="14" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/><circle cx="8" cy="18" r="1" fill="currentColor"/><circle cx="12" cy="18" r="1" fill="currentColor"/><circle cx="16" cy="18" r="1" fill="currentColor"/></svg>,
  // Relatórios — gráfico de tendência
  rel: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/><path d="M5 20H2v-3"/><path d="M19 4h3v3"/></svg>,
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
  // Bell moderno com ponto de notificação
  bell: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  // Régua de cobrança — escadas crescentes
  regua2: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-4"/></svg>,
  // Usuários — grupo com escudo
  users2: <svg style={{width:18,height:18,flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  // Plus moderno
  plus2: <svg style={{width:18,height:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
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
      <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth: wide ? 860 : 660,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,.3)",border:"1px solid #e2e8f0" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:"1px solid #f1f5f9" }}>
          <span style={{ fontFamily:"Space Grotesk",fontWeight:700,fontSize:17,color:"#0f172a" }}>{title}</span>
          <button onClick={onClose} style={{ padding:6,borderRadius:8,border:"none",background:"#f1f5f9",cursor:"pointer",display:"flex" }}>{I.x}</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── INPUT ───────────────────────────────────────────────────
function Inp({ label, value, onChange, type="text", options, span, placeholder="" }) {
  const s = { width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"Plus Jakarta Sans",outline:"none",boxSizing:"border-box" };
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
    <button onClick={onClick} className="mr-btn" style={{ display:"flex",alignItems:"center",gap:6,background:bg,color:tc,border,borderRadius:10,padding: sm ? "6px 14px" : "10px 20px",fontSize: sm ? 12 : 13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:"nowrap",transition:"all .15s",boxShadow:outline?"none":"0 2px 8px rgba(0,0,0,.1)" }}>
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true); setErr("");
    // Sincronizar usuários do Supabase antes de verificar
    await syncExtraUsers().catch(()=>{});
    setTimeout(() => {
      const todosUsers = [...USERS, ...getExtraUsers()]; const user = todosUsers.find(u => u.email === email && u.senha === senha);
      if (user) onLogin(user);
      else { setErr("E-mail ou senha incorretos."); setLoading(false); }
    }, 700);
  }

  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",fontFamily:"Plus Jakarta Sans",position:"relative",overflow:"hidden" }}>
      <FontLink />
      {/* bg pattern */}
      <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 25% 25%, rgba(99,102,241,.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139,92,246,.1) 0%, transparent 50%)" }} />

      <div style={{ background:"rgba(255,255,255,.05)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:24,padding:48,width:"100%",maxWidth:420,position:"relative" }}>
        {/* Logo */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:36 }}>
          <div style={{ width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff",fontFamily:"Space Grotesk",fontWeight:800,fontSize:18 }}>MR</span>
          </div>
          <div>
            <div style={{ fontFamily:"Space Grotesk",fontWeight:800,color:"#fff",fontSize:20,lineHeight:1.1 }}>MR Cobranças</div>
            <div style={{ color:"rgba(255,255,255,.5)",fontSize:12 }}>CRM Jurídico</div>
          </div>
        </div>

        <h1 style={{ fontFamily:"Space Grotesk",fontWeight:700,color:"#fff",fontSize:26,marginBottom:6 }}>Entrar</h1>
        <p style={{ color:"rgba(255,255,255,.5)",fontSize:13,marginBottom:28 }}>Acesse sua conta para continuar</p>

        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,display:"block",marginBottom:6 }}>E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com"
              style={{ width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans" }} />
          </div>
          <div>
            <label style={{ color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,display:"block",marginBottom:6 }}>Senha</label>
            <input value={senha} onChange={e => setSenha(e.target.value)} type="password" placeholder="••••••••"
              style={{ width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans" }}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {err && <p style={{ color:"#f87171",fontSize:12,textAlign:"center" }}>{err}</p>}
          <button onClick={handleLogin} disabled={loading}
            style={{ marginTop:8,padding:"12px",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Space Grotesk",opacity: loading ? .7 : 1 }}>
            {loading ? "Verificando..." : "Acessar sistema →"}
          </button>
        </div>

        <p style={{ color:"rgba(255,255,255,.3)",fontSize:11,textAlign:"center",marginTop:24 }}>
          
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
// DASHBOARD — Foco em Cobrança
// ═══════════════════════════════════════════════════════════════
function Dashboard({ devedores, processos, andamentos, user, lembretes=[] }) {
  const hoje = new Date().toISOString().slice(0,10);

  // ── Métricas de cobrança ──────────────────────────────────────
  const totalCarteira = devedores.reduce((s,d)=>{
    const dividas=d.dividas||[];
    return s+(dividas.reduce((ss,div)=>ss+(div.valor_total||0),0)||d.valor_nominal||d.valor_original||0);
  },0);

  const totalRecuperado = devedores.reduce((s,d)=>{
    const parcsDividas=(d.dividas||[]).flatMap(div=>div.parcelas||[]);
    const recDividas=parcsDividas.filter(p=>p.status==="pago").reduce((ss,p)=>ss+(p.valor||0),0);
    const recAcordos=calcularTotaisAcordo(d.acordos||[]).recuperado;
    return s+recDividas+recAcordos;
  },0);

  const taxaRecuperacao = totalCarteira>0?(totalRecuperado/totalCarteira*100):0;
  const emAberto = totalCarteira - totalRecuperado;

  // Por status
  const porStatus = {};
  devedores.forEach(d=>{ porStatus[d.status]=(porStatus[d.status]||0)+1; });

  // Acordos ativos
  const acordosAtivos = devedores.reduce((s,d)=>s+(d.acordos||[]).filter(a=>a.status==="ativo").length,0);
  const acordosTotal  = devedores.reduce((s,d)=>s+(d.acordos||[]).length,0);

  // Lembretes urgentes
  const lemsUrgentes = lembretes.filter(l=>l.status==="pendente"&&l.data_prometida<=hoje);
  const lemsHoje     = lembretes.filter(l=>l.status==="pendente"&&l.data_prometida===hoje);
  const lemsVencidos = lembretes.filter(l=>l.status==="pendente"&&l.data_prometida<hoje);
  const lemsProx7    = lembretes.filter(l=>l.status==="pendente"&&l.data_prometida>hoje);

  // Parcelas atrasadas (acordos)
  const parcsAtrasadas = devedores.flatMap(d=>
    (d.acordos||[]).flatMap(ac=>(ac.parcelas||[]).filter(p=>p.status==="atrasado"||(p.status==="pendente"&&(p.dataVencimento||"")<=hoje)))
  ).length;



  // Saudação por hora
  const hora = new Date().getHours();
  const saud = hora<12?"Bom dia":"hora<18"?"Boa tarde":"Boa noite";
  const saudacao = hora<12?"Bom dia ☀️":hora<18?"Boa tarde 🌤":"Boa noite 🌙";

  return (
    <div style={{maxWidth:1200}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:26,color:"#0f172a",marginBottom:4}}>
          {saudacao}, {user.nome.split(" ")[0]}!
        </h2>
        <p style={{fontSize:13,color:"#64748b"}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>

      {/* Alerta lembretes urgentes */}
      {lemsUrgentes.length>0&&(
        <div style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",borderRadius:16,padding:"16px 20px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,boxShadow:"0 4px 24px rgba(220,38,38,.25)"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🔔</div>
            <div>
              <p style={{fontWeight:800,color:"#fff",fontSize:15}}>
                {lemsVencidos.length>0&&`${lemsVencidos.length} vencido${lemsVencidos.length>1?"s":""}`}
                {lemsVencidos.length>0&&lemsHoje.length>0&&" · "}
                {lemsHoje.length>0&&`${lemsHoje.length} para hoje`}
              </p>
              <p style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:2}}>
                {lemsUrgentes.slice(0,3).map(l=>{
                  const dev=devedores.find(d=>String(d.id)===String(l.devedor_id));
                  return dev?.nome?.split(" ").slice(0,2).join(" ")||"?";
                }).join(" · ")}
                {lemsUrgentes.length>3&&` · +${lemsUrgentes.length-3} mais`}
              </p>
            </div>
          </div>
          <button onClick={()=>window.dispatchEvent(new CustomEvent("mr_goto",{detail:"lembretes"}))}
            style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Plus Jakarta Sans",whiteSpace:"nowrap"}}>
            Ver lembretes →
          </button>
        </div>
      )}

      {/* KPIs Principais */}
      <div className="mr-grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {[
          { l:"Carteira Total",  v:fmt(totalCarteira),  sub:`${devedores.length} devedor${devedores.length!==1?"es":""}`, ic:"💼", g:"linear-gradient(135deg,#6366f1,#8b5cf6)", glow:"rgba(99,102,241,.35)" },
          { l:"Recuperado",      v:fmt(totalRecuperado), sub:`${taxaRecuperacao.toFixed(1)}% da carteira`,                ic:"✅", g:"linear-gradient(135deg,#10b981,#059669)", glow:"rgba(16,185,129,.35)" },
          { l:"Em Aberto",       v:fmt(emAberto),        sub:`${(100-taxaRecuperacao).toFixed(1)}% pendente`,             ic:"⏳", g:"linear-gradient(135deg,#ef4444,#dc2626)", glow:"rgba(239,68,68,.35)" },
          { l:"Acordos Ativos",  v:acordosAtivos,        sub:`${acordosTotal} acordo${acordosTotal!==1?"s":""} total`,    ic:"🤝", g:"linear-gradient(135deg,#f59e0b,#d97706)", glow:"rgba(245,158,11,.35)" },
        ].map((k,i)=>(
          <div key={i} className="kpi-card" style={{background:k.g,borderRadius:20,padding:"22px 24px",color:"#fff",position:"relative",overflow:"hidden",boxShadow:`0 8px 28px ${k.glow}`,cursor:"default"}}>
            <div style={{position:"absolute",right:-16,top:-16,width:96,height:96,borderRadius:99,background:"rgba(255,255,255,.08)"}}/>
            <div style={{position:"absolute",right:8,bottom:-28,width:72,height:72,borderRadius:99,background:"rgba(255,255,255,.05)"}}/>
            <div style={{position:"absolute",right:18,top:16,fontSize:28,opacity:.22}}>{k.ic}</div>
            <p style={{fontSize:10,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:".1em",opacity:.75}}>{k.l}</p>
            <p style={{fontSize:27,fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,marginBottom:6,letterSpacing:"-1px",lineHeight:1}}>{k.v}</p>
            <p style={{fontSize:11,opacity:.65,fontWeight:500,marginTop:6}}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Segunda linha: métricas de cobrança — clicáveis */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {[
          {l:"🆕 Novos",           v:porStatus.novo||0,           cor:"#64748b",bg:"#f1f5f9", s:"novo"},
          {l:"🔍 Em Localização",  v:porStatus.em_localizacao||0, cor:"#2563eb",bg:"#dbeafe", s:"em_localizacao"},
          {l:"🤝 Em Negociação",   v:porStatus.em_negociacao||0,  cor:"#d97706",bg:"#fef3c7", s:"em_negociacao"},
          {l:"⚖️ Ajuizados",        v:porStatus.ajuizado||0,       cor:"#c2410c",bg:"#ffedd5", s:"ajuizado"},
        ].map(k=>(
          <div key={k.l}
            onClick={()=>window.dispatchEvent(new CustomEvent("mr_goto",{detail:{tab:"devedores",filtroStatus:k.s}}))}
            style={{background:k.bg,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",transition:"transform .12s, box-shadow .12s",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 20px ${k.cor}30`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.06)";}}>
            <div>
              <p style={{fontSize:11,fontWeight:700,color:k.cor,marginBottom:4}}>{k.l}</p>
              <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:26,color:k.cor}}>{k.v}</p>
              <p style={{fontSize:10,color:k.cor,opacity:.6,marginTop:3}}>clique para ver →</p>
            </div>
            <div style={{width:48,height:48,borderRadius:99,background:`${k.cor}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontFamily:"Space Grotesk",fontWeight:800,color:k.cor}}>
              {k.v>0?k.v:"—"}
            </div>
          </div>
        ))}
      </div>

      {/* Linha 3: taxa de recuperação + agenda */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

        {/* Taxa de Recuperação visual */}
        <div style={{background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)",boxShadow:"0 1px 8px rgba(0,0,0,.04)"}}>
          <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:4}}>📊 Taxa de Recuperação</p>
          <p style={{fontSize:11,color:"#94a3b8",marginBottom:18}}>Progresso da carteira</p>
          {/* Donut visual com CSS */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:16}}>
            <div style={{position:"relative",width:120,height:120,marginBottom:12}}>
              <svg viewBox="0 0 36 36" style={{width:120,height:120,transform:"rotate(-90deg)"}}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#grad)" strokeWidth="3.5"
                  strokeDasharray={`${taxaRecuperacao} ${100-taxaRecuperacao}`} strokeLinecap="round"/>
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669"/>
                    <stop offset="100%" stopColor="#4f46e5"/>
                  </linearGradient>
                </defs>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a",lineHeight:1}}>{taxaRecuperacao.toFixed(0)}%</p>
                <p style={{fontSize:9,color:"#94a3b8",marginTop:2}}>recuperado</p>
              </div>
            </div>
          </div>
          {[
            {l:"Recuperado",cor:"#059669",v:fmt(totalRecuperado)},
            {l:"Em aberto", cor:"#dc2626",v:fmt(emAberto)},
            {l:"Total",     cor:"#4f46e5",v:fmt(totalCarteira)},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f8fafc"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:99,background:r.cor}}/>
                <span style={{fontSize:12,color:"#475569"}}>{r.l}</span>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:r.cor}}>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Lembretes do dia */}
        <div style={{background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)",boxShadow:"0 1px 8px rgba(0,0,0,.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a"}}>🔔 Agenda de Cobrança</p>
            <button onClick={()=>window.dispatchEvent(new CustomEvent("mr_goto",{detail:"lembretes"}))}
              style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:7,padding:"3px 10px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Plus Jakarta Sans"}}>Ver tudo</button>
          </div>
          <p style={{fontSize:11,color:"#94a3b8",marginBottom:14}}>Próximos contatos e promessas</p>
          {lemsUrgentes.length===0&&lemsProx7.length===0&&(
            <div style={{textAlign:"center",padding:16}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <p style={{color:"#16a34a",fontSize:13,fontWeight:600}}>Agenda em dia!</p>
              <p style={{color:"#94a3b8",fontSize:11,marginTop:4}}>Nenhum lembrete pendente.</p>
            </div>
          )}
          {[...lemsUrgentes,...lemsProx7].slice(0,4).map(l=>{
            const dev=devedores.find(d=>String(d.id)===String(l.devedor_id));
            const vencido=l.data_prometida<hoje;
            const ehHoje=l.data_prometida===hoje;
            return(
              <div key={l.id} style={{display:"flex",gap:10,padding:"8px 10px",borderRadius:10,marginBottom:6,background:vencido?"#fef2f2":ehHoje?"#fffbeb":"#f8fafc",borderLeft:`3px solid ${vencido?"#dc2626":ehHoje?"#d97706":"#94a3b8"}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:700,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dev?.nome?.split(" ").slice(0,2).join(" ")||"?"}</p>
                  <p style={{fontSize:11,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.descricao}</p>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:vencido?"#fee2e2":ehHoje?"#fef3c7":"#f1f5f9",color:vencido?"#dc2626":ehHoje?"#d97706":"#64748b",alignSelf:"center",flexShrink:0}}>
                  {vencido?"VENC.":ehHoje?"HOJE":fmtDate(l.data_prometida)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Linha 4: Status por funil */}
      <div style={{background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)",boxShadow:"0 1px 8px rgba(0,0,0,.04)"}}>
        <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:16}}>📈 Funil de Cobrança</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:8}}>
          {[
            {v:"novo",           l:"Novo",           cor:"#64748b",bg:"#f1f5f9"},
            {v:"em_localizacao", l:"Localização",    cor:"#2563eb",bg:"#dbeafe"},
            {v:"notificado",     l:"Notificado",     cor:"#7c3aed",bg:"#ede9fe"},
            {v:"em_negociacao",  l:"Negociação",     cor:"#d97706",bg:"#fef3c7"},
            {v:"acordo_firmado", l:"Acordo",         cor:"#16a34a",bg:"#dcfce7"},
            {v:"pago_parcial",   l:"Pago Parcial",   cor:"#0f766e",bg:"#ccfbf1"},
            {v:"pago_integral",  l:"Pago Total",     cor:"#065f46",bg:"#d1fae5"},
            {v:"irrecuperavel",  l:"Irrecuperável",  cor:"#dc2626",bg:"#fee2e2"},
            {v:"ajuizado",       l:"Ajuizado",       cor:"#c2410c",bg:"#ffedd5"},
          ].map(s=>{
            const qtd=porStatus[s.v]||0;
            const maxQtd=Math.max(...Object.values(porStatus),1);
            const pct=Math.round(qtd/maxQtd*100);
            const ir=()=>qtd>0&&window.dispatchEvent(new CustomEvent("mr_goto",{detail:{tab:"devedores",filtroStatus:s.v}}));
            return(
              <div key={s.v} style={{textAlign:"center",cursor:qtd>0?"pointer":"default"}} onClick={ir}
                title={qtd>0?`Ver ${qtd} devedor${qtd>1?"es":""} com status "${s.l}" →`:""}>
                <div style={{height:80,display:"flex",alignItems:"flex-end",justifyContent:"center",marginBottom:6}}>
                  <div style={{width:"100%",maxWidth:32,borderRadius:"6px 6px 0 0",background:qtd>0?s.cor:s.bg,height:`${Math.max(pct,qtd>0?8:4)}%`,transition:"height .5s, opacity .2s",position:"relative",opacity:qtd>0?1:.4}}
                    onMouseEnter={e=>{if(qtd>0)e.currentTarget.style.opacity=".7";}}
                    onMouseLeave={e=>{if(qtd>0)e.currentTarget.style.opacity="1";}}>
                    {qtd>0&&<span style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",fontSize:11,fontWeight:800,color:s.cor}}>{qtd}</span>}
                  </div>
                </div>
                <p style={{fontSize:9,color:qtd>0?s.cor:"#94a3b8",fontWeight:700,lineHeight:1.2}}>{s.l}</p>
                {qtd>0&&<p style={{fontSize:8,color:s.cor,opacity:.7,marginTop:1}}>ver →</p>}
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
  const sty={width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"};
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
        <div style={{background:"#f1f5f9",borderRadius:10,padding:12,display:"flex",justifyContent:"space-between"}}>
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
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
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
    <div style={{background:"#f1f5f9",borderRadius:14,padding:16,border:"2px solid #4f46e5"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:14,color:"#4f46e5"}}>🤝 Novo Acordo</p>
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
          <div style={{display:"flex",justifyContent:"flex-end",padding:"6px 10px",background:"#f1f5f9",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",borderTop:"none",fontSize:12}}>
            <span style={{color:"#64748b"}}>Total: <b style={{color:"#4f46e5"}}>{fmt(parcelas.reduce((s,p)=>s+p.valorParcela,0))}</b></span>
          </div>
        </div>
      )}

      {/* Observações */}
      <div style={{marginBottom:12}}>
        <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2}
          style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
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
        <div style={{textAlign:"center",padding:32,color:"#94a3b8",background:"#f1f5f9",borderRadius:12}}>
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
                  <span style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:15,color:"#0f172a"}}>Acordo — {fmtDate(ac.dataAcordo)}</span>
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
                  <tr style={{background:"#f1f5f9",position:"sticky",top:0}}>
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
              <p style={{fontSize:11,color:"#94a3b8",marginTop:8,fontStyle:"italic",padding:"6px 10px",background:"#f1f5f9",borderRadius:7}}>
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
  status:"novo", responsavel:"", observacoes:"", numero_processo:"",
};
const DIVIDA_VAZIA={descricao:"",valor_total:"",data_origem:"",data_primeira_parcela:"",qtd_parcelas:"1",parcelas:[],indexador:"igpm",multa_pct:"2",juros_am:"1",honorarios_pct:"20",data_inicio_atualizacao:"",despesas:"0",observacoes:"",custas:[]};
const SECOES=[["id","👤 Identificação"],["end","📍 Endereço"],["divida","💰 Dívida"],["ctrl","⚙️ Controle"]];

// ═══════════════════════════════════════════════════════════════
// ABA RELATÓRIO DO DEVEDOR — Histórico + Lembrete Rápido
// ═══════════════════════════════════════════════════════════════
function AbaRelatorio({ sel, user, setSel, setDevedores }) {
  const hoje = new Date().toISOString().slice(0,10);
  const [showForm, setShowForm] = useState(false);
  const [formLem, setFormLem]   = useState({
    tipo:"promessa_pagamento", descricao:"", data_prometida:"",
    hora:"08:00", prioridade:"normal", observacoes:"",
  });
  const FL = (k,v) => setFormLem(f=>({...f,[k]:v}));

  // Registros de contato — Supabase (compartilhado entre usuários)
  const [registros, setRegistros] = useState([]);
  const [carregandoReg, setCarregandoReg] = useState(false);
  const [formReg, setFormReg] = useState({
    data: new Date().toISOString().slice(0,10),
    hora: new Date().toTimeString().slice(0,5),
    tipo:"ligacao", resultado:"sem_resposta",
    relatorio:"", mensagem:"",
  });
  const [showFormReg, setShowFormReg] = useState(false);
  const FR = (k,v) => setFormReg(f=>({...f,[k]:v}));

  useEffect(()=>{
    async function carregar(){
      setCarregandoReg(true);
      try{
        const res = await dbGet("registros_contato",`devedor_id=eq.${sel.id}&order=data.desc,criado_em.desc`);
        setRegistros(Array.isArray(res)?res:[]);
      }catch(e){ setRegistros([]); }
      setCarregandoReg(false);
    }
    carregar();
  },[sel.id]);

  async function salvarRegistro() {
    if(!formReg.relatorio.trim()) return alert("Informe o relatório do contato.");
    const payload = {
      devedor_id:sel.id, data:formReg.data, hora:formReg.hora,
      tipo:formReg.tipo, resultado:formReg.resultado,
      relatorio:formReg.relatorio, mensagem:formReg.mensagem||null,
      criado_por:user?.nome||"Sistema",
    };
    try{
      const res = await dbInsert("registros_contato", payload);
      const novo = Array.isArray(res)?res[0]:res;
      if(novo?.id){ setRegistros(r=>[novo,...r]); }
      else { setRegistros(r=>[{...payload,id:Date.now()},...r]); }
    }catch(e){
      setRegistros(r=>[{...payload,id:Date.now()},...r]);
    }
    setShowFormReg(false);
    setFormReg({data:new Date().toISOString().slice(0,10),hora:new Date().toTimeString().slice(0,5),tipo:"ligacao",resultado:"sem_resposta",relatorio:"",mensagem:""});
  }
  async function excluirRegistro(id) {
    if(!window.confirm("Excluir este registro?")) return;
    try{ await dbDelete("registros_contato", id); }catch(e){}
    setRegistros(r=>r.filter(x=>x.id!==id));
  }

  // Lembretes — Supabase
  const [lemsDevedor, setLemsDevedor] = useState([]);
  useEffect(()=>{
    async function carregarLems(){
      try{
        const res=await dbGet("lembretes",`devedor_id=eq.${sel.id}&order=data_prometida.asc`);
        setLemsDevedor(Array.isArray(res)?res:[]);
      }catch(e){ setLemsDevedor([]); }
    }
    carregarLems();
  },[sel.id]);

  async function salvarLem() {
    if(!formLem.data_prometida) return alert("Informe a data prometida.");
    if(!formLem.descricao.trim()) return alert("Informe a descrição.");
    const payload = {
      devedor_id:sel.id, tipo:formLem.tipo, descricao:formLem.descricao,
      data_prometida:formLem.data_prometida, hora:formLem.hora,
      prioridade:formLem.prioridade, observacoes:formLem.observacoes||null,
      status:"pendente", criado_por:user?.nome||"Sistema",
    };
    try{
      const res=await dbInsert("lembretes",payload);
      const novo=Array.isArray(res)?res[0]:res;
      setLemsDevedor(l=>[...(novo?.id?[novo]:[{...payload,id:Date.now()}]),...l]);
    }catch(e){ setLemsDevedor(l=>[{...payload,id:Date.now()},...l]); }
    setShowForm(false);
    setFormLem({tipo:"promessa_pagamento",descricao:"",data_prometida:"",hora:"08:00",prioridade:"normal",observacoes:""});
    alert("✅ Lembrete criado e visível para todos!");
  }

  async function concluirLem(id) {
    try{ await dbUpdate("lembretes",id,{status:"concluido",concluido_em:new Date().toISOString()}); }catch(e){}
    setLemsDevedor(l=>l.map(x=>x.id!==id?x:{...x,status:"concluido"}));
  }
  async function excluirLem(id) {
    if(!window.confirm("Excluir lembrete?")) return;
    try{ await dbDelete("lembretes",id); }catch(e){}
    setLemsDevedor(l=>l.filter(x=>x.id!==id));
  }

  // Dados
  const contatos    = [...(sel.contatos||[])].sort((a,b)=>b.data.localeCompare(a.data));
  const lemPend     = lemsDevedor.filter(l=>l.status==="pendente");
  const ultimoContat= contatos[0];

  const tipoMap = Object.fromEntries(TIPOS_LEM.map(t=>[t.v,t]));
  const cTipoMap = {ligacao:"📞 Ligação",whatsapp:"📱 WhatsApp",email:"📧 E-mail",carta:"✉️ Carta",visita:"🚗 Visita",outro:"🔹 Outro"};
  const cResMap  = {sem_resposta:"Sem resposta",numero_invalido:"Número inválido",contato_estabelecido:"Contato estabelecido",recusou_negociar:"Recusou negociar",demonstrou_interesse:"Demonstrou interesse",acordo_verbal:"Acordo verbal",outro:"Outro"};

  // Unir eventos numa timeline
  const eventos = [
    ...contatos.map(c=>({...c, _tipo:"contato",  _dt:c.data})),
    ...lemsDevedor.map(l=>({...l, _tipo:"lembrete", _dt:l.data_prometida})),
  ].sort((a,b)=>b._dt.localeCompare(a._dt));

  return (
    <div>

      {/* ── REGISTROS DE CONTATO ─────────────────────────────── */}
      <div style={{background:"#fff",borderRadius:14,border:"1.5px solid #e2e8f0",overflow:"hidden",marginBottom:18}}>
        {/* Cabeçalho */}
        <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f1f5f9"}}>
          <div>
            <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a"}}>📋 Registros de Contato</p>
            <p style={{fontSize:11,color:"#94a3b8",marginTop:1}}>Histórico detalhado de cada tentativa de cobrança</p>
          </div>
          <button onClick={()=>setShowFormReg(v=>!v)}
            style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Plus Jakarta Sans",display:"flex",alignItems:"center",gap:6}}>
            {showFormReg?"✕ Fechar":"+ Registrar Contato"}
          </button>
        </div>

        {/* Formulário de novo registro */}
        {showFormReg&&(
          <div style={{padding:16,borderBottom:"2px solid #ede9fe",background:"#fafafe"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Data do Contato</label>
                <input type="date" value={formReg.data} onChange={e=>FR("data",e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:"1.5px solid #4f46e5",borderRadius:9,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Hora</label>
                <input type="time" value={formReg.hora} onChange={e=>FR("hora",e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Tipo de Contato</label>
                <select value={formReg.tipo} onChange={e=>FR("tipo",e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                  {[["ligacao","📞 Ligação"],["whatsapp","📱 WhatsApp"],["email","📧 E-mail"],["carta","✉️ Carta"],["visita","🚗 Visita"],["outro","🔹 Outro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Resultado</label>
                <select value={formReg.resultado} onChange={e=>FR("resultado",e.target.value)}
                  style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                  {[["sem_resposta","Sem resposta"],["numero_invalido","Nº inválido"],["contato_estabelecido","Contato feito"],["recusou_negociar","Recusou"],["demonstrou_interesse","Interessado"],["acordo_verbal","Acordo verbal"],["outro","Outro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div style={{marginBottom:10}}>
              <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>📝 Relatório do Contato *</label>
              <textarea value={formReg.relatorio} onChange={e=>FR("relatorio",e.target.value)}
                placeholder="Descreva o que aconteceu neste contato: o que o cliente disse, compromissos assumidos, dificuldades relatadas..."
                rows={4}
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical",lineHeight:1.6}}/>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>💬 Mensagem Enviada (WhatsApp / E-mail)</label>
              <textarea value={formReg.mensagem} onChange={e=>FR("mensagem",e.target.value)}
                placeholder="Cole aqui a mensagem exata que foi enviada ao cliente (opcional)..."
                rows={3}
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical",lineHeight:1.6,background:"#f1f5f9",color:"#475569"}}/>
            </div>

            <div style={{display:"flex",gap:8}}>
              <Btn onClick={salvarRegistro} color="#4f46e5">💾 Salvar Registro</Btn>
              <Btn onClick={()=>setShowFormReg(false)} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        )}

        {/* Lista de registros */}
        {registros.length===0&&!showFormReg&&(
          <div style={{padding:32,textAlign:"center",color:"#94a3b8"}}>
            <div style={{fontSize:36,marginBottom:8}}>📋</div>
            <p style={{fontWeight:600,marginBottom:4}}>Nenhum registro ainda</p>
            <p style={{fontSize:12}}>Clique em "+ Registrar Contato" para começar o histórico.</p>
          </div>
        )}

        {registros.map((r,i)=>{
          const tipoLabel = {ligacao:"📞 Ligação",whatsapp:"📱 WhatsApp",email:"📧 E-mail",carta:"✉️ Carta",visita:"🚗 Visita",outro:"🔹 Outro"}[r.tipo]||r.tipo;
          const resLabel  = {sem_resposta:"Sem resposta",numero_invalido:"Nº inválido",contato_estabelecido:"Contato feito",recusou_negociar:"Recusou negociar",demonstrou_interesse:"Demonstrou interesse",acordo_verbal:"Acordo verbal",outro:"Outro"}[r.resultado]||r.resultado;
          const resCor    = {contato_estabelecido:"#16a34a",acordo_verbal:"#059669",demonstrou_interesse:"#0891b2",sem_resposta:"#64748b",numero_invalido:"#dc2626",recusou_negociar:"#dc2626"}[r.resultado]||"#64748b";
          const resBg     = {contato_estabelecido:"#dcfce7",acordo_verbal:"#d1fae5",demonstrou_interesse:"#e0f2fe",sem_resposta:"#f1f5f9",numero_invalido:"#fee2e2",recusou_negociar:"#fee2e2"}[r.resultado]||"#f1f5f9";
          return(
            <div key={r.id} style={{padding:"14px 16px",borderBottom:i<registros.length-1?"1px solid #f1f5f9":"none",background:i%2===0?"#fff":"#fafafe"}}>
              {/* Cabeçalho do registro */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#0f172a"}}>{fmtDate(r.data)}</span>
                  {r.hora&&<span style={{fontSize:12,color:"#64748b",fontWeight:600}}>{r.hora}</span>}
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,background:"#ede9fe",color:"#4f46e5"}}>{tipoLabel}</span>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,background:resBg,color:resCor}}>{resLabel}</span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>por {r.criado_por}</span>
                </div>
                <button onClick={()=>excluirRegistro(r.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:11,flexShrink:0}}>🗑</button>
              </div>

              {/* Relatório */}
              <div style={{background:"#f1f5f9",borderRadius:9,padding:"10px 12px",marginBottom:r.mensagem?8:0,border:"1px solid #f1f5f9"}}>
                <p style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:5}}>📝 Relatório</p>
                <p style={{fontSize:13,color:"#0f172a",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{r.relatorio}</p>
              </div>

              {/* Mensagem enviada */}
              {r.mensagem&&(
                <div style={{background:"#f0fdf4",borderRadius:9,padding:"10px 12px",border:"1px solid #bbf7d0"}}>
                  <p style={{fontSize:10,fontWeight:700,color:"#16a34a",textTransform:"uppercase",marginBottom:5}}>💬 Mensagem Enviada</p>
                  <p style={{fontSize:12,color:"#166534",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"Plus Jakarta Sans"}}>{r.mensagem}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        {[
          {ic:"📞", l:"Contatos",        v:contatos.length,   cor:"#4f46e5", bg:"#ede9fe"},
          {ic:"🔔", l:"Lembretes Ativos",v:lemPend.length,    cor:"#d97706", bg:"#fef3c7"},
          {ic:"📅", l:"Último Contato",  v:ultimoContat?fmtDate(ultimoContat.data):"—", cor:"#0f766e", bg:"#ccfbf1"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <p style={{fontSize:10,fontWeight:700,color:k.cor,textTransform:"uppercase",marginBottom:4}}>{k.ic} {k.l}</p>
            <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:20,color:k.cor}}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Botão / Form Lembrete Rápido */}
      <div style={{marginBottom:18}}>
        {!showForm ? (
          <button onClick={()=>setShowForm(true)}
            style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Plus Jakarta Sans",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            🔔 Criar Lembrete de Cobrança para {sel.nome.split(" ")[0]}
          </button>
        ) : (
          <div style={{background:"#fff",borderRadius:14,padding:18,border:"2px solid #4f46e5"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:14,color:"#4f46e5"}}>🔔 Novo Lembrete — {sel.nome.split(" ")[0]}</p>
              <button onClick={()=>setShowForm(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:20}}>✕</button>
            </div>

            {/* Tipo */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {TIPOS_LEM.map(t=>(
                <button key={t.v} onClick={()=>FL("tipo",t.v)}
                  style={{padding:"7px 6px",border:`1.5px solid ${formLem.tipo===t.v?t.cor:"#e2e8f0"}`,borderRadius:9,background:formLem.tipo===t.v?t.bg:"#fff",color:formLem.tipo===t.v?t.cor:"#64748b",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"Plus Jakarta Sans",textAlign:"left"}}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Descrição *</label>
                <input value={formLem.descricao} onChange={e=>FL("descricao",e.target.value)}
                  placeholder="Ex: Cliente prometeu pagar R$ 500,00"
                  style={{width:"100%",padding:"9px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Data Prometida *</label>
                <input type="date" value={formLem.data_prometida} onChange={e=>FL("data_prometida",e.target.value)}
                  style={{width:"100%",padding:"9px 10px",border:"1.5px solid #4f46e5",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Hora</label>
                <input type="time" value={formLem.hora} onChange={e=>FL("hora",e.target.value)}
                  style={{width:"100%",padding:"9px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Prioridade</label>
                <select value={formLem.prioridade} onChange={e=>FL("prioridade",e.target.value)}
                  style={{width:"100%",padding:"9px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                  {PRIOR.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748b",display:"block",marginBottom:3,textTransform:"uppercase"}}>Observações</label>
                <textarea value={formLem.observacoes} onChange={e=>FL("observacoes",e.target.value)}
                  rows={2} placeholder="Detalhes da promessa ou combinado..."
                  style={{width:"100%",padding:"9px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
              </div>
            </div>

            {sel.telefone&&(
              <div style={{background:"#dcfce7",borderRadius:9,padding:"9px 12px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#15803d",fontWeight:600}}>📱 Abrir WhatsApp ao mesmo tempo?</span>
                <a href={`https://wa.me/55${(sel.telefone||"").replace(/\D/g,"")}?text=${encodeURIComponent(`Olá ${sel.nome.split(" ")[0]}, passando para confirmar: ${formLem.descricao||"nosso combinado"}.`)}`}
                  target="_blank" rel="noreferrer"
                  style={{background:"#16a34a",color:"#fff",borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                  Abrir WhatsApp
                </a>
              </div>
            )}

            <div style={{display:"flex",gap:8}}>
              <Btn onClick={salvarLem} color="#4f46e5">🔔 Salvar Lembrete</Btn>
              <Btn onClick={()=>setShowForm(false)} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Lembretes ativos deste devedor */}
      {lemPend.length>0&&(
        <div style={{marginBottom:18}}>
          <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#d97706",marginBottom:8}}>🔔 Lembretes Pendentes</p>
          {lemPend.map(l=>{
            const tp = tipoMap[l.tipo]||tipoMap.outro;
            const venc = l.data_prometida<hoje;
            return(
              <div key={l.id} style={{background:venc?"#fff7f7":"#fffbf0",border:`1.5px solid ${venc?"#fca5a5":"#fed7aa"}`,borderRadius:12,padding:"11px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div>
                  <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:tp.bg,color:tp.cor}}>{tp.l}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:venc?"#fee2e2":"#fef3c7",color:venc?"#dc2626":"#d97706"}}>
                      {venc?"⚠️ VENCIDO — ":""}{l.hora?`${fmtDate(l.data_prometida)} ${l.hora}`:fmtDate(l.data_prometida)}
                    </span>
                  </div>
                  <p style={{fontSize:13,fontWeight:600,color:"#0f172a"}}>{l.descricao}</p>
                  {l.observacoes&&<p style={{fontSize:11,color:"#94a3b8",marginTop:2,fontStyle:"italic"}}>{l.observacoes}</p>}
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>concluirLem(l.id)} style={{background:"#dcfce7",color:"#15803d",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✅</button>
                  <button onClick={()=>excluirLem(l.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:11}}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline de eventos */}
      <div>
        <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>📋 Histórico Completo</p>
        {eventos.length===0&&(
          <div style={{textAlign:"center",padding:32,background:"#f1f5f9",borderRadius:12,color:"#94a3b8"}}>
            <div style={{fontSize:36,marginBottom:8}}>📋</div>
            <p>Nenhum evento registrado ainda.</p>
            <p style={{fontSize:12,marginTop:4}}>Contatos e lembretes aparecerão aqui.</p>
          </div>
        )}
        <div style={{position:"relative",paddingLeft:4}}>
          {eventos.map((ev,i)=>{
            const isLem   = ev._tipo==="lembrete";
            const tp      = isLem?(tipoMap[ev.tipo]||tipoMap.outro):null;
            const vencLem = isLem&&ev.data_prometida<hoje&&ev.status==="pendente";
            const concLem = isLem&&ev.status==="concluido";
            const dotColor = isLem?(concLem?"#22c55e":vencLem?"#dc2626":"#4f46e5"):"#94a3b8";
            return(
              <div key={ev.id||i} style={{display:"flex",gap:12,marginBottom:12,position:"relative"}}>
                {i<eventos.length-1&&<div style={{position:"absolute",left:15,top:28,bottom:-12,width:2,background:"#f1f5f9",zIndex:0}}/>}
                {/* Dot */}
                <div style={{width:30,height:30,borderRadius:99,background:isLem?(concLem?"#dcfce7":vencLem?"#fee2e2":"#ede9fe"):"#f1f5f9",border:`2px solid ${dotColor}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,zIndex:1}}>
                  {isLem?(concLem?"✅":vencLem?"⚠️":"🔔"):"📞"}
                </div>
                {/* Card */}
                <div style={{flex:1,background:"#fff",borderRadius:12,padding:"10px 14px",border:`1px solid ${vencLem?"#fca5a5":isLem?"#e9d5ff":"#f1f5f9"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:4,marginBottom:5}}>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {isLem?(
                        <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:tp?.bg,color:tp?.cor}}>{tp?.l}</span>
                      ):(
                        <span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:"#f1f5f9",color:"#64748b"}}>{cTipoMap[ev.tipo]||ev.tipo}</span>
                      )}
                      {!isLem&&ev.resultado&&<span style={{fontSize:10,color:"#475569",fontWeight:600,padding:"1px 7px",borderRadius:99,background:"#f1f5f9"}}>{cResMap[ev.resultado]||ev.resultado}</span>}
                      {concLem&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:"#dcfce7",color:"#15803d"}}>✅ Concluído</span>}
                      {vencLem&&<span style={{fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:99,background:"#fee2e2",color:"#dc2626"}}>⚠️ Vencido</span>}
                    </div>
                    <span style={{fontSize:10,color:"#94a3b8",flexShrink:0}}>
                      {isLem
                        ? (ev.hora?`${fmtDate(ev.data_prometida)} ${ev.hora}`:fmtDate(ev.data_prometida))
                        : String(ev.data||"").slice(0,16).replace("T"," ")
                      }
                    </span>
                  </div>
                  <p style={{fontSize:12,color:"#0f172a",fontWeight:isLem?600:400,lineHeight:1.5}}>
                    {isLem ? ev.descricao : (ev.obs||"—")}
                  </p>
                  {(ev.observacoes||ev.obs2)&&<p style={{fontSize:11,color:"#94a3b8",marginTop:3,fontStyle:"italic"}}>{ev.observacoes}</p>}
                  <p style={{fontSize:10,color:"#94a3b8",marginTop:4}}>por {isLem?ev.criado_por:ev.responsavel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// IMPRIMIR FICHA DO DEVEDOR EM PDF
// ═══════════════════════════════════════════════════════════════
async function imprimirFicha(sel, credores, fmt, fmtDate) {
  // Carregar jsPDF
  let jsPDF;
  if(window.jspdf?.jsPDF) {
    jsPDF = window.jspdf.jsPDF;
  } else {
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload=res; s.onerror=rej;
      document.head.appendChild(s);
    });
    jsPDF = window.jspdf?.jsPDF;
  }
  if(!jsPDF){ alert("Não foi possível carregar o gerador de PDF."); return; }

  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210; // largura A4
  const ML = 14; // margem esquerda
  const MR = W - 14; // margem direita
  let y = 0;

  // ── Cores ────────────────────────────────────────────────────
  const azul    = [79,70,229];
  const escuro  = [15,23,42];
  const cinza   = [100,116,139];
  const branco  = [255,255,255];
  const verde   = [5,150,105];
  const vermelho= [220,38,38];

  // ── Helpers ──────────────────────────────────────────────────
  function cabecalhoSecao(titulo, yPos) {
    doc.setFillColor(...azul);
    doc.rect(ML, yPos, MR-ML, 7, "F");
    doc.setTextColor(...branco);
    doc.setFont("helvetica","bold"); doc.setFontSize(9);
    doc.text(titulo, ML+3, yPos+4.8);
    doc.setTextColor(...escuro);
    return yPos + 10;
  }
  function linha(label, value, xL, xV, yPos, largLabel=40) {
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...cinza);
    doc.text(String(label||""), xL, yPos);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...escuro);
    const val = String(value||"—");
    const maxW = (xV===xL+largLabel) ? (MR-xV-2) : 60;
    const linhas = doc.splitTextToSize(val, maxW);
    doc.text(linhas, xV, yPos);
    return yPos + (linhas.length > 1 ? linhas.length*4.5 : 5.5);
  }
  function checkPage(yPos, needed=20) {
    if(yPos + needed > 280) { doc.addPage(); return 15; }
    return yPos;
  }
  function hrLine(yPos) {
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.3);
    doc.line(ML, yPos, MR, yPos);
    return yPos + 4;
  }

  // ── CABEÇALHO DA FICHA ───────────────────────────────────────
  doc.setFillColor(15,23,42);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...azul);
  doc.rect(0, 33, W, 2, "F");

  doc.setTextColor(...branco);
  doc.setFont("helvetica","bold"); doc.setFontSize(18);
  doc.text("MR Cobranças", ML, 14);
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.setTextColor(165,243,252);
  doc.text("CRM Jurídico — Ficha do Devedor", ML, 20);

  // Data de emissão
  doc.setTextColor(148,163,184); doc.setFontSize(8);
  doc.text("Emitido em: "+new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}), MR-60, 14);
  doc.text("Por: "+(sel.responsavel||"Sistema"), MR-60, 19);

  y = 42;

  // Nome do devedor
  doc.setTextColor(...escuro);
  doc.setFont("helvetica","bold"); doc.setFontSize(16);
  doc.text(sel.nome||"—", ML, y);
  y += 7;

  // Status badge + tipo
  const stMap = {novo:"Novo",em_localizacao:"Em Localização",notificado:"Notificado",em_negociacao:"Em Negociação",acordo_firmado:"Acordo Firmado",pago_integral:"Pago Integralmente",pago_parcial:"Pago Parcial",irrecuperavel:"Irrecuperável",ajuizado:"Ajuizado"};
  doc.setFontSize(9); doc.setFont("helvetica","bold");
  doc.setTextColor(...azul);
  doc.text("Status: "+(stMap[sel.status]||sel.status||"—"), ML, y);
  doc.setTextColor(...cinza); doc.setFont("helvetica","normal");
  doc.text("  ·  Tipo: "+( sel.tipo==="PF"?"Pessoa Física":"Pessoa Jurídica"), ML+40, y);
  const credor = (credores||[]).find(c=>String(c.id)===String(sel.credor_id));
  if(credor) doc.text("  ·  Credor: "+credor.nome?.slice(0,30), ML+80, y);
  y += 8;

  // Linha divisória
  y = hrLine(y);

  // ── 1. IDENTIFICAÇÃO ─────────────────────────────────────────
  y = cabecalhoSecao("1. IDENTIFICAÇÃO", y);
  const col1x = ML, col1v = ML+38, col2x = W/2+4, col2v = W/2+42;

  const id1 = [
    ["CPF/CNPJ:", sel.cpf_cnpj],
    ["RG:", sel.rg],
    ["Nascimento:", fmtDate(sel.data_nascimento)],
    ["Profissão:", sel.profissao],
  ];
  const id2 = [
    ["Sócio/Resp.:", sel.socio_nome],
    ["CPF Sócio:", sel.socio_cpf],
    ["E-mail:", sel.email],
    ["Responsável:", sel.responsavel],
  ];
  const maxI = Math.max(id1.length, id2.length);
  for(let i=0;i<maxI;i++){
    y = checkPage(y, 8);
    const yL = y;
    if(id1[i]) linha(id1[i][0], id1[i][1], col1x, col1v, yL);
    if(id2[i]) linha(id2[i][0], id2[i][1], col2x, col2v, yL);
    y = yL + 6;
  }

  // Telefones
  y = checkPage(y, 8);
  linha("Telefone 1:", sel.telefone, col1x, col1v, y);
  linha("Telefone 2:", sel.telefone2, col2x, col2v, y);
  y += 6;

  // Nº processo
  if(sel.numero_processo) {
    y = checkPage(y, 8);
    linha("Nº Processo:", sel.numero_processo, col1x, col1v, y);
    y += 6;
  }

  y = hrLine(y);

  // ── 2. ENDEREÇO ──────────────────────────────────────────────
  if(sel.logradouro||sel.cidade) {
    y = checkPage(y, 20);
    y = cabecalhoSecao("2. ENDEREÇO", y);
    const endereco = [sel.logradouro, sel.numero, sel.complemento].filter(Boolean).join(", ");
    const cidadeUF = [sel.bairro, sel.cidade, sel.uf].filter(Boolean).join(" — ");
    if(endereco) { linha("Logradouro:", endereco, col1x, col1v, y); y+=6; }
    if(cidadeUF) { linha("Cidade/UF:", cidadeUF, col1x, col1v, y); y+=6; }
    if(sel.cep)  { linha("CEP:", sel.cep, col1x, col1v, y); y+=6; }
    y = hrLine(y);
  }

  // ── 3. DÍVIDAS COM ATUALIZAÇÃO MONETÁRIA ────────────────────
  const dividas = sel.dividas||[];
  const hojeCalc = new Date().toISOString().slice(0,10);
  if(dividas.length>0) {
    y = checkPage(y, 25);
    y = cabecalhoSecao("3. DÍVIDAS — VALORES ATUALIZADOS EM "+new Date().toLocaleDateString("pt-BR"), y);
    const idxMap = {igpm:"IGP-M",ipca:"IPCA",selic:"SELIC",inpc:"INPC",nenhum:"Sem correção"};
    let totalGeralDiv=0, totalGeralCorr=0, totalGeralJuros=0, totalGeralMulta=0, totalGeralHon=0;

    dividas.forEach((div,di)=>{
      // ── Calcular atualização desta dívida ──
      const dataIni = div.data_inicio_atualizacao||div.data_vencimento||div.data_origem||hojeCalc;
      const PV = div.valor_total||0;
      const fator = calcularFatorCorrecao(div.indexador||"igpm", dataIni, hojeCalc);
      const correcao = Math.max(0, PV*(fator-1));
      const PC = PV + correcao; // principal corrigido
      const meses = Math.max(0, Math.ceil((new Date(hojeCalc+"T12:00:00")-new Date(dataIni+"T12:00:00"))/(1000*60*60*24*30.44)));
      const i = (parseFloat(div.juros_am)||0)/100;
      const juros = PC*(Math.pow(1+i,meses)-1);
      const multaVal = PC*((parseFloat(div.multa_pct)||0)/100);
      const honPct = parseFloat(div.honorarios_pct||20)/100;
      const subtotal = PC+juros+multaVal;
      const hon = subtotal*honPct;
      const total = subtotal+hon;

      totalGeralDiv  += PV;
      totalGeralCorr += correcao;
      totalGeralJuros+= juros;
      totalGeralMulta+= multaVal;
      totalGeralHon  += hon;

      y = checkPage(y, 30);

      // Cabeçalho da dívida com valor ORIGINAL e ATUALIZADO
      doc.setFillColor(238,242,255);
      doc.rect(ML, y-3, MR-ML, 8, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...escuro);
      doc.text(`${di+1}. ${div.descricao||"Dívida"}`, ML+2, y+1.5);
      // Valor atualizado em destaque
      doc.setTextColor(...azul);
      doc.text(`Total Atualizado: ${fmt(total)}`, MR-2, y+1.5, {align:"right"});
      y += 11;

      // Linha de detalhes técnicos
      doc.setFontSize(7); doc.setTextColor(...cinza);
      const det = [
        `Venc: ${fmtDate(div.data_vencimento||div.data_origem)}`,
        `${meses}m`,
        `${idxMap[div.indexador]||"IGP-M"}`,
        `Juros: ${div.juros_am||0}%am`,
        `Multa: ${div.multa_pct||0}%`,
        `Hon: ${div.honorarios_pct||20}%`,
      ].join("  ·  ");
      doc.text(det, ML+2, y);
      y += 7;

      // ── Tabela de valores ──
      const colunas = [
        {l:"Valor Original",    v:fmt(PV),       x:ML,    w:35},
        {l:"Correção Mon.",     v:fmt(correcao), x:ML+36, w:30, cor:azul},
        {l:"Princ. Corrigido",  v:fmt(PC),       x:ML+67, w:35, cor:azul},
        {l:"Juros",             v:fmt(juros),    x:ML+103, w:28, cor:[217,119,6]},
        {l:"Multa",             v:fmt(multaVal), x:ML+132, w:25, cor:[220,38,38]},
        {l:"Honorários",        v:fmt(hon),      x:ML+158, w:28, cor:[180,83,9]},
      ];

      // Fundo da tabela
      doc.setFillColor(250,251,255);
      doc.rect(ML, y-3, MR-ML, 14, "F");
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.2);
      doc.rect(ML, y-3, MR-ML, 14, "S");

      colunas.forEach(col=>{
        doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
        doc.setTextColor(...cinza);
        doc.text(col.l, col.x+1, y);
        doc.setFontSize(8); doc.setFont("helvetica","bold");
        doc.setTextColor(...(col.cor||escuro));
        doc.text(col.v, col.x+1, y+6);
      });

      // Total em destaque
      doc.setFillColor(...azul);
      doc.rect(MR-30, y-3, 30, 14, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(6.5); doc.setTextColor(...branco);
      doc.text("TOTAL", MR-27, y);
      doc.setFontSize(8.5);
      doc.text(fmt(total), MR-1, y+6, {align:"right"});
      y += 16;

      // Parcelas (máx 5 por dívida no PDF para não explodir)
      const parcs = div.parcelas||[];
      if(parcs.length>0) {
        y = checkPage(y, 8);
        doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(...cinza);
        doc.text("Nº", ML+2, y); doc.text("Vencimento", ML+12, y); doc.text("Valor", ML+42, y); doc.text("Status", ML+64, y);
        y += 4;
        doc.setFont("helvetica","normal");
        parcs.slice(0,10).forEach((p,pi)=>{
          y = checkPage(y, 6);
          const stP = p.status==="pago"?"Pago":p.status==="atrasado"?"Atrasado":"Pendente";
          const corP = p.status==="pago"?verde:p.status==="atrasado"?vermelho:cinza;
          doc.setTextColor(...cinza);
          doc.text(String(pi+1), ML+2, y);
          doc.text(fmtDate(p.venc||p.vencimento), ML+12, y);
          doc.text(fmt(p.valor||0), ML+42, y);
          doc.setTextColor(...corP); doc.setFont("helvetica","bold");
          doc.text(stP, ML+64, y);
          doc.setFont("helvetica","normal"); doc.setTextColor(...cinza);
          y += 4.5;
        });
        if(parcs.length>10) {
          doc.setTextColor(...cinza);
          doc.text(`... e mais ${parcs.length-10} parcela(s)`, ML+2, y);
          y += 5;
        }
      }

      // Custas da dívida
      const custas = div.custas||[];
      if(custas.length>0) {
        y = checkPage(y, 8);
        doc.setFillColor(255,247,237);
        doc.rect(ML, y-2, MR-ML, 6+custas.length*5, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(194,65,12);
        doc.text("Custas Judiciais (só correção):", ML+2, y+1.5); y+=6;
        custas.forEach(c=>{
          const fCust = calcularFatorCorrecao(div.indexador||"igpm", c.data||hojeCalc, hojeCalc);
          const vCust = parseFloat(c.valor)||0;
          const corrCust = vCust*(fCust-1);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...cinza);
          doc.text(`${c.descricao||"—"}  ·  ${fmtDate(c.data)}  ·  Original: ${fmt(vCust)}  ·  Atualizado: ${fmt(vCust+corrCust)}`, ML+4, y);
          y += 5;
        });
      }
      y += 4;
    });

    // ── Totalizador geral das dívidas ──
    if(dividas.length>1) {
      y = checkPage(y, 20);
      doc.setFillColor(15,23,42);
      doc.rect(ML, y-3, MR-ML, 12, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...branco);
      doc.text("TOTAL GERAL DAS DÍVIDAS", ML+3, y+2);
      doc.setFontSize(6.5); doc.setTextColor(165,180,252);
      doc.text(`Original: ${fmt(totalGeralDiv)}`, ML+3, y+7);
      doc.text(`Correção: ${fmt(totalGeralCorr)}`, ML+40, y+7);
      doc.text(`Juros: ${fmt(totalGeralJuros)}`, ML+80, y+7);
      doc.text(`Multa: ${fmt(totalGeralMulta)}`, ML+110, y+7);
      doc.text(`Hon: ${fmt(totalGeralHon)}`, ML+140, y+7);
      doc.setFontSize(9); doc.setTextColor(74,222,128);
      doc.text(`TOTAL: ${fmt(totalGeralDiv+totalGeralCorr+totalGeralJuros+totalGeralMulta+totalGeralHon)}`, MR-2, y+5.5, {align:"right"});
      y += 16;
    }
    y = hrLine(y);
  }

  // ── 4. ACORDOS ───────────────────────────────────────────────
  const acordos = sel.acordos||[];
  if(acordos.length>0) {
    y = checkPage(y, 20);
    y = cabecalhoSecao("4. ACORDOS", y);
    acordos.forEach((ac,ai)=>{
      y = checkPage(y, 16);
      const totAc = calcularTotaisAcordo([ac]);
      doc.setFillColor(248,250,252); doc.rect(ML, y-3, MR-ML, 7, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...escuro);
      doc.text(`Acordo ${ai+1} — ${fmtDate(ac.dataAcordo||ac.criado_em)}`, ML+2, y+1.5);
      doc.setTextColor(...verde);
      doc.text(`Recuperado: ${fmt(totAc.recuperado)} / ${fmt(ac.valorNegociado||0)}`, MR-2, y+1.5, {align:"right"});
      y += 9;
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...cinza);
      doc.text(`Status: ${ac.status||"—"}   ·   Parcelas: ${(ac.parcelas||[]).length}   ·   Desconto: ${fmt((ac.valorOriginal||0)-(ac.valorNegociado||0))}`, ML+2, y);
      y += 7;
    });
    y = hrLine(y);
  }

  // ── 5. HISTÓRICO DE CONTATOS ─────────────────────────────────
  const contatos = [...(sel.contatos||[])].reverse();
  if(contatos.length>0) {
    y = checkPage(y, 20);
    y = cabecalhoSecao("5. HISTÓRICO DE CONTATOS", y);
    const cTipo = {ligacao:"Ligação",whatsapp:"WhatsApp",email:"E-mail",carta:"Carta",visita:"Visita",outro:"Outro"};
    const cRes  = {sem_resposta:"Sem resposta",numero_invalido:"Nº inválido",contato_estabelecido:"Contato feito",recusou_negociar:"Recusou",demonstrou_interesse:"Interessado",acordo_verbal:"Acordo verbal",outro:"Outro"};
    contatos.forEach((c,ci)=>{
      y = checkPage(y, 14);
      if(ci%2===0){ doc.setFillColor(250,250,252); doc.rect(ML,y-2,MR-ML,12,"F"); }
      doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(...escuro);
      doc.text(`${fmtDate(c.data)}  ·  ${cTipo[c.tipo]||c.tipo||"—"}  ·  ${cRes[c.resultado]||c.resultado||"—"}`, ML+2, y+1.5);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...cinza);
      doc.text("Por: "+(c.responsavel||"—"), MR-2, y+1.5, {align:"right"});
      y += 6;
      if(c.obs) {
        const linhasObs = doc.splitTextToSize(c.obs, MR-ML-4);
        doc.text(linhasObs, ML+2, y);
        y += linhasObs.length*4+2;
      } else {
        y += 3;
      }
    });
    y = hrLine(y);
  }

  // ── 6. OBSERVAÇÕES ───────────────────────────────────────────
  if(sel.observacoes) {
    y = checkPage(y, 20);
    y = cabecalhoSecao("6. OBSERVAÇÕES", y);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...escuro);
    const linhasObs = doc.splitTextToSize(sel.observacoes, MR-ML-4);
    doc.text(linhasObs, ML, y);
    y += linhasObs.length*5+6;
  }

  // ── 7. REGISTROS DE CONTATO (localStorage) ───────────────────
  let registros = [];
  try { registros = JSON.parse(localStorage.getItem(`mr_registros_${sel.id}`)||"[]"); } catch(e){}
  if(registros.length>0) {
    y = checkPage(y, 20);
    y = cabecalhoSecao("7. REGISTROS DE CONTATO DETALHADOS", y);
    const rTipo = {ligacao:"Ligação",whatsapp:"WhatsApp",email:"E-mail",carta:"Carta",visita:"Visita",outro:"Outro"};
    const rRes  = {sem_resposta:"Sem resposta",numero_invalido:"Nº inválido",contato_estabelecido:"Contato feito",recusou_negociar:"Recusou",demonstrou_interesse:"Interessado",acordo_verbal:"Acordo verbal",outro:"Outro"};
    registros.forEach((r,ri)=>{
      y = checkPage(y, 20);
      // Cabeçalho do registro
      doc.setFillColor(248,250,252); doc.rect(ML, y-3, MR-ML, 7, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(...escuro);
      doc.text(`${ri+1}. ${fmtDate(r.data)} ${r.hora||""}  —  ${rTipo[r.tipo]||r.tipo}  —  ${rRes[r.resultado]||r.resultado}`, ML+2, y+1.5);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...cinza);
      doc.text("Por: "+(r.criado_por||"—"), MR-2, y+1.5, {align:"right"});
      y += 9;
      // Relatório
      if(r.relatorio) {
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...cinza);
        doc.text("Relatório:", ML+2, y); y+=5;
        doc.setFont("helvetica","normal"); doc.setTextColor(...escuro);
        const lRel = doc.splitTextToSize(r.relatorio, MR-ML-6);
        lRel.forEach(l=>{ y=checkPage(y,6); doc.text(l, ML+4, y); y+=4.5; });
        y+=2;
      }
      // Mensagem
      if(r.mensagem) {
        y = checkPage(y, 10);
        doc.setFillColor(240,253,244); doc.rect(ML+2, y-2, MR-ML-4, 6, "F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(5,150,105);
        doc.text("Mensagem enviada:", ML+4, y+1.5); y+=6;
        doc.setFont("helvetica","normal"); doc.setTextColor(22,101,52);
        const lMsg = doc.splitTextToSize(r.mensagem, MR-ML-8);
        lMsg.forEach(l=>{ y=checkPage(y,5); doc.text(l, ML+4, y); y+=4.5; });
        y+=3;
      }
      y+=4;
    });
  }

  // ── RODAPÉ EM TODAS AS PÁGINAS ───────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for(let p=1;p<=totalPages;p++){
    doc.setPage(p);
    doc.setFillColor(15,23,42);
    doc.rect(0, 290, W, 7, "F");
    doc.setTextColor(148,163,184); doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.text("MR Cobranças — CRM Jurídico | Documento confidencial", ML, 294.5);
    doc.text(`Página ${p} de ${totalPages}`, MR, 294.5, {align:"right"});
  }

  // Mobile: iOS não suporta doc.save direto — usar blob URL
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(isMobile) {
    try {
      const blob = doc.output("blob");
      const url  = URL.createObjectURL(blob);
      // Abrir em nova aba — permite salvar no mobile
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha_${(sel.nome||"devedor").replace(/\s+/g,"_").toLowerCase()}.pdf`;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
    } catch(e) {
      // Fallback final: abrir data URI
      const dataUri = doc.output("datauristring");
      window.open(dataUri, "_blank");
    }
  } else {
    doc.save(`ficha_${(sel.nome||"devedor").replace(/\s+/g,"_").toLowerCase()}.pdf`);
  }
}

function CustasAvulsasForm({ onSalvar }) {
  const [custas, setCustas] = useState([]);
  function addCusta(){ setCustas(r=>[...r,{id:Date.now(),descricao:"",valor:"",data:""}]); }
  function upd(ci,k,v){ setCustas(r=>r.map((x,xi)=>xi===ci?{...x,[k]:v}:x)); }
  function rem(ci){ setCustas(r=>r.filter((_,xi)=>xi!==ci)); }
  async function salvar(){
    const ok=custas.filter(c=>c.descricao&&c.valor&&c.data);
    if(!ok.length) return alert("Preencha descrição, valor e data de ao menos uma custa.");
    await onSalvar(ok);
    setCustas([]);
  }
  return(
    <div style={{background:"#fff7ed",borderRadius:14,padding:16,border:"1.5px solid #fed7aa",marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#c2410c"}}>🏛 Lançar Custas Avulsas</p>
          <p style={{fontSize:11,color:"#9a3412",marginTop:2}}>Só correção monetária, sem juros — lançamento independente de dívida</p>
        </div>
        <button onClick={addCusta} style={{background:"#c2410c",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>+ Custa</button>
      </div>
      {custas.length===0&&(
        <p style={{fontSize:12,color:"#c2410c",opacity:.6,textAlign:"center",padding:"8px 0"}}>
          Clique em "+ Custa" para lançar custas sem precisar cadastrar uma dívida
        </p>
      )}
      {custas.map((c,ci)=>(
        <div key={c.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
          <input placeholder="Ex: custa judicial - 01/12/2023" value={c.descricao} onChange={e=>upd(ci,"descricao",e.target.value)}
            style={{padding:"7px 9px",border:"1.5px solid #fed7aa",borderRadius:8,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}/>
          <input type="number" placeholder="Valor (R$)" value={c.valor} onChange={e=>upd(ci,"valor",e.target.value)}
            style={{padding:"7px 9px",border:"1.5px solid #fed7aa",borderRadius:8,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}/>
          <input type="date" value={c.data} onChange={e=>upd(ci,"data",e.target.value)}
            style={{padding:"7px 9px",border:"1.5px solid #fed7aa",borderRadius:8,fontSize:12,outline:"none"}}/>
          <button onClick={()=>rem(ci)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 9px",cursor:"pointer",fontSize:12}}>✕</button>
        </div>
      ))}
      {custas.length>0&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:"1px dashed #fed7aa"}}>
          <span style={{fontSize:12,color:"#c2410c",fontWeight:700}}>
            Total: {fmt(custas.reduce((s,c)=>s+(parseFloat(c.valor)||0),0))}
          </span>
          <Btn onClick={salvar} color="#c2410c">🏛 Salvar Custas</Btn>
        </div>
      )}
    </div>
  );
}

function Devedores({ devedores, setDevedores, credores, onModalChange, user, processos=[], setTab }) {
  const [search,setSearch]=useState("");
  const [filtroStatus,setFiltroStatus]=useState("");

  // Escuta filtro vindo do Dashboard
  useEffect(()=>{
    const handler = e => {
      if(e.detail?.filtroStatus !== undefined) setFiltroStatus(e.detail.filtroStatus);
    };
    window.addEventListener("mr_filtro", handler);
    return () => window.removeEventListener("mr_filtro", handler);
  }, []);
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
      // #1 — completo
      {nome:form.nome,cpf_cnpj:form.cpf_cnpj,tipo:form.tipo,email:form.email||null,
       telefone:form.telefone||null,cidade:form.cidade||"Goiânia",
       credor_id:form.credor_id?parseInt(form.credor_id):null,
       valor_original:valorNominal,status:form.status||"novo",dividas:JSON.stringify([]),
       rg:form.rg||null,profissao:form.profissao||null,socio_nome:form.socio_nome||null,
       socio_cpf:form.socio_cpf||null,telefone2:form.telefone2||null,cep:form.cep||null,
       logradouro:form.logradouro||null,numero:form.numero||null,complemento:form.complemento||null,
       bairro:form.bairro||null,uf:form.uf||"GO",descricao_divida:form.descricao_divida||null,
       observacoes:form.observacoes||null,numero_processo:form.numero_processo||null,
       contatos:JSON.stringify([]),acordos:JSON.stringify([])},
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
        numero_processo:form.numero_processo||null,
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
      const payload={nome:formEdit.nome,cpf_cnpj:formEdit.cpf_cnpj,tipo:formEdit.tipo,email:formEdit.email||null,telefone:formEdit.telefone||null,cidade:formEdit.cidade||"Goiânia",credor_id:formEdit.credor_id?parseInt(formEdit.credor_id):null,valor_original:parseFloat(formEdit.valor_nominal)||sel.valor_original||0,status:formEdit.status||"novo",rg:formEdit.rg||null,profissao:formEdit.profissao||null,socio_nome:formEdit.socio_nome||null,socio_cpf:formEdit.socio_cpf||null,telefone2:formEdit.telefone2||null,cep:formEdit.cep||null,logradouro:formEdit.logradouro||null,numero:formEdit.numero||null,complemento:formEdit.complemento||null,bairro:formEdit.bairro||null,uf:formEdit.uf||"GO",descricao_divida:formEdit.descricao_divida||null,observacoes:formEdit.observacoes||null,numero_processo:formEdit.numero_processo||null};
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
    if(!total)return alert("Informe o valor da dívida.");
    if(!nd.data_origem)return alert("Informe a Data de Vencimento.");
    // parcelas são OPCIONAIS — dívida pode não ser parcelada
    const dataVenc=nd.parcelas.length>0?(nd.data_primeira_parcela||nd.data_origem):nd.data_origem;
    const divida={id:Date.now(),descricao:nd.descricao||"Dívida",valor_total:total,
      data_origem:nd.data_origem,data_vencimento:dataVenc,
      parcelas:nd.parcelas,  // pode ser [] se não for parcelada
      criada_em:new Date().toISOString().slice(0,10),
      indexador:nd.indexador,multa_pct:parseFloat(nd.multa_pct)||2,
      juros_am:parseFloat(nd.juros_am)||1,honorarios_pct:parseFloat(nd.honorarios_pct)||20,
      data_inicio_atualizacao:nd.data_inicio_atualizacao||dataVenc,
      despesas:parseFloat(nd.despesas)||0,observacoes:nd.observacoes||"",
      custas:nd.custas||[]};
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

  // Salvar custas avulsas em uma dívida existente ou criar entrada só de custas
  async function adicionarCustasAvulsas(custasNovas) {
    if(!sel||!custasNovas.length) return alert("Adicione ao menos uma custa.");
    const validas = custasNovas.filter(c=>c.descricao&&c.valor&&c.data);
    if(!validas.length) return alert("Preencha descrição, valor e data de todas as custas.");
    // Cria uma "dívida" especial só de custas (sem valor principal, só custas)
    const totalCustas = validas.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
    const dividaCustas = {
      id:Date.now(),
      descricao:"Custas Judiciais",
      valor_total:totalCustas,   // soma de todas as custas
      data_origem:validas[0].data,
      data_vencimento:validas[0].data,
      parcelas:[], criada_em:new Date().toISOString().slice(0,10),
      indexador:"igpm",multa_pct:0,juros_am:0,honorarios_pct:0,
      data_inicio_atualizacao:validas[0].data,
      despesas:0,observacoes:"Lançamento avulso de custas judiciais",
      custas:validas, _so_custas:true,
    };
    const dividas=[...(sel.dividas||[]),dividaCustas];
    try{
      const res=await dbUpdate("devedores",sel.id,{dividas:JSON.stringify(dividas),valor_original:dividas.reduce((s,d)=>s+(d.valor_total||0),0)});
      const atu=Array.isArray(res)?res[0]:res;
      const parsed=montarDevAtualizado(atu,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));
      setSel(parsed);
      alert("✅ Custas lançadas com sucesso!");
    }catch(e){
      const parsed=montarDevAtualizado(null,dividas);
      setDevedores(prev=>prev.map(d=>d.id===sel.id?parsed:d));
      setSel(parsed);
      alert("Custas salvas localmente.");
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
            <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:24,color:"#fff",marginBottom:6}}>{sel.nome}</p>
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
              <select value={sel.status} onChange={e=>atualizarStatus(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"none",fontSize:12,fontFamily:"Plus Jakarta Sans",background:"rgba(255,255,255,.1)",color:"#fff",outline:"none"}}>
                {STATUS_DEV.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            {sel.telefone&&<button onClick={()=>abrirWp(sel)} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>📱 WhatsApp</button>}
            <button onClick={()=>imprimirFicha(sel,credores,fmt,fmtDate)} style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>🖨️ Imprimir PDF</button>
            <button onClick={()=>excluirDevedor(sel)} style={{background:"rgba(220,38,38,.3)",color:"#fca5a5",border:"1px solid rgba(220,38,38,.4)",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>🗑 Excluir</button>
          </div>
        </div>

        {/* Abas com scroll */}
        <div style={{position:"relative",marginBottom:16}}>
          <div style={{display:"flex",gap:0,borderBottom:"2px solid #f1f5f9",overflowX:"auto",scrollbarWidth:"thin",scrollbarColor:"#e2e8f0 transparent",WebkitOverflowScrolling:"touch"}}>
            <style>{`.tab-scroll::-webkit-scrollbar{height:3px}.tab-scroll::-webkit-scrollbar-track{background:transparent}.tab-scroll::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px}`}</style>
            {[["dados","📋 Dados"],["contatos","📞 Contatos"],["dividas","💳 Dívidas"],["acordos","🤝 Acordos"],["processos","⚖️ Processos"],["relatorio","📊 Relatório"]].map(([id,label])=>(
              <button key={id} onClick={()=>setAbaFicha(id)}
                style={{padding:"10px 18px",border:"none",background:abaFicha===id?"#fafafe":"none",cursor:"pointer",fontFamily:"Plus Jakarta Sans",fontWeight:700,fontSize:12,color:abaFicha===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaFicha===id?"#4f46e5":"transparent"}`,marginBottom:-2,whiteSpace:"nowrap",flexShrink:0,transition:"all .15s"}}>
                {label}
                {id==="acordos"&&acordos.length>0&&<span style={{marginLeft:5,background:"#4f46e5",color:"#fff",borderRadius:99,fontSize:9,padding:"1px 5px"}}>{acordos.length}</span>}
              </button>
            ))}
          </div>
          {/* Indicador de scroll */}
          <div style={{position:"absolute",right:0,top:0,bottom:2,width:28,background:"linear-gradient(to left,#fff 60%,transparent)",pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
            <span style={{fontSize:10,color:"#c4b5fd"}}>›</span>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>

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
                  <div key={k} style={{padding:"10px 14px",background:"#f1f5f9",borderRadius:10}}>
                    <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>{k}</p>
                    <p style={{fontWeight:600,color:"#0f172a",fontSize:13}}>{v||"—"}</p>
                  </div>
                ))}
              </div>
              {sel.descricao_divida&&<div style={{marginTop:10,padding:"10px 14px",background:"#f1f5f9",borderRadius:10}}><p style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Descrição da Dívida</p><p style={{fontSize:13,color:"#0f172a"}}>{sel.descricao_divida}</p></div>}
              {sel.observacoes&&<div style={{marginTop:10,padding:"10px 14px",background:"#fef9c3",borderRadius:10}}><p style={{fontSize:10,color:"#92400e",fontWeight:700,marginBottom:2,textTransform:"uppercase"}}>Observações</p><p style={{fontSize:13,color:"#0f172a"}}>{sel.observacoes}</p></div>}
              <div style={{display:"flex",gap:8,marginTop:14}}>
                {sel.telefone&&<Btn onClick={()=>abrirWp(sel)}>📱 WhatsApp</Btn>}
                <Btn onClick={()=>excluirDevedor(sel)} danger>🗑 Excluir</Btn>
              </div>
            </div>
          )}

          {/* ABA DADOS — MODO EDIÇÃO */}
          {abaFicha==="dados"&&editando&&(
            <div style={{background:"#f1f5f9",borderRadius:16,padding:20,border:"2px solid #4f46e5"}}>
              <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#4f46e5",marginBottom:16}}>✏️ Editando Cadastro</p>
              <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"1px solid #e2e8f0"}}>
                {SECOES.map(([id,label])=>(
                  <button key={id} onClick={()=>setSecaoForm(id)}
                    style={{padding:"6px 14px",border:"none",background:"none",cursor:"pointer",fontFamily:"Plus Jakarta Sans",fontWeight:700,fontSize:11,color:secaoForm===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${secaoForm===id?"#4f46e5":"transparent"}`,marginBottom:-1}}>
                    {label}
                  </button>
                ))}
              </div>
              {secaoForm==="id"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <INP label="Nome / Razão Social *" value={formEdit.nome||""} onChange={v=>FE("nome",v)} span={2}/>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                    <div style={{display:"flex",gap:8}}>{["PF","PJ"].map(t=><button key={t} onClick={()=>FE("tipo",t)} style={{flex:1,padding:"8px",border:`1.5px solid ${formEdit.tipo===t?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:formEdit.tipo===t?"#4f46e5":"#fff",color:formEdit.tipo===t?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Plus Jakarta Sans"}}>{t==="PF"?"👤 PF":"🏢 PJ"}</button>)}</div>
                  </div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CPF / CNPJ</label><input value={formEdit.cpf_cnpj||""} onChange={e=>FE("cpf_cnpj",formEdit.tipo==="PF"?maskCPF(e.target.value):maskCNPJ(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/></div>
                  {formEdit.tipo==="PF"?(<><INP label="RG" value={formEdit.rg||""} onChange={v=>FE("rg",v)}/><INP label="Data de Nascimento" value={formEdit.data_nascimento||""} onChange={v=>FE("data_nascimento",v)} type="date"/><INP label="Profissão" value={formEdit.profissao||""} onChange={v=>FE("profissao",v)} span={2}/></>):(<><INP label="Sócio / Responsável" value={formEdit.socio_nome||""} onChange={v=>FE("socio_nome",v)} span={2}/><INP label="CPF do Sócio" value={formEdit.socio_cpf||""} onChange={v=>FE("socio_cpf",maskCPF(v))}/></>)}
                  <INP label="E-mail" value={formEdit.email||""} onChange={v=>FE("email",v)} type="email"/>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone</label><input value={formEdit.telefone||""} onChange={e=>FE("telefone",maskTel(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/></div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone 2</label><input value={formEdit.telefone2||""} onChange={e=>FE("telefone2",maskTel(e.target.value))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/></div>
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
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição / Origem</label><textarea value={formEdit.descricao_divida||""} onChange={e=>FE("descricao_divida",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/></div>
                </div>
              )}
              {secaoForm==="ctrl"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
                  <INP label="Status" value={formEdit.status||"novo"} onChange={v=>FE("status",v)} opts={STATUS_DEV.map(s=>({v:s.v,l:s.l}))} span={2}/>
                  <INP label="Responsável" value={formEdit.responsavel||""} onChange={v=>FE("responsavel",v)} span={2}/>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Nº do Processo Judicial (opcional)</label>
                    <input value={formEdit.numero_processo||""} onChange={e=>FE("numero_processo",e.target.value)}
                      placeholder="0000000-00.0000.8.09.0000"
                      style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label><textarea value={formEdit.observacoes||""} onChange={e=>FE("observacoes",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/></div>
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
              <div style={{background:"#f1f5f9",borderRadius:12,padding:14,marginBottom:16,border:"1.5px dashed #e2e8f0"}}>
                <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:10}}>+ Registrar Contato</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <INP label="Tipo de Contato" value={novoContato.tipo} onChange={v=>setNovoContato(c=>({...c,tipo:v}))} opts={[{v:"ligacao",l:"📞 Ligação"},{v:"whatsapp",l:"📱 WhatsApp"},{v:"email",l:"📧 E-mail"},{v:"carta",l:"✉️ Carta"},{v:"visita",l:"🚗 Visita"},{v:"outro",l:"🔹 Outro"}]}/>
                  <INP label="Resultado" value={novoContato.resultado} onChange={v=>setNovoContato(c=>({...c,resultado:v}))} opts={[{v:"sem_resposta",l:"Sem resposta"},{v:"numero_invalido",l:"Número inválido"},{v:"contato_estabelecido",l:"Contato estabelecido"},{v:"recusou_negociar",l:"Recusou negociar"},{v:"demonstrou_interesse",l:"Demonstrou interesse"},{v:"acordo_verbal",l:"Acordo verbal"},{v:"outro",l:"Outro"}]}/>
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label><textarea value={novoContato.obs} onChange={e=>setNovoContato(c=>({...c,obs:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/></div>
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
              {dividas.length===0&&<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:24,background:"#f1f5f9",borderRadius:12}}>Nenhuma dívida cadastrada.</p>}
              {dividas.map(div=>{
                const ehSoCustas = div._so_custas === true;
                const custas = div.custas||[];
                const totalCustas = custas.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
                const pct = div.parcelas?.length>0 ? Math.round(div.parcelas.filter(p=>p.status==="pago").length/div.parcelas.length*100) : 0;
                const bordaColor = ehSoCustas ? "#fed7aa" : "#e2e8f0";
                const bgColor    = ehSoCustas ? "#fffbf7" : "#fff";
                return(
                  <div key={div.id} style={{border:`1.5px solid ${bordaColor}`,borderRadius:14,padding:14,marginBottom:12,background:bgColor}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          {ehSoCustas&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#fed7aa",color:"#c2410c"}}>🏛 CUSTAS</span>}
                          <p style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{div.descricao}</p>
                        </div>
                        {ehSoCustas ? (
                          // Exibição especial para custas
                          <div>
                            <p style={{fontSize:11,color:"#c2410c",fontWeight:600}}>
                              {custas.length} item{custas.length>1?"s":""} · Total: <b>{fmt(totalCustas)}</b> · Só correção monetária
                            </p>
                            {custas.map((c,ci)=>(
                              <div key={ci} style={{display:"flex",gap:12,fontSize:11,color:"#64748b",marginTop:3}}>
                                <span style={{color:"#0f172a",fontWeight:600}}>{c.descricao}</span>
                                <span style={{color:"#c2410c",fontWeight:700}}>{fmt(parseFloat(c.valor)||0)}</span>
                                <span>{fmtDate(c.data)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Exibição normal para dívidas
                          <div>
                            <p style={{fontSize:11,color:"#64748b"}}>
                              {div.parcelas?.length>0
                                ? <>{div.parcelas.length} parcelas · <b style={{color:"#4f46e5"}}>{fmt(div.valor_total)}</b> · {pct}% pago</>
                                : <>À vista · <b style={{color:"#4f46e5"}}>{fmt(div.valor_total)}</b> · Venc: {fmtDate(div.data_vencimento||div.data_origem)}</>
                              }
                            </p>
                            {div.indexador&&<p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Índice: {div.indexador?.toUpperCase()} · Juros: {div.juros_am}%am · Multa: {div.multa_pct}% · Honorários: {div.honorarios_pct}%</p>}
                          </div>
                        )}
                      </div>
                      <button onClick={()=>excluirDivida(div.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"3px 8px",cursor:"pointer",fontSize:10,marginLeft:8}}>🗑</button>
                    </div>
                    {!ehSoCustas&&(
                      <>
                        {div.parcelas?.length>0&&(
                          <div style={{height:4,background:"#f1f5f9",borderRadius:99,marginBottom:10}}>
                            <div style={{height:4,width:`${pct}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:99}}/>
                          </div>
                        )}
                        {div.parcelas?.length>0&&(
                          <div style={{maxHeight:160,overflowY:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                              <thead><tr style={{background:"#f1f5f9"}}>{["Nº","Valor","Vencimento","Status",""].map(h=><th key={h} style={{padding:"5px 8px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
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
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {/* Formulário nova dívida */}
              <div style={{background:"#f1f5f9",borderRadius:14,padding:16,border:"1.5px dashed #e2e8f0",marginTop:8}}>
                <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>➕ Nova Dívida</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Inp label="Descrição" value={nd.descricao} onChange={v=>ND("descricao",v)} span={2}/>
                  <Inp label="Valor Total (R$)" value={nd.valor_total} onChange={v=>ND("valor_total",v)} type="number"/>
                  <Inp label="Data de Vencimento *" value={nd.data_origem} onChange={v=>ND("data_origem",v)} type="date"/>
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
                {/* Parcelamento — só se quiser parcelar */}
                <div style={{background:"#f1f5f9",borderRadius:10,padding:12,marginBottom:10,border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <p style={{fontSize:10,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".05em"}}>📅 Parcelamento (opcional)</p>
                    <span style={{fontSize:10,color:"#94a3b8"}}>Deixe em branco se a dívida não for parcelada</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <Inp label="Data da 1ª Parcela" value={nd.data_primeira_parcela} onChange={v=>ND("data_primeira_parcela",v)} type="date"/>
                    <Inp label="Nº de Parcelas" value={nd.qtd_parcelas} onChange={v=>ND("qtd_parcelas",v)} type="number"/>
                  </div>
                  {nd.valor_total&&parseInt(nd.qtd_parcelas||0)>1&&<div style={{background:"#ede9fe",borderRadius:8,padding:"6px 12px",marginTop:8,fontSize:12}}><b style={{color:"#4f46e5"}}>{nd.qtd_parcelas}x de {fmt((parseFloat(nd.valor_total)||0)/parseInt(nd.qtd_parcelas||1))}</b></div>}
                  {nd.data_primeira_parcela&&parseInt(nd.qtd_parcelas||0)>=1&&<div style={{marginTop:8}}><Btn onClick={confirmarParcelas} outline color="#4f46e5">🔄 Gerar Parcelas</Btn></div>}
                </div>

                {/* Custas Judiciais — só correção, sem juros */}
                <div style={{background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:10,padding:12,marginTop:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <p style={{fontSize:10,fontWeight:700,color:"#c2410c",textTransform:"uppercase",letterSpacing:".05em"}}>🏛 Custas Judiciais <span style={{fontWeight:400,color:"#9a3412"}}>(só correção monetária, sem juros)</span></p>
                    <button onClick={()=>ND("custas",[...(nd.custas||[]),{id:Date.now(),descricao:"",valor:"",data:""}])}
                      style={{background:"#c2410c",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>+ Custa</button>
                  </div>
                  {(nd.custas||[]).map((c,ci)=>(
                    <div key={c.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
                      <input placeholder="Descrição (ex: custa judicial - 01/12/2023)" value={c.descricao} onChange={e=>ND("custas",(nd.custas||[]).map((x,xi)=>xi===ci?{...x,descricao:e.target.value}:x))}
                        style={{padding:"6px 8px",border:"1.5px solid #fed7aa",borderRadius:7,fontSize:11,outline:"none",fontFamily:"Plus Jakarta Sans"}}/>
                      <input type="number" placeholder="Valor (R$)" value={c.valor} onChange={e=>ND("custas",(nd.custas||[]).map((x,xi)=>xi===ci?{...x,valor:e.target.value}:x))}
                        style={{padding:"6px 8px",border:"1.5px solid #fed7aa",borderRadius:7,fontSize:11,outline:"none",fontFamily:"Plus Jakarta Sans"}}/>
                      <input type="date" value={c.data} onChange={e=>ND("custas",(nd.custas||[]).map((x,xi)=>xi===ci?{...x,data:e.target.value}:x))}
                        style={{padding:"6px 8px",border:"1.5px solid #fed7aa",borderRadius:7,fontSize:11,outline:"none"}}/>
                      <button onClick={()=>ND("custas",(nd.custas||[]).filter((_,xi)=>xi!==ci))}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:11}}>✕</button>
                    </div>
                  ))}
                  {(nd.custas||[]).length===0&&<p style={{fontSize:11,color:"#c2410c",opacity:.6}}>Nenhuma custa lançada. Clique em "+ Custa" para adicionar.</p>}
                  {(nd.custas||[]).length>0&&(
                    <div style={{borderTop:"1px solid #fed7aa",paddingTop:6,marginTop:4,fontSize:11,color:"#c2410c",fontWeight:700,textAlign:"right"}}>
                      Total custas: {fmt((nd.custas||[]).reduce((s,c)=>s+(parseFloat(c.valor)||0),0))}
                    </div>
                  )}
                </div>
                {/* Tabela de parcelas geradas */}
                {nd.parcelas.length>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{maxHeight:180,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                        <thead><tr style={{background:"#f1f5f9"}}>{["Nº","Valor (R$)","Vencimento",""].map(h=><th key={h} style={{padding:"6px 9px",textAlign:"left",color:"#64748b",fontWeight:700,fontSize:10}}>{h}</th>)}</tr></thead>
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
                    </div>
                  </div>
                )}

                {/* Botões de ação — sempre visíveis */}
                <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
                  <Btn onClick={adicionarDivida} color="#059669">
                    💾 Salvar Dívida{nd.parcelas.length>0?` (${nd.parcelas.length} parcela${nd.parcelas.length>1?"s":""})`:nd.valor_total?" (à vista)":""}
                  </Btn>
                  {(nd.custas||[]).filter(c=>c.descricao&&c.valor&&c.data).length>0&&(
                    <Btn onClick={()=>adicionarCustasAvulsas((nd.custas||[]).filter(c=>c.descricao&&c.valor&&c.data))} color="#c2410c" outline>
                      🏛 Salvar Só as Custas
                    </Btn>
                  )}
                </div>
              </div>

              {/* ── Lançamento rápido de custas avulsas ── */}
              <CustasAvulsasForm onSalvar={adicionarCustasAvulsas}/>
            </div>
          )}

          {/* ABA ACORDOS */}

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
                <div style={{textAlign:"center",padding:32,color:"#94a3b8",fontSize:13,background:"#f1f5f9",borderRadius:12}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚖️</div>
                  <p>Nenhum processo vinculado.</p>
                  <button onClick={()=>{fecharModal();setTab&&setTab("processos");}} style={{marginTop:14,background:"#4f46e5",color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Plus Jakarta Sans"}}>+ Cadastrar Processo</button>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#0f172a"}}>{procsDevedor.length} processo(s)</p>
                    <button onClick={()=>{fecharModal();setTab&&setTab("processos");}} style={{background:"#ede9fe",color:"#4f46e5",border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Plus Jakarta Sans"}}>+ Novo</button>
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

          {/* ABA RELATÓRIO — Timeline + Lembrete rápido */}
          {abaFicha==="relatorio"&&(
            <AbaRelatorio sel={sel} user={user} setSel={setSel} setDevedores={setDevedores}/>
          )}
        </div>

        {/* WhatsApp Modal */}
        {wp&&(
          <Modal title={`WhatsApp — ${wp.nome}`} onClose={fecharWp}>
            {WP_MSGS(wp).map((m,i)=>(
              <div key={i} style={{border:"1.5px solid #e2e8f0",borderRadius:14,padding:14,marginBottom:10}}>
                <p style={{fontWeight:700,color:"#0f172a",fontSize:13,marginBottom:8}}>{m.titulo}</p>
                <p style={{fontSize:11,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#f1f5f9",padding:10,borderRadius:8,marginBottom:10}}>{m.msg}</p>
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
        <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a"}}>Devedores</h2>
        <Btn onClick={()=>{setForm({...FORM_DEV_VAZIO,responsavel:user?.nome||""});setSecaoForm("id");abrirModal("novo")}}>{I.plus} Novo Devedor</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,marginBottom:16,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Credor</label>
          <select value={filtroCredor} onChange={e=>setFiltroCredor(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todos os credores</option>
            {credores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Status</label>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todos os status</option>
            {STATUS_DEV.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:5,textTransform:"uppercase"}}>Buscar</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou CPF/CNPJ..." style={{padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans",minWidth:200}}/>
        </div>
      </div>

      {/* Tabela */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f1f5f9"}}>
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
                style={{flex:1,padding:"8px 4px",border:"none",background:"none",cursor:"pointer",fontFamily:"Plus Jakarta Sans",fontWeight:700,fontSize:11,color:secaoForm===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${secaoForm===id?"#4f46e5":"transparent"}`,marginBottom:-1,textAlign:"center"}}>
                {label}
              </button>
            ))}
          </div>

          {secaoForm==="id"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <INP label="Nome / Razão Social *" value={form.nome} onChange={v=>F("nome",v)} span={2}/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                <div style={{display:"flex",gap:8}}>{["PF","PJ"].map(t=><button key={t} onClick={()=>F("tipo",t)} style={{flex:1,padding:"8px",border:`1.5px solid ${form.tipo===t?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:form.tipo===t?"#4f46e5":"#fff",color:form.tipo===t?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Plus Jakarta Sans"}}>{t==="PF"?"👤 Pessoa Física":"🏢 Pessoa Jurídica"}</button>)}</div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>CPF / CNPJ</label>
                <input value={form.cpf_cnpj} onChange={e=>F("cpf_cnpj",form.tipo==="PF"?maskCPF(e.target.value):maskCNPJ(e.target.value))} placeholder={form.tipo==="PF"?"000.000.000-00":"00.000.000/0000-00"} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>
              {form.tipo==="PF"?(<><INP label="RG" value={form.rg} onChange={v=>F("rg",v)}/><INP label="Data de Nascimento" value={form.data_nascimento} onChange={v=>F("data_nascimento",v)} type="date"/><INP label="Profissão" value={form.profissao} onChange={v=>F("profissao",v)} span={2}/></>):(<><INP label="Sócio / Responsável" value={form.socio_nome} onChange={v=>F("socio_nome",v)} span={2}/><INP label="CPF do Sócio" value={form.socio_cpf} onChange={v=>F("socio_cpf",maskCPF(v))}/></>)}
              <INP label="E-mail" value={form.email} onChange={v=>F("email",v)} type="email"/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone Principal (WhatsApp)</label>
                <input value={form.telefone} onChange={e=>F("telefone",maskTel(e.target.value))} placeholder="(62) 9 0000-0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Telefone Secundário</label>
                <input value={form.telefone2} onChange={e=>F("telefone2",maskTel(e.target.value))} placeholder="(62) 9 0000-0000" style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
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
                <textarea value={form.descricao_divida} onChange={e=>F("descricao_divida",e.target.value)} placeholder="Ex: Contrato de Compra e Venda nº 001/2023" rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
              </div>
            </div>
          )}
          {secaoForm==="ctrl"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:13}}>
              <INP label="Status" value={form.status||"novo"} onChange={v=>F("status",v)} opts={STATUS_DEV.map(s=>({v:s.v,l:s.l}))}/>
              <INP label="Responsável pelo Caso" value={form.responsavel||""} onChange={v=>F("responsavel",v)}/>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Nº do Processo Judicial <span style={{fontWeight:400,color:"#94a3b8"}}>(opcional)</span></label>
                <input value={form.numero_processo||""} onChange={e=>F("numero_processo",e.target.value)}
                  placeholder="0000000-00.0000.8.09.0000"
                  style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
                <textarea value={form.observacoes||""} onChange={e=>F("observacoes",e.target.value)} placeholder="Informações adicionais..." rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
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
              <p style={{fontSize:11,color:"#64748b",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#f1f5f9",padding:10,borderRadius:8,marginBottom:10}}>{m.msg}</p>
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
        <h2 style={{ fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a" }}>Credores</h2>
        <Btn onClick={()=>setModal(true)}>{I.plus} Novo Credor</Btn>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16 }}>
        {credores.map(c=>(
          <div key={c.id} style={{ background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)",borderTop:`4px solid ${c.ativo?"#4f46e5":"#e2e8f0"}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
              <div>
                <p style={{ fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a" }}>{c.nome}</p>
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
              <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:20,color:"#fff",marginBottom:6}}>{dev?.nome||"Devedor não vinculado"}</p>
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
              style={{padding:"9px 20px",border:"none",background:"none",cursor:"pointer",fontFamily:"Plus Jakarta Sans",fontWeight:700,fontSize:13,color:abaFicha===id?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaFicha===id?"#4f46e5":"transparent"}`,marginBottom:-2}}>
              {label}
              {id==="andamentos"&&procAnds.length>0&&<span style={{marginLeft:5,background:"#4f46e5",color:"#fff",borderRadius:99,fontSize:9,padding:"1px 5px"}}>{procAnds.length}</span>}
            </button>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:18,padding:22,border:"1px solid #e8edf2",boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>

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
                  <div key={k} style={{padding:"10px 14px",background:"#f1f5f9",borderRadius:10}}>
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
                    <select value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                      <option value="">— Selecione —</option>
                      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                {/* Tipo, Fase, Instância, Tribunal */}
                {[["Tipo",PROC_TIPOS,"tipo"],["Fase",PROC_FASES,"fase"],["Instância",PROC_INST,"instancia"],["Tribunal",PROC_TRIB,"tribunal"]].map(([label,opts,key])=>(
                  <div key={key}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                    <select value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                      {opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {/* Vara, Valor, Datas */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Vara / Câmara</label>
                  <input value={formEdit.vara||""} onChange={e=>FE("vara",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
                </div>
                {[["Valor (R$)","valor","number"],["Data de Ajuizamento","data_ajuizamento","date"],["Data de Distribuição","data_distribuicao","date"],["Próximo Prazo","proximo_prazo","date"]].map(([label,key,type])=>(
                  <div key={key}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                    <input type={type} value={formEdit[key]||""} onChange={e=>FE(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
                  </div>
                ))}
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Status</label>
                  <select value={formEdit.status||"em_andamento"} onChange={e=>FE("status",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                    {PROC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
                  <textarea value={formEdit.observacoes||""} onChange={e=>FE("observacoes",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
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
              <div style={{background:"#f1f5f9",borderRadius:12,padding:14,marginBottom:20,border:"1.5px dashed #e2e8f0"}}>
                <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:12}}>+ Registrar Andamento</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tipo</label>
                    <select value={andForm.tipo} onChange={e=>setAndForm(f=>({...f,tipo:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                      {AND_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Data do Andamento</label>
                    <input type="date" value={andForm.data} onChange={e=>setAndForm(f=>({...f,data:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição *</label>
                    <textarea value={andForm.descricao} onChange={e=>setAndForm(f=>({...f,descricao:e.target.value}))} rows={3} placeholder="Descreva o andamento processual..." style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Próximo Prazo (opcional)</label>
                    <input type="date" value={andForm.prazo} onChange={e=>setAndForm(f=>({...f,prazo:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Responsável</label>
                    <input value={andForm.responsavel||user?.nome||""} onChange={e=>setAndForm(f=>({...f,responsavel:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <Btn onClick={addAnd} color="#4f46e5">📌 Registrar Andamento</Btn>
                </div>
              </div>

              {/* Lista de andamentos */}
              {procAnds.length===0&&(
                <p style={{fontSize:13,color:"#94a3b8",textAlign:"center",padding:24,background:"#f1f5f9",borderRadius:12}}>Nenhum andamento registrado.</p>
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
        <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a"}}>Processos</h2>
        <Btn onClick={()=>{setForm({...FORM_PROC_VAZIO});setModal(true)}}>{I.plus} Novo Processo</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,marginBottom:14,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Credor</label>
          <select value={filtroCredor} onChange={e=>setFiltroCredor(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todos os credores</option>
            {credores.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Fase</label>
          <select value={filtroFase} onChange={e=>setFiltroFase(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todas as fases</option>
            {PROC_FASES.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tribunal</label>
          <select value={filtroTrib} onChange={e=>setFiltroTrib(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todos os tribunais</option>
            {PROC_TRIB.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Buscar</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Número ou devedor..." style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans",minWidth:180}}/>
        </div>
      </div>

      {/* Tabela */}
      <div style={{background:"#fff",borderRadius:16,border:"1px solid #f1f5f9",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#f1f5f9"}}>
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
                      <button onClick={()=>{setFichaId(p.id);setAbaFicha("dados");}} style={{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0",borderRadius:7,padding:"5px 8px",cursor:"pointer",fontSize:11}}>Ver →</button>
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
                <select value={form[key]||""} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                  <option value="">— Selecione —</option>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {/* Tipo, Fase, Instância, Tribunal */}
            {[["Tipo",PROC_TIPOS,"tipo"],["Fase",PROC_FASES,"fase"],["Instância",PROC_INST,"instancia"],["Tribunal",PROC_TRIB,"tribunal"]].map(([label,opts,key])=>(
              <div key={key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                <select value={form[key]||opts[0]} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                  {opts.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
            {/* Vara */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Vara / Câmara</label>
              <input value={form.vara} onChange={e=>F("vara",e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
            </div>
            {/* Datas e valor */}
            {[["Valor (R$)","valor","number"],["Data de Ajuizamento","data_ajuizamento","date"],["Data de Distribuição","data_distribuicao","date"],["Próximo Prazo","proximo_prazo","date"]].map(([label,key,type])=>(
              <div key={key}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>{label}</label>
                <input type={type} value={form[key]||""} onChange={e=>F(key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
              </div>
            ))}
            {/* Observações */}
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
              <textarea value={form.observacoes||""} onChange={e=>F("observacoes",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
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
      // Tenta window.jspdf (carregado pelo index.html), senão carrega dinamicamente
      let jsPDF;
      if(window.jspdf?.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
      } else {
        // Carregar script dinamicamente
        await new Promise((resolve, reject) => {
          if(document.querySelector('script[data-jspdf]')) {
            // já tentou carregar, aguardar um pouco
            setTimeout(resolve, 500);
            return;
          }
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.setAttribute('data-jspdf','1');
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
        jsPDF = window.jspdf?.jsPDF;
      }
      if(!jsPDF) throw new Error("Não foi possível carregar o jsPDF. Verifique sua conexão e tente novamente.");
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

      // Cabeçalho tabela — uma linha por dívida
      const honPdf = incluirHonorarios;
      const cols = ["ITEM DESCRIÇÃO","VENCIMENTO","VALOR SINGELO","VALOR ATUALIZADO","JUROS MORAT.","MULTA",
                    ...(honPdf?["HONORÁRIOS"]:[]),
                    "TOTAL"];
      // Larguras proporcional — total = W-28
      const W2 = W-28;
      const colW = honPdf
        ? [42,22,22,26,22,18,22,22]
        : [50,22,24,28,24,20,22];
      let x = 14;
      doc.setFillColor(220,220,240);
      doc.rect(14,y-4,W2,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
      cols.forEach((c,ci)=>{
        if(ci===0) doc.text(c, x+1, y);
        else doc.text(c, x+colW[ci]-1, y, {align:"right"});
        x+=colW[ci];
      });
      y+=6;

      // Linhas — uma por dívida
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      const divDetalhes = resultado.dividasDetalhe?.length>0
        ? resultado.dividasDetalhe
        : [{
            descricao: nomeDevedor||"Dívida",
            dataIni: dataVencimento,
            valor: resultado.valorOriginal,
            valorAtualizado: resultado.principalCorrigido,
            principalCorrigido: resultado.principalCorrigido,
            juros: resultado.juros,
            multa: resultado.multa,
            honorarios: resultado.honorarios,
            total: resultado.total,
          }];

      divDetalhes.forEach((d,di)=>{
        if(di%2===0){ doc.setFillColor(250,250,252); doc.rect(14,y-3.5,W2,5.5,"F"); }
        x=14;
        // Subtotal da dívida (sem honorários) + honorários separados
        const subDiv = d.principalCorrigido + (d.juros||0) + (d.multa||0);
        const honDiv = honPdf?(d.honorarios||0):0;
        const totDiv = subDiv + honDiv;
        const vals = [
          d.descricao,
          fmtDate(d.dataIni),
          fmt(d.valor),
          fmt(d.principalCorrigido||d.valorAtualizado||0),
          fmt(d.juros||0),
          fmt(d.multa||0),
          ...(honPdf?[fmt(honDiv)]:[]),
          fmt(totDiv),
        ];
        vals.forEach((v,vi)=>{
          const rightAlign = vi>0;
          const maxW = colW[vi]-2;
          const txt = doc.splitTextToSize(String(v), maxW)[0]||"";
          if(rightAlign) doc.text(txt, x+colW[vi]-1, y, {align:"right"});
          else { const t=doc.splitTextToSize(v,colW[vi]-2); doc.text(t[0], x+1, y); }
          x+=colW[vi];
        });
        y+=5.5;
        if(y>185){ doc.addPage(); y=15; }
      });

      // Linha de totais
      y+=2;
      doc.setDrawColor(0); doc.line(14,y,W-14,y); y+=4;
      doc.setFillColor(79,70,229);
      doc.rect(14,y-4,W2,8,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.setTextColor(255,255,255);
      doc.text("TOTAIS",15,y);
      x=14+colW[0];
      const totCols=[
        fmt(divDetalhes.reduce((s,d)=>s+d.valor,0)),
        fmt(divDetalhes.reduce((s,d)=>s+(d.principalCorrigido||d.valorAtualizado||0),0)),
        fmt(divDetalhes.reduce((s,d)=>s+(d.juros||0),0)),
        fmt(divDetalhes.reduce((s,d)=>s+(d.multa||0),0)),
        ...(honPdf?[fmt(divDetalhes.reduce((s,d)=>s+(d.honorarios||0),0))]:[] ),
        fmt(resultado.total),
      ];
      totCols.forEach((v,vi)=>{ doc.text(v, x+colW[vi+1]-1, y, {align:"right"}); x+=colW[vi+1]; });
      doc.setTextColor(0,0,0);
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

      doc.save("resumo_debito_"+(nomeDevedor||"devedor").replace(/ /g,"_")+".pdf");
    } catch(e) {
      alert("Erro ao gerar PDF: "+e.message);
    }
  }

  return (
    <div>
      <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:4}}>Calculadora</h2>
      <p style={{fontSize:13,color:"#64748b",marginBottom:18}}>Atualização monetária com honorários integrados — Resumo de Débito.</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

        {/* ── PAINEL ESQUERDO — Parâmetros ── */}
        <div style={{background:"#fff",borderRadius:18,padding:24,border:"1px solid #f1f5f9",display:"flex",flexDirection:"column",gap:0}}>
          <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,marginBottom:14,color:"#0f172a"}}>Parâmetros</p>

          {/* Devedor */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em"}}>Carregar Devedor (opcional)</label>
            <select value={devId} onChange={e=>loadDev(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,fontFamily:"Plus Jakarta Sans",outline:"none"}}>
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
              <div style={{marginBottom:12,background:"#f1f5f9",borderRadius:10,padding:12,border:"1px solid #e2e8f0"}}>
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
              <select value={indexador} onChange={e=>setIndexador(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
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
                <button key={v} onClick={()=>setRegimeJuros(v)} style={{flex:1,padding:"7px",border:`1.5px solid ${regimeJuros===v?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:regimeJuros===v?"#4f46e5":"#fff",color:regimeJuros===v?"#fff":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Plus Jakarta Sans"}}>{l}</button>
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
              <select value={baseMulta} onChange={e=>setBaseMulta(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
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
            <div style={{background:"#f1f5f9",borderRadius:18,padding:24,border:"1px solid #f1f5f9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:320}}>
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
                    <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:30,color:"#fff"}}>{fmt(resultado.total)}</p>
                    <p style={{color:"rgba(255,255,255,.4)",fontSize:11}}>{resultado.meses} meses · {IDX_LABEL[indexador]} · {regimeJuros==="composto"?"J. Compostos":"J. Simples"}</p>
                  </div>
                  <button onClick={exportarPDF} style={{background:"rgba(255,255,255,.1)",color:"#a5f3fc",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"Plus Jakarta Sans",whiteSpace:"nowrap"}}>
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

              {/* ── PLANILHA estilo imagem: Prestação por linha ── */}
              {(()=>{
                // Monta linhas de prestações — cada parcela é uma linha com nome da dívida
                const dev = devedores.find(x=>x.id==devId);
                const dividasCalc = resultado.dividasDetalhe?.length>0 ? resultado.dividasDetalhe : null;

                // Gerar linhas de parcelas com cálculo individual por vencimento
                const linhasParcelas = [];
                if(dev && dividasCalc) {
                  for(const div of dividasCalc) {
                    const divOriginal = (dev.dividas||[]).find(d=>d.id===div.id_original||d.descricao===div.descricao);
                    const parcelas = divOriginal?.parcelas||[];
                    if(parcelas.length>0) {
                      // Linha por parcela
                      parcelas.forEach((p,pi)=>{
                        const dataVenc = p.venc||p.vencimento||div.dataIni;
                        const mesesP = Math.max(0,(new Date(dataCalculo+"T12:00:00")-new Date(dataVenc+"T12:00:00"))/(1000*60*60*24*30.44)|0);
                        const fCorr = calcularFatorCorrecao(div.indexador, dataVenc, dataCalculo);
                        const corrP = p.valor*(fCorr-1);
                        const pcP   = p.valor+corrP;
                        const jP    = regimeJuros==="simples"? pcP*(parseFloat(div.jurosAM)/100)*mesesP : pcP*(Math.pow(1+parseFloat(div.jurosAM)/100,mesesP)-1);
                        const bMul  = baseMulta==="corrigido"?pcP:p.valor;
                        const mP    = bMul*(parseFloat(div.multaPct)/100);
                        const sub   = pcP+jP+mP;
                        const hP    = incluirHonorarios?sub*(parseFloat(div.honorarios_pct??honorariosPct)/100):0;
                        linhasParcelas.push({
                          descricao: divOriginal?.descricao||(pi===0?div.descricao:`${div.descricao} #${pi+1}`),
                          vencimento: dataVenc,
                          valor: p.valor,
                          valorAtualizado: pcP,
                          juros: jP,
                          multa: mP,
                          honorarios: hP,
                          total: sub+hP,
                          meses: mesesP,
                        });
                      });
                    } else {
                      // Sem parcelas: uma linha por dívida
                      linhasParcelas.push({
                        descricao: div.descricao,
                        vencimento: div.dataIni,
                        valor: div.valor,
                        valorAtualizado: div.principalCorrigido,
                        juros: div.juros,
                        multa: div.multa,
                        honorarios: div.honorarios,
                        total: div.total,
                        meses: div.meses,
                      });
                    }
                  }
                } else {
                  // Modo manual — uma linha única
                  linhasParcelas.push({
                    descricao: nomeDevedor||"Dívida",
                    vencimento: dataVencimento,
                    valor: resultado.valorOriginal,
                    valorAtualizado: resultado.principalCorrigido,
                    juros: resultado.juros,
                    multa: resultado.multa,
                    honorarios: resultado.honorarios,
                    total: resultado.total,
                    meses: resultado.meses,
                  });
                }

                // Custas de todas as dívidas (só correção, sem juros)
                const todasCustas = [];
                if(dev) {
                  for(const div of (dev.dividas||[])) {
                    for(const c of (div.custas||[])) {
                      if(!c.valor||!c.data) continue;
                      const fCust = calcularFatorCorrecao(div.indexador||indexador, c.data, dataCalculo);
                      const vCust = parseFloat(c.valor)||0;
                      const corrCust = vCust*(fCust-1);
                      todasCustas.push({
                        descricao: c.descricao||"Custa judicial",
                        data: c.data,
                        valor: vCust,
                        correcao: corrCust,
                        total: vCust+corrCust,
                      });
                    }
                  }
                }

                const subtotalPrincipal = linhasParcelas.reduce((s,l)=>s+l.total,0);
                const subtotalCustas    = todasCustas.reduce((s,c)=>s+c.total,0);
                const totalGeral        = subtotalPrincipal + subtotalCustas;
                const honTotal          = linhasParcelas.reduce((s,l)=>s+l.honorarios,0);

                const thSt = {padding:"7px 10px",fontSize:9,fontWeight:700,color:"#475569",textTransform:"uppercase",whiteSpace:"nowrap",background:"#f1f5f9",borderBottom:"2px solid #e2e8f0"};
                const tdSt = (al="right") => ({padding:"7px 10px",textAlign:al,fontSize:11,borderBottom:"1px solid #f8fafc"});

                return(
                  <div style={{background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",overflow:"hidden"}}>
                    {/* Cabeçalho */}
                    <div style={{padding:"12px 18px",borderBottom:"2px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f1f5f9"}}>
                      <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:14,color:"#0f172a"}}>📋 Planilha de Atualização</p>
                      <p style={{fontSize:11,color:"#94a3b8"}}>{linhasParcelas.length} prestação{linhasParcelas.length>1?"ões":""}{todasCustas.length>0?` + ${todasCustas.length} custa${todasCustas.length>1?"s":""}`:""}</p>
                    </div>

                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
                        <thead>
                          <tr>
                            <th style={{...thSt,textAlign:"left",minWidth:180}}>ITEM DESCRIÇÃO</th>
                            <th style={{...thSt,textAlign:"right"}}>VENCIMENTO</th>
                            <th style={{...thSt,textAlign:"right"}}>VALOR SINGELO</th>
                            <th style={{...thSt,textAlign:"right"}}>VALOR ATUALIZADO</th>
                            <th style={{...thSt,textAlign:"right"}}>JUROS MORATÓRIOS<br/><span style={{fontWeight:400,fontSize:8}}>{jurosAM}% a.m.</span></th>
                            <th style={{...thSt,textAlign:"right"}}>MULTA<br/><span style={{fontWeight:400,fontSize:8}}>{multa}%</span></th>
                            {incluirHonorarios&&<th style={{...thSt,textAlign:"right"}}>HONORÁRIOS<br/><span style={{fontWeight:400,fontSize:8}}>{honorariosPct}%</span></th>}
                            <th style={{...thSt,textAlign:"right",color:"#1d4ed8"}}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linhasParcelas.map((l,i)=>(
                            <tr key={i} style={{background:i%2===0?"#fff":"#fafafe"}}>
                              <td style={{...tdSt("left"),fontWeight:600,color:"#0f172a"}}>{l.descricao}</td>
                              <td style={{...tdSt(),color:"#64748b"}}>{fmtDate(l.vencimento)}</td>
                              <td style={{...tdSt()}}>{fmt(l.valor)}</td>
                              <td style={{...tdSt(),color:"#7c3aed"}}>{fmt(l.valorAtualizado)}</td>
                              <td style={{...tdSt(),color:"#d97706"}}>{fmt(l.juros)}</td>
                              <td style={{...tdSt(),color:"#dc2626"}}>{fmt(l.multa)}</td>
                              {incluirHonorarios&&<td style={{...tdSt(),color:"#b45309"}}>{fmt(l.honorarios)}</td>}
                              <td style={{...tdSt(),fontWeight:800,color:"#1d4ed8"}}>{fmt(l.total)}</td>
                            </tr>
                          ))}
                          {/* Linha de totais das prestações */}
                          <tr style={{background:"#f1f5f9",borderTop:"2px solid #e2e8f0"}}>
                            <td colSpan={2} style={{...tdSt("left"),fontWeight:800,color:"#0f172a",fontSize:12}}>TOTAIS</td>
                            <td style={{...tdSt(),fontWeight:800}}>{fmt(linhasParcelas.reduce((s,l)=>s+l.valor,0))}</td>
                            <td style={{...tdSt(),fontWeight:800,color:"#7c3aed"}}>{fmt(linhasParcelas.reduce((s,l)=>s+l.valorAtualizado,0))}</td>
                            <td style={{...tdSt(),fontWeight:800,color:"#d97706"}}>{fmt(linhasParcelas.reduce((s,l)=>s+l.juros,0))}</td>
                            <td style={{...tdSt(),fontWeight:800,color:"#dc2626"}}>{fmt(linhasParcelas.reduce((s,l)=>s+l.multa,0))}</td>
                            {incluirHonorarios&&<td style={{...tdSt(),fontWeight:800,color:"#b45309"}}>{fmt(honTotal)}</td>}
                            <td style={{...tdSt(),fontWeight:800,color:"#1d4ed8",fontSize:13}}>{fmt(subtotalPrincipal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Bloco de totalizadores — estilo imagem */}
                    <div style={{padding:"16px 20px",borderTop:"2px solid #e2e8f0",background:"#fafafe"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                        <div style={{display:"flex",gap:32,justifyContent:"flex-end",width:"100%",borderBottom:"1px dashed #e2e8f0",paddingBottom:8,marginBottom:8}}>
                          <span style={{fontSize:12,color:"#64748b"}}>Subtotal</span>
                          <span style={{fontSize:13,fontWeight:800,color:"#0f172a",minWidth:120,textAlign:"right"}}>{fmt(subtotalPrincipal)}</span>
                        </div>
                        {incluirHonorarios&&(
                          <div style={{display:"flex",gap:8,justifyContent:"flex-end",width:"100%",alignItems:"center",marginBottom:4}}>
                            <span style={{fontSize:12,color:"#b45309"}}>Honorários advocatícios ({honorariosPct}%)</span>
                            <span style={{fontSize:12,color:"#b45309",minWidth:30,textAlign:"center"}}>(+)</span>
                            <span style={{fontSize:13,fontWeight:700,color:"#b45309",minWidth:120,textAlign:"right"}}>{fmt(honTotal)}</span>
                          </div>
                        )}
                        {todasCustas.length>0&&(
                          <>
                            <div style={{display:"flex",gap:32,justifyContent:"flex-end",width:"100%",borderBottom:"1px dashed #e2e8f0",paddingBottom:8,marginBottom:4}}>
                              <span style={{fontSize:12,fontStyle:"italic",color:"#64748b"}}>Subtotal (antes das custas)</span>
                              <span style={{fontSize:13,fontWeight:800,color:"#0f172a",minWidth:120,textAlign:"right"}}>{fmt(subtotalPrincipal+honTotal)}</span>
                            </div>
                            {/* Custas individuais */}
                            {todasCustas.map((c,i)=>(
                              <div key={i} style={{display:"flex",gap:8,justifyContent:"flex-end",width:"100%",alignItems:"center"}}>
                                <span style={{fontSize:11,color:"#475569",flex:1,textAlign:"right"}}>{c.descricao} — {fmtDate(c.data)}</span>
                                <span style={{fontSize:11,color:"#475569",minWidth:30,textAlign:"center"}}>(+)</span>
                                <span style={{fontSize:12,fontWeight:600,color:"#475569",minWidth:120,textAlign:"right"}}>{fmt(c.total)}</span>
                              </div>
                            ))}
                            <div style={{display:"flex",gap:32,justifyContent:"flex-end",width:"100%",borderTop:"1px dashed #e2e8f0",paddingTop:8,marginTop:4}}>
                              <span style={{fontSize:12,color:"#475569",fontStyle:"italic"}}>Subtotal (custas judiciais)</span>
                              <span style={{fontSize:13,fontWeight:800,color:"#475569",minWidth:120,textAlign:"right"}}>{fmt(subtotalCustas)}</span>
                            </div>
                          </>
                        )}
                        {/* Total Geral destacado */}
                        <div style={{display:"flex",gap:32,justifyContent:"flex-end",width:"100%",borderTop:"3px double #1d4ed8",paddingTop:10,marginTop:4}}>
                          <span style={{fontFamily:"Space Grotesk",fontSize:15,fontWeight:800,color:"#1d4ed8"}}>TOTAL GERAL</span>
                          <span style={{fontFamily:"Space Grotesk",fontSize:16,fontWeight:800,color:"#1d4ed8",minWidth:120,textAlign:"right"}}>{fmt(totalGeral+honTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
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

// ═══════════════════════════════════════════════════════════════
// LEMBRETES E ALERTAS DE COBRANÇA
// ═══════════════════════════════════════════════════════════════
const LEMBRETE_VAZIO = {
  devedor_id:"", descricao:"", data_prometida:"", hora:"08:00",
  tipo:"promessa_pagamento", prioridade:"normal", observacoes:"",
  status:"pendente", // pendente | concluido | cancelado
};
const TIPOS_LEM = [
  {v:"promessa_pagamento", l:"💰 Promessa de Pagamento", cor:"#16a34a", bg:"#dcfce7"},
  {v:"retorno_contato",    l:"📞 Retorno de Contato",    cor:"#2563eb", bg:"#dbeafe"},
  {v:"prazo_acordo",       l:"🤝 Prazo do Acordo",        cor:"#7c3aed", bg:"#ede9fe"},
  {v:"vencimento",         l:"📅 Vencimento de Parcela",  cor:"#d97706", bg:"#fef3c7"},
  {v:"notificacao",        l:"📬 Enviar Notificação",     cor:"#0f766e", bg:"#ccfbf1"},
  {v:"outro",              l:"🔔 Outro",                  cor:"#64748b", bg:"#f1f5f9"},
];
const PRIOR = [
  {v:"urgente", l:"🔴 Urgente"},
  {v:"alta",    l:"🟠 Alta"},
  {v:"normal",  l:"🟡 Normal"},
  {v:"baixa",   l:"🔵 Baixa"},
];

function Lembretes({ devedores, credores, user }) {
  const hoje = new Date().toISOString().slice(0,10);
  const [lembretes, setLembretes]   = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal]           = useState(false);
  const [form, setForm]             = useState({...LEMBRETE_VAZIO, data_prometida:hoje});
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [filtroPrior, setFiltroPrior]   = useState("");
  const [search, setSearch]         = useState("");
  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  // Carregar do Supabase — compartilhado entre todos os usuários
  async function carregarLembretes() {
    setCarregando(true);
    try {
      const res = await dbGet("lembretes","order=data_prometida.asc,criado_em.desc");
      setLembretes(Array.isArray(res)?res:[]);
    } catch(e) { setLembretes([]); }
    setCarregando(false);
  }
  useEffect(()=>{ carregarLembretes(); },[]);

  async function salvar() {
    if(!form.devedor_id) return alert("Selecione o devedor.");
    if(!form.data_prometida) return alert("Informe a data.");
    if(!form.descricao.trim()) return alert("Informe a descrição.");
    const payload = {
      devedor_id:parseInt(form.devedor_id), tipo:form.tipo,
      descricao:form.descricao, data_prometida:form.data_prometida,
      hora:form.hora, prioridade:form.prioridade,
      observacoes:form.observacoes||null,
      status:"pendente", criado_por:user?.nome||"Sistema",
    };
    try {
      const res = await dbInsert("lembretes", payload);
      const novo = Array.isArray(res)?res[0]:res;
      setLembretes(l=>[...(novo?.id?[novo]:[{...payload,id:Date.now(),criado_em:new Date().toISOString()}]),...l]);
    } catch(e) { setLembretes(l=>[{...payload,id:Date.now(),criado_em:new Date().toISOString()},...l]); }
    setForm({...LEMBRETE_VAZIO, data_prometida:hoje});
    setModal(false);
  }

  async function concluir(id) {
    try{ await dbUpdate("lembretes",id,{status:"concluido",concluido_em:new Date().toISOString()}); }catch(e){}
    setLembretes(l=>l.map(x=>x.id!==id?x:{...x,status:"concluido",concluido_em:new Date().toISOString()}));
  }
  async function cancelar(id) {
    try{ await dbUpdate("lembretes",id,{status:"cancelado"}); }catch(e){}
    setLembretes(l=>l.map(x=>x.id!==id?x:{...x,status:"cancelado"}));
  }
  async function reativar(id) {
    try{ await dbUpdate("lembretes",id,{status:"pendente",concluido_em:null}); }catch(e){}
    setLembretes(l=>l.map(x=>x.id!==id?x:{...x,status:"pendente",concluido_em:null}));
  }
  async function excluir(id) {
    if(!window.confirm("Excluir este lembrete?")) return;
    try{ await dbDelete("lembretes",id); }catch(e){}
    setLembretes(l=>l.filter(x=>x.id!==id));
  }

  // Classificar urgência por data
  function urgencia(data) {
    const diff = Math.ceil((new Date(data+"T12:00:00")-new Date())/86400000);
    if(diff<0)  return {l:"VENCIDO",   cor:"#dc2626", bg:"#fee2e2"};
    if(diff===0)return {l:"HOJE",      cor:"#c2410c", bg:"#ffedd5"};
    if(diff<=2) return {l:`${diff}d`,  cor:"#dc2626", bg:"#fee2e2"};
    if(diff<=7) return {l:`${diff}d`,  cor:"#d97706", bg:"#fef3c7"};
    return {l:`${diff}d`, cor:"#64748b", bg:"#f1f5f9"};
  }

  // Filtros
  const filtrados = lembretes.filter(l=>{
    const dev = devedores.find(d=>String(d.id)===String(l.devedor_id));
    const ok1 = !filtroStatus || l.status===filtroStatus;
    const ok2 = !filtroPrior  || l.prioridade===filtroPrior;
    const ok3 = !search ||
      (dev?.nome||"").toLowerCase().includes(search.toLowerCase()) ||
      (l.descricao||"").toLowerCase().includes(search.toLowerCase());
    return ok1&&ok2&&ok3;
  });

  // KPIs
  const pendentes  = lembretes.filter(l=>l.status==="pendente");
  const vencidos   = pendentes.filter(l=>l.data_prometida<hoje);
  const hoje_lem   = pendentes.filter(l=>l.data_prometida===hoje);
  const proximos   = pendentes.filter(l=>l.data_prometida>hoje&&l.data_prometida<=new Date(Date.now()+7*86400000).toISOString().slice(0,10));

  const tipoMap = Object.fromEntries(TIPOS_LEM.map(t=>[t.v,t]));
  const priorOrd = {urgente:0,alta:1,normal:2,baixa:3};

  // Ordenar: urgente > alta > data
  const ordenados = [...filtrados].sort((a,b)=>{
    if(a.status==="pendente"&&b.status!=="pendente") return -1;
    if(b.status==="pendente"&&a.status!=="pendente") return 1;
    const po = (priorOrd[a.prioridade]||2)-(priorOrd[b.prioridade]||2);
    if(po!==0) return po;
    return a.data_prometida.localeCompare(b.data_prometida);
  });

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a"}}>🔔 Lembretes e Alertas</h2>
          <p style={{fontSize:13,color:"#64748b",marginTop:2}}>Controle de promessas de pagamento e retornos de cobrança</p>
        </div>
        <Btn onClick={()=>setModal(true)} color="#4f46e5">+ Novo Lembrete</Btn>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"🔴 Vencidos",    v:vencidos.length,   bg:"#fee2e2",cor:"#dc2626", sub:"precisam de ação imediata"},
          {l:"🟠 Hoje",        v:hoje_lem.length,   bg:"#ffedd5",cor:"#c2410c", sub:"cobranças para hoje"},
          {l:"🟡 Próximos 7d", v:proximos.length,   bg:"#fef3c7",cor:"#d97706", sub:"agendados esta semana"},
          {l:"✅ Total Pend.",  v:pendentes.length,  bg:"#ede9fe",cor:"#7c3aed", sub:"lembretes ativos"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:14,padding:"14px 16px",cursor:"pointer"}}
            onClick={()=>{setFiltroStatus("pendente");setFiltroPrior("");}}>
            <p style={{fontSize:11,fontWeight:700,color:k.cor,marginBottom:4}}>{k.l}</p>
            <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:28,color:k.cor}}>{k.v}</p>
            <p style={{fontSize:10,color:k.cor,opacity:.7,marginTop:2}}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:14,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Status</label>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todos</option>
            <option value="pendente">⏳ Pendentes</option>
            <option value="concluido">✅ Concluídos</option>
            <option value="cancelado">❌ Cancelados</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Prioridade</label>
          <select value={filtroPrior} onChange={e=>setFiltroPrior(e.target.value)}
            style={{width:"100%",padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
            <option value="">Todas</option>
            {PRIOR.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Buscar</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Devedor ou descrição..."
            style={{padding:"8px 10px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:"Plus Jakarta Sans",minWidth:200}}/>
        </div>
      </div>

      {/* Lista */}
      {ordenados.length===0&&(
        <div style={{textAlign:"center",padding:48,background:"#fff",borderRadius:16,border:"1px solid #f1f5f9"}}>
          <div style={{fontSize:48,marginBottom:12}}>🔔</div>
          <p style={{fontWeight:700,color:"#0f172a",fontSize:15,marginBottom:6}}>Nenhum lembrete encontrado</p>
          <p style={{color:"#94a3b8",fontSize:13}}>Crie um lembrete quando o cliente prometer pagar ou marcar retorno</p>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {ordenados.map(l=>{
          const dev  = devedores.find(d=>String(d.id)===String(l.devedor_id));
          const tipo = tipoMap[l.tipo]||tipoMap.outro;
          const urg  = urgencia(l.data_prometida);
          const concluido = l.status==="concluido";
          const cancelado = l.status==="cancelado";
          const priorCor  = {urgente:"#dc2626",alta:"#c2410c",normal:"#d97706",baixa:"#64748b"}[l.prioridade]||"#64748b";

          return(
            <div key={l.id} style={{
              background:"#fff", borderRadius:14, padding:16,
              border:`1.5px solid ${concluido?"#dcfce7":cancelado?"#f1f5f9":l.data_prometida<hoje?"#fecaca":l.data_prometida===hoje?"#fed7aa":"#e2e8f0"}`,
              opacity:concluido||cancelado?.75:1,
              display:"flex",gap:14,alignItems:"flex-start",
            }}>
              {/* Barra lateral de prioridade */}
              <div style={{width:4,borderRadius:99,background:concluido?"#22c55e":cancelado?"#94a3b8":priorCor,alignSelf:"stretch",flexShrink:0,minHeight:50}}/>

              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
                  <div>
                    {/* Badges */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:tipo.bg,color:tipo.cor}}>{tipo.l}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:urg.bg,color:urg.cor}}>
                        {l.data_prometida<hoje?"⚠️ VENCIDO":l.data_prometida===hoje?"🔥 HOJE":l.hora?`${fmtDate(l.data_prometida)} ${l.hora}`:`📅 ${fmtDate(l.data_prometida)}`} {l.data_prometida>=hoje&&`(${urg.l})`}
                      </span>
                      {l.prioridade==="urgente"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#fee2e2",color:"#dc2626"}}>🔴 URGENTE</span>}
                      {l.prioridade==="alta"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#ffedd5",color:"#c2410c"}}>🟠 ALTA</span>}
                      {concluido&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#dcfce7",color:"#15803d"}}>✅ Concluído</span>}
                      {cancelado&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#f1f5f9",color:"#64748b"}}>❌ Cancelado</span>}
                    </div>
                    {/* Devedor e descrição */}
                    <p style={{fontWeight:800,color:"#0f172a",fontSize:14,marginBottom:2}}>{dev?.nome||"Devedor não encontrado"}</p>
                    <p style={{fontSize:13,color:"#475569"}}>{l.descricao}</p>
                    {l.observacoes&&<p style={{fontSize:11,color:"#94a3b8",marginTop:4,fontStyle:"italic"}}>📝 {l.observacoes}</p>}
                    <p style={{fontSize:10,color:"#94a3b8",marginTop:6}}>Criado por {l.criado_por} em {l.criado_em?new Date(l.criado_em).toLocaleDateString("pt-BR"):"-"}</p>
                  </div>

                  {/* Ações */}
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    {l.status==="pendente"&&(<>
                      {dev?.telefone&&(
                        <a href={`https://wa.me/55${dev.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá ${dev.nome?.split(" ")[0]}, conforme combinado, passando para lembrar do compromisso de ${fmtDate(l.data_prometida)}. ${l.descricao}`)}`}
                          target="_blank" rel="noreferrer"
                          style={{background:"#dcfce7",color:"#16a34a",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                          📱 WA
                        </a>
                      )}
                      <button onClick={()=>concluir(l.id)}
                        style={{background:"#dcfce7",color:"#15803d",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        ✅ Concluir
                      </button>
                      <button onClick={()=>cancelar(l.id)}
                        style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:11}}>
                        ✕
                      </button>
                    </>)}
                    {(concluido||cancelado)&&(
                      <button onClick={()=>reativar(l.id)}
                        style={{background:"#ede9fe",color:"#7c3aed",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        🔄 Reativar
                      </button>
                    )}
                    <button onClick={()=>excluir(l.id)}
                      style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",fontSize:11}}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal novo lembrete */}
      {modal&&(
        <Modal title="🔔 Novo Lembrete de Cobrança" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Tipo */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase"}}>Tipo de Lembrete</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {TIPOS_LEM.map(t=>(
                  <button key={t.v} onClick={()=>F("tipo",t.v)}
                    style={{padding:"9px 12px",border:`1.5px solid ${form.tipo===t.v?t.cor:"#e2e8f0"}`,borderRadius:10,background:form.tipo===t.v?t.bg:"#fff",color:form.tipo===t.v?t.cor:"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"Plus Jakarta Sans",textAlign:"left"}}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Devedor */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Devedor *</label>
              <select value={form.devedor_id} onChange={e=>F("devedor_id",e.target.value)}
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
                <option value="">— Selecione o devedor —</option>
                {devedores.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Descrição *</label>
              <input value={form.descricao} onChange={e=>F("descricao",e.target.value)}
                placeholder="Ex: Cliente prometeu pagar R$ 500 no dia 15/04"
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans"}}/>
            </div>

            {/* Data e hora */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Data Prometida / Agendada *</label>
                <input type="date" value={form.data_prometida} onChange={e=>F("data_prometida",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",border:"1.5px solid #4f46e5",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Hora</label>
                <input type="time" value={form.hora} onChange={e=>F("hora",e.target.value)}
                  style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase"}}>Prioridade</label>
              <div style={{display:"flex",gap:8}}>
                {PRIOR.map(p=>(
                  <button key={p.v} onClick={()=>F("prioridade",p.v)}
                    style={{flex:1,padding:"8px",border:`1.5px solid ${form.prioridade===p.v?"#4f46e5":"#e2e8f0"}`,borderRadius:9,background:form.prioridade===p.v?"#ede9fe":"#fff",color:form.prioridade===p.v?"#4f46e5":"#64748b",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"Plus Jakarta Sans"}}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Observações</label>
              <textarea value={form.observacoes} onChange={e=>F("observacoes",e.target.value)}
                placeholder="Detalhes adicionais sobre a promessa ou acordo verbal..."
                rows={3} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Plus Jakarta Sans",resize:"vertical"}}/>
            </div>

            <div style={{display:"flex",gap:10,paddingTop:4}}>
              <Btn onClick={salvar} color="#4f46e5">🔔 Salvar Lembrete</Btn>
              <Btn onClick={()=>setModal(false)} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

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
      <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:c||"#0f172a"}}>{v}</p>
      {sub&&<p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{sub}</p>}
    </div>
  );

  return (
    <div>
      <h2 style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:22,color:"#0f172a",marginBottom:6}}>Relatórios & Carteira</h2>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid #f1f5f9"}}>
        {[["geral","📊 Geral"],["credor","🏛 Por Credor"],["despesas","💸 Despesas"]].map(([a,l])=>(
          <button key={a} onClick={()=>setAbaRel(a)} style={{padding:"8px 18px",border:"none",background:"none",cursor:"pointer",fontFamily:"Plus Jakarta Sans",fontWeight:700,fontSize:13,color:abaRel===a?"#4f46e5":"#94a3b8",borderBottom:`2px solid ${abaRel===a?"#4f46e5":"transparent"}`,marginBottom:-2}}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Filtrar por Credor</label>
          <select value={credorSel} onChange={e=>setCredorSel(e.target.value)} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:13,outline:"none",fontFamily:"Plus Jakarta Sans"}}>
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
              <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a"}}>Devedores — {devsFiltrados.length} registros</p>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f1f5f9"}}>
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
                  <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:15,color:"#fff"}}>{c.nome}</p>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{c.qtdDevedores} devedor{c.qtdDevedores>1?"es":""} · Taxa de recuperação: <b style={{color:"#a5f3fc"}}>{c.taxa}%</b></p>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Em aberto</p>
                  <p style={{fontFamily:"Space Grotesk",fontWeight:800,fontSize:20,color:"#fff"}}>{fmt(c.aberto)}</p>
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
              <p style={{fontFamily:"Space Grotesk",fontWeight:700,fontSize:14,color:"#0f172a"}}>Despesas por Devedor</p>
              <p style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Valores lançados nas dívidas como despesas operacionais</p>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f1f5f9"}}>
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
            <div style={{padding:"10px 18px",background:"#f1f5f9",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",fontSize:12}}>
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

// ═══════════════════════════════════════════════════════════════
// RÉGUA DE COBRANÇA INTELIGENTE
// ═══════════════════════════════════════════════════════════════
const ETAPAS_PADRAO = [
  { id:1, dias:0,   canal:"whatsapp", titulo:"Boas-vindas",           ativo:true,  categoria:"amigavel",
    mensagem:"Olá, {{nome}}! Identificamos uma pendência no valor de {{valor}} com vencimento em {{vencimento}}. Entre em contato para regularizar. 😊" },
  { id:2, dias:3,   canal:"whatsapp", titulo:"1º Lembrete",           ativo:true,  categoria:"amigavel",
    mensagem:"Olá, {{nome}}! Seu débito de {{valor}} está em aberto há 3 dias. Podemos negociar condições especiais. Responda esta mensagem! 📞" },
  { id:3, dias:7,   canal:"whatsapp", titulo:"2º Lembrete",           ativo:true,  categoria:"moderado",
    mensagem:"{{nome}}, passamos para lembrar que seu débito de {{valor}} não foi regularizado. Evite encargos adicionais — entre em contato hoje! ⚠️" },
  { id:4, dias:15,  canal:"email",    titulo:"Notificação Formal",    ativo:true,  categoria:"moderado",
    mensagem:"Prezado(a) {{nome}},\n\nInformamos que o valor de {{valor}}, vencido em {{vencimento}}, encontra-se em aberto. Solicitamos que regularize sua situação em até 5 dias úteis.\n\nAtenciosamente,\nEquipe de Cobrança MR Cobranças" },
  { id:5, dias:30,  canal:"whatsapp", titulo:"Proposta de Acordo",    ativo:true,  categoria:"moderado",
    mensagem:"{{nome}}, temos uma proposta especial para regularizar seu débito de {{valor}} em condições facilitadas. Clique para conversar com nossa equipe e encontrar a melhor solução! 🤝" },
  { id:6, dias:45,  canal:"whatsapp", titulo:"Aviso de Cobrança",     ativo:true,  categoria:"rigido",
    mensagem:"{{nome}}, seu débito de {{valor}} já acumula {{diasAtraso}} dias sem pagamento. Caso não haja regularização, adotaremos medidas administrativas. Entre em contato URGENTE! 🔴" },
  { id:7, dias:60,  canal:"email",    titulo:"Notificação Extrajudicial", ativo:true, categoria:"rigido",
    mensagem:"NOTIFICAÇÃO EXTRAJUDICIAL\n\nNOTIFICAMOS V.Sa., {{nome}}, da existência de débito no valor de {{valor}}, que permanece sem pagamento há {{diasAtraso}} dias. Concedemos prazo de 72 horas para regularização, sob pena de encaminhamento para protesto e ação judicial.\n\nMR Cobranças — CRM Jurídico" },
  { id:8, dias:90,  canal:"sistema",  titulo:"Ajuizamento",           ativo:true,  categoria:"judicial",
    mensagem:"[SISTEMA] Devedor {{nome}} atingiu 90 dias de inadimplência. Verificar viabilidade de ajuizamento. Valor: {{valor}}. Avaliar custo-benefício da ação judicial." },
];

const CANAL_ICONS = { whatsapp:"📱", email:"📧", sms:"💬", ligacao:"📞", sistema:"⚙️" };
const CAT_CORES   = { amigavel:{cor:"#16a34a",bg:"#dcfce7",l:"Amigável"}, moderado:{cor:"#d97706",bg:"#fef3c7",l:"Moderado"}, rigido:{cor:"#dc2626",bg:"#fee2e2",l:"Rígido"}, judicial:{cor:"#7c3aed",bg:"#ede9fe",l:"Judicial"} };

function Regua({ devedores, credores, user }) {
  const HOJE = new Date().toISOString().slice(0,10);
  const K = { e:"mr_regua_etapas", i:"mr_regua_incluidos", x:"mr_regua_excluidos" };
  const gl = k => { try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch{ return null; } };
  const sl = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} };

  const [etapas,    setEtapas]    = useState(() => { const s=gl(K.e); return Array.isArray(s)&&s.length>0?s:ETAPAS_PADRAO; });
  const [incluidos, setIncluidos] = useState(() => gl(K.i)||[]);
  const [excluidos, setExcluidos] = useState(() => gl(K.x)||[]);
  const [aba,       setAba]       = useState("visao");
  const [filtro,    setFiltro]    = useState("");
  const [expandido, setExpandido] = useState(null);
  const [editando,  setEditando]  = useState(null);
  const [isNova,    setIsNova]    = useState(false);
  const [modalAdd,  setModalAdd]  = useState(false);
  const [buscaAdd,  setBuscaAdd]  = useState("");

  const E  = (k,v) => setEditando(e=>({...e,[k]:v}));
  const se = v => { setEtapas(v);  sl(K.e,v); };
  const si = v => { setIncluidos(v); sl(K.i,v); };
  const sx = v => { setExcluidos(v); sl(K.x,v); };

  function incluirDev(id) {
    const s=String(id);
    si([...new Set([...incluidos.map(String),s])]);
    sx(excluidos.map(String).filter(x=>x!==s));
  }
  function removerDev(id) {
    if(!window.confirm("Remover este devedor da régua?")) return;
    const s=String(id);
    sx([...new Set([...excluidos.map(String),s])]);
    si(incluidos.map(String).filter(x=>x!==s));
  }
  function reincluir(id) { const s=String(id); sx(excluidos.map(String).filter(x=>x!==s)); }

  function salvarEdicao() {
    if(!editando?.titulo?.trim()||!editando?.mensagem?.trim()) return alert("Preencha título e mensagem.");
    if(isNova) se([...etapas,{...editando,id:Date.now()}].sort((a,b)=>a.dias-b.dias));
    else       se(etapas.map(e=>e.id===editando.id?editando:e));
    setEditando(null); setIsNova(false);
  }

  function renderMsg(tpl,dev,dias,valor,dataVenc) {
    const cred=(credores||[]).find(c=>String(c.id)===String(dev.credor_id));
    return (tpl||"")
      .replace(/\{\{nome\}\}/g, (dev.nome||"").split(" ")[0]||"cliente")
      .replace(/\{\{nomeCompleto\}\}/g, dev.nome||"cliente")
      .replace(/\{\{valor\}\}/g, "R$ "+Number(valor||0).toFixed(2).replace(".",","))
      .replace(/\{\{vencimento\}\}/g, fmtDate(dataVenc||""))
      .replace(/\{\{diasAtraso\}\}/g, String(dias||0))
      .replace(/\{\{credor\}\}/g, cred?.nome||"")
      .replace(/\{\{data\}\}/g, new Date().toLocaleDateString("pt-BR"));
  }

  // ── Calcular pendentes ──────────────────────────────────────
  const etapasAtivas = etapas.filter(e=>e.ativo).sort((a,b)=>a.dias-b.dias);
  const incStr = (incluidos||[]).map(String);
  const exclStr= (excluidos||[]).map(String);
  const pendentes = [];

  (devedores||[]).forEach(dev=>{
    try {
      if(!dev?.id) return;
      const st = dev.status||"";
      if(st==="pago_integral"||st==="irrecuperavel") return;
      if(exclStr.includes(String(dev.id))) return;
      const isManual = incStr.includes(String(dev.id));
      const divs = (dev.dividas||[]).filter(d=>!d._nominal&&(d.data_vencimento||d.data_origem));
      const valor = (dev.dividas||[]).reduce((s,d)=>s+(Number(d.valor_total)||0),0);
      if(!divs.length) {
        if(isManual&&etapasAtivas[0]) pendentes.push({dev,dias:0,valor,etapa:etapasAtivas[0],dataVenc:HOJE,urgente:false,manual:true});
        return;
      }
      const prim = [...divs].sort((a,b)=>(a.data_vencimento||a.data_origem||"").localeCompare(b.data_vencimento||b.data_origem||""))[0];
      const dataVenc = prim.data_vencimento||prim.data_origem||"";
      if(!dataVenc) return;
      const dias = Math.max(0,Math.ceil((new Date(HOJE+"T12:00:00")-new Date(dataVenc+"T12:00:00"))/864e5));
      const etAuto = etapasAtivas.find(e=>dias>=e.dias&&dias<e.dias+8);
      const etapa  = etAuto||(isManual?etapasAtivas[0]:null);
      if(etapa&&(dias>0||isManual)) {
        pendentes.push({dev,dias,valor,etapa,dataVenc,urgente:dias>=60,manual:isManual&&!etAuto});
      }
    } catch(e) {}
  });

  const filtrados = pendentes
    .filter(p=>!filtro||(p.dev.nome||"").toLowerCase().includes(filtro.toLowerCase()))
    .sort((a,b)=>b.dias-a.dias);

  // ── Estilos ─────────────────────────────────────────────────
  const card  = {background:"#fff",borderRadius:16,border:"1px solid #e2e8f0",padding:20,boxShadow:"0 1px 6px rgba(0,0,0,.05)"};
  const fam   = "'Plus Jakarta Sans',sans-serif";
  const grot  = "'Space Grotesk',sans-serif";

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:grot,fontWeight:700,fontSize:22,color:"#0f172a",letterSpacing:"-.5px",marginBottom:4}}>📐 Régua de Cobrança</h2>
          <p style={{fontSize:13,color:"#64748b"}}>Régua inteligente de comunicação por etapas de inadimplência</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setModalAdd(true)}
            style={{padding:"9px 16px",borderRadius:10,border:"none",background:"#0891b2",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:fam}}>
            ➕ Incluir Devedor
          </button>
          {[["visao","📊 Visão"],["config","⚙️ Etapas"],["acoes","🎯 Ações"]].map(([id,label])=>(
            <button key={id} onClick={()=>setAba(id)}
              style={{padding:"9px 16px",borderRadius:10,border:`1.5px solid ${aba===id?"#6366f1":"#e2e8f0"}`,background:aba===id?"#6366f1":"#fff",color:aba===id?"#fff":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:fam}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ABA VISÃO ── */}
      {aba==="visao"&&(
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
            {[
              {l:"Pendentes",    v:pendentes.length,                                              c:"#6366f1",bg:"#ede9fe",ic:"🎯"},
              {l:"Urgentes",     v:pendentes.filter(p=>p.urgente).length,                         c:"#dc2626",bg:"#fee2e2",ic:"🔴"},
              {l:"Via WhatsApp", v:pendentes.filter(p=>p.etapa?.canal==="whatsapp").length,       c:"#16a34a",bg:"#dcfce7",ic:"📱"},
              {l:"Em Atraso",    v:pendentes.filter(p=>p.dias>0).length,                          c:"#d97706",bg:"#fef3c7",ic:"⏰"},
            ].map(k=>(
              <div key={k.l} style={{background:k.bg,borderRadius:16,padding:"16px 18px",border:"none",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
                <p style={{fontSize:10,fontWeight:700,color:k.c,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{k.ic} {k.l}</p>
                <p style={{fontFamily:grot,fontWeight:700,fontSize:28,color:k.c}}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{...card,marginBottom:20,overflowX:"auto"}}>
            <p style={{fontFamily:grot,fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:14}}>📅 Linha do Tempo</p>
            <div style={{display:"flex",alignItems:"center",gap:0,minWidth:"max-content"}}>
              {etapasAtivas.map((e,i,arr)=>{
                const cat=CAT_CORES[e.categoria]||CAT_CORES.amigavel;
                return (
                  <div key={e.id} style={{display:"flex",alignItems:"center"}}>
                    <div style={{textAlign:"center",width:90}}>
                      <div style={{width:40,height:40,borderRadius:99,background:cat.bg,border:`2px solid ${cat.cor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,margin:"0 auto 5px"}}>
                        {CANAL_ICONS[e.canal]||"📬"}
                      </div>
                      <p style={{fontSize:10,fontWeight:700,color:cat.cor}}>Dia {e.dias}</p>
                      <p style={{fontSize:9,color:"#64748b",lineHeight:1.2,maxWidth:80}}>{e.titulo}</p>
                    </div>
                    {i<arr.length-1&&<div style={{width:28,height:2,background:`${(CAT_CORES[e.categoria]||CAT_CORES.amigavel).cor}44`,flexShrink:0}}/>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista */}
          <div style={{...card}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <p style={{fontFamily:grot,fontWeight:700,fontSize:14,color:"#0f172a"}}>👥 Devedores na Régua ({filtrados.length})</p>
              <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar devedor..."
                style={{padding:"8px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:12,outline:"none",fontFamily:fam}}/>
            </div>
            {filtrados.length===0&&(
              <p style={{color:"#94a3b8",textAlign:"center",padding:"24px 0",fontSize:13}}>🎉 Nenhum devedor com ação pendente.</p>
            )}
            {filtrados.map(({dev,dias,valor,etapa,dataVenc,urgente,manual})=>{
              const cat = CAT_CORES[etapa?.categoria]||CAT_CORES.amigavel;
              const msg = renderMsg(etapa?.mensagem||"",dev,dias,valor,dataVenc);
              const exp = expandido===dev.id;
              return (
                <div key={dev.id} style={{borderRadius:12,padding:14,marginBottom:10,border:`1.5px solid ${urgente?"#fca5a5":manual?"#a5f3fc":"#e2e8f0"}`,background:urgente?"#fff7f7":manual?"#f0fdff":"#fff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,alignItems:"flex-start"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:5}}>
                        <span style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{dev.nome}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:cat.bg,color:cat.cor}}>{cat.l}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:urgente?"#fee2e2":"#f1f5f9",color:urgente?"#dc2626":"#64748b"}}>
                          {urgente?"🔴":"⏰"} {dias>0?`${dias} dias`:"Incluído"}
                        </span>
                        {manual&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#ecfeff",color:"#0891b2",border:"1px solid #a5f3fc"}}>✋ Manual</span>}
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:"#ede9fe",color:"#6366f1",fontWeight:600}}>{CANAL_ICONS[etapa?.canal]||""} {etapa?.titulo||""}</span>
                      </div>
                      <p style={{fontSize:12,color:"#64748b"}}>
                        Dívida: <b style={{color:"#dc2626"}}>R$ {Number(valor||0).toFixed(2).replace(".",",")}</b>
                        {dataVenc?` · Venc: ${fmtDate(dataVenc)}`:""}
                      </p>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                      {etapa?.canal==="whatsapp"&&dev.telefone&&(
                        <a href={"https://wa.me/55"+(dev.telefone||"").replace(/\D/g,"")+"?text="+encodeURIComponent(msg)}
                          target="_blank" rel="noreferrer"
                          style={{background:"#16a34a",color:"#fff",borderRadius:9,padding:"8px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                          📱 WA
                        </a>
                      )}
                      {etapa?.canal==="email"&&dev.email&&(
                        <a href={"mailto:"+dev.email+"?subject="+encodeURIComponent("Pendência - "+(etapa?.titulo||""))+"&body="+encodeURIComponent(msg)}
                          style={{background:"#2563eb",color:"#fff",borderRadius:9,padding:"8px 12px",fontSize:12,fontWeight:700,textDecoration:"none"}}>
                          📧
                        </a>
                      )}
                      <button onClick={()=>setExpandido(exp?null:dev.id)}
                        style={{background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,padding:"8px 11px",cursor:"pointer",fontSize:12,fontFamily:fam}}>
                        {exp?"▲":"▼"}
                      </button>
                      <button onClick={()=>removerDev(dev.id)}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:9,padding:"8px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        ✕
                      </button>
                    </div>
                  </div>
                  {exp&&(
                    <div style={{marginTop:10,background:"#f8fafc",borderRadius:10,padding:12,border:"1px solid #e2e8f0"}}>
                      <p style={{fontSize:10,fontWeight:700,color:"#6366f1",marginBottom:6,textTransform:"uppercase"}}>Mensagem:</p>
                      <p style={{fontSize:12,color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.7}}>{msg}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Excluídos */}
          {excluidos.length>0&&(
            <div style={{...card,marginTop:12,borderColor:"#fde68a",background:"#fefce8"}}>
              <p style={{fontFamily:grot,fontWeight:700,fontSize:13,color:"#92400e",marginBottom:10}}>🚫 Excluídos ({excluidos.length})</p>
              {(excluidos||[]).map(id=>{
                const dev=(devedores||[]).find(d=>String(d.id)===String(id));
                if(!dev) return null;
                return (
                  <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#fff",borderRadius:9,marginBottom:6,border:"1px solid #fde68a"}}>
                    <p style={{fontWeight:600,color:"#78350f",fontSize:13}}>{dev.nome}</p>
                    <button onClick={()=>reincluir(id)}
                      style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                      🔄 Reincluir
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA CONFIGURAR ── */}
      {aba==="config"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <p style={{fontSize:13,color:"#64748b"}}>{etapasAtivas.length} de {etapas.length} etapas ativas</p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>se(ETAPAS_PADRAO)}
                style={{background:"#fff",border:"1.5px solid #e2e8f0",color:"#64748b",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:fam}}>
                🔄 Restaurar Padrão
              </button>
              <button onClick={()=>{setIsNova(true);setEditando({id:Date.now(),dias:7,canal:"whatsapp",titulo:"",ativo:true,categoria:"amigavel",mensagem:"Olá, {{nome}}! "});}}
                style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:fam}}>
                + Nova Etapa
              </button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[...etapas].sort((a,b)=>a.dias-b.dias).map(e=>{
              const cat=CAT_CORES[e.categoria]||CAT_CORES.amigavel;
              return (
                <div key={e.id} style={{...card,opacity:e.ativo?1:.55}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                    <div style={{display:"flex",gap:12,alignItems:"center",flex:1,minWidth:0}}>
                      <div style={{width:50,height:50,borderRadius:13,background:cat.bg,border:`2px solid ${cat.cor}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontFamily:grot,fontWeight:700,fontSize:14,color:cat.cor,lineHeight:1}}>{e.dias}</span>
                        <span style={{fontSize:8,color:cat.cor,opacity:.8}}>dias</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:3}}>
                          <span style={{fontWeight:700,color:"#0f172a",fontSize:13}}>{e.titulo}</span>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:cat.bg,color:cat.cor}}>{cat.l}</span>
                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"#f1f5f9",color:"#475569"}}>{CANAL_ICONS[e.canal]||""} {e.canal}</span>
                        </div>
                        <p style={{fontSize:11,color:"#94a3b8",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{e.mensagem}</p>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>se(etapas.map(x=>x.id!==e.id?x:{...x,ativo:!x.ativo}))}
                        style={{background:e.ativo?"#dcfce7":"#f1f5f9",color:e.ativo?"#16a34a":"#94a3b8",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:fam}}>
                        {e.ativo?"✓ Ativa":"○ Inativa"}
                      </button>
                      <button onClick={()=>{setIsNova(false);setEditando({...e});}}
                        style={{background:"#ede9fe",color:"#6366f1",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✏️</button>
                      <button onClick={()=>{if(!window.confirm("Excluir?"))return;se(etapas.filter(x=>x.id!==e.id));}}
                        style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:8,padding:"6px 9px",cursor:"pointer",fontSize:11}}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA AÇÕES DO DIA ── */}
      {aba==="acoes"&&(
        <div>
          <div style={{...card,marginBottom:16,background:"linear-gradient(135deg,#ede9fe,#fce7f3)",border:"none"}}>
            <p style={{fontFamily:grot,fontWeight:700,fontSize:14,color:"#6366f1",marginBottom:4}}>🎯 Ações do Dia — {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p>
            <p style={{fontSize:12,color:"#64748b"}}>{filtrados.length} devedor{filtrados.length!==1?"es":""} aguardando</p>
          </div>
          {filtrados.length===0&&(
            <div style={{...card,textAlign:"center",padding:48}}>
              <p style={{fontSize:40,marginBottom:12}}>🎉</p>
              <p style={{fontWeight:700,color:"#16a34a",fontSize:16}}>Nenhuma ação pendente!</p>
            </div>
          )}
          {["judicial","rigido","moderado","amigavel"].map(catKey=>{
            const grupo=filtrados.filter(p=>p.etapa?.categoria===catKey);
            if(!grupo.length) return null;
            const cc=CAT_CORES[catKey];
            return (
              <div key={catKey} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:99,background:cc.cor}}/>
                  <p style={{fontWeight:700,color:cc.cor,fontSize:13}}>{cc.l} — {grupo.length}</p>
                </div>
                {grupo.map(({dev,dias,valor,etapa,dataVenc})=>{
                  const msg=renderMsg(etapa?.mensagem||"",dev,dias,valor,dataVenc);
                  return (
                    <div key={dev.id} style={{...card,marginBottom:8,borderLeft:`4px solid ${cc.cor}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                        <div>
                          <p style={{fontWeight:700,color:"#0f172a",fontSize:13,marginBottom:2}}>{dev.nome}</p>
                          <p style={{fontSize:11,color:"#64748b"}}>R$ {Number(valor||0).toFixed(2).replace(".",",")} · {dias}d · {CANAL_ICONS[etapa?.canal]||""} {etapa?.titulo||""}</p>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {etapa?.canal==="whatsapp"&&dev.telefone&&(
                            <a href={"https://wa.me/55"+(dev.telefone||"").replace(/\D/g,"")+"?text="+encodeURIComponent(msg)}
                              target="_blank" rel="noreferrer"
                              style={{background:"#16a34a",color:"#fff",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>📱 WA</a>
                          )}
                          {etapa?.canal==="email"&&dev.email&&(
                            <a href={"mailto:"+dev.email+"?subject="+encodeURIComponent("Pendência - "+(etapa?.titulo||""))+"&body="+encodeURIComponent(msg)}
                              style={{background:"#2563eb",color:"#fff",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,textDecoration:"none"}}>📧</a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal incluir devedor */}
      {modalAdd&&(
        <Modal title="➕ Incluir Devedor na Régua" onClose={()=>{setModalAdd(false);setBuscaAdd("");}}>
          <div>
            <p style={{fontSize:13,color:"#64748b",marginBottom:12}}>Inclua devedores manualmente na régua de cobrança.</p>
            <input value={buscaAdd} onChange={e=>setBuscaAdd(e.target.value)} placeholder="Buscar por nome..." autoFocus
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:fam,marginBottom:12}}/>
            {incStr.length>0&&(
              <div style={{marginBottom:12}}>
                <p style={{fontSize:11,fontWeight:700,color:"#0891b2",textTransform:"uppercase",marginBottom:6}}>✅ Incluídos</p>
                {incStr.map(id=>{
                  const dev=(devedores||[]).find(d=>String(d.id)===id);
                  if(!dev) return null;
                  return (
                    <div key={id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#ecfeff",borderRadius:9,marginBottom:5,border:"1px solid #a5f3fc"}}>
                      <p style={{fontWeight:600,color:"#0e7490",fontSize:13}}>{dev.nome}</p>
                      <button onClick={()=>removerDev(dev.id)} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕ Remover</button>
                    </div>
                  );
                })}
              </div>
            )}
            <p style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",marginBottom:8}}>Disponíveis</p>
            <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
              {(devedores||[])
                .filter(d=>!["pago_integral","irrecuperavel"].includes(d.status||""))
                .filter(d=>!incStr.includes(String(d.id)))
                .filter(d=>!buscaAdd||(d.nome||"").toLowerCase().includes(buscaAdd.toLowerCase()))
                .map(dev=>{
                  const jaAuto=pendentes.some(p=>String(p.dev.id)===String(dev.id)&&!p.manual);
                  return (
                    <div key={dev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:jaAuto?"#f8fafc":"#fff",borderRadius:9,border:"1px solid #f1f5f9"}}>
                      <div>
                        <p style={{fontWeight:600,color:"#0f172a",fontSize:13}}>{dev.nome}
                          {jaAuto&&<span style={{marginLeft:6,fontSize:9,background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:99,fontWeight:700}}>NA RÉGUA</span>}
                        </p>
                        <p style={{fontSize:11,color:"#64748b"}}>{dev.status}</p>
                      </div>
                      {!jaAuto&&(
                        <button onClick={()=>incluirDev(dev.id)}
                          style={{background:"#0891b2",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:fam}}>
                          + Incluir
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
            <div style={{marginTop:14}}>
              <Btn onClick={()=>{setModalAdd(false);setBuscaAdd("");}} color="#6366f1">✅ Pronto</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal editar etapa */}
      {editando&&(
        <Modal title={isNova?"Nova Etapa":"Editar Etapa"} onClose={()=>{setEditando(null);setIsNova(false);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Título *</label>
                <input value={editando.titulo||""} onChange={e=>E("titulo",e.target.value)} placeholder="Ex: 1º Lembrete"
                  style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:fam}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Disparar no dia (de atraso)</label>
                <input type="number" min="0" value={editando.dias||0} onChange={e=>E("dias",parseInt(e.target.value)||0)}
                  style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Canal</label>
                <select value={editando.canal||"whatsapp"} onChange={e=>E("canal",e.target.value)}
                  style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:fam}}>
                  {[["whatsapp","📱 WhatsApp"],["email","📧 E-mail"],["sms","💬 SMS"],["ligacao","📞 Ligação"],["sistema","⚙️ Sistema"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Tom</label>
                <select value={editando.categoria||"amigavel"} onChange={e=>E("categoria",e.target.value)}
                  style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",fontFamily:fam}}>
                  {Object.entries(CAT_CORES).map(([v,{l}])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Mensagem *</label>
              <p style={{fontSize:10,color:"#94a3b8",marginBottom:6}}>Use: {"{{nome}}"} {"{{valor}}"} {"{{vencimento}}"} {"{{diasAtraso}}"}</p>
              <textarea value={editando.mensagem||""} onChange={e=>E("mensagem",e.target.value)} rows={5}
                style={{width:"100%",padding:"10px 11px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:fam,resize:"vertical",lineHeight:1.6}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={salvarEdicao} color="#6366f1">💾 Salvar</Btn>
              <Btn onClick={()=>{setEditando(null);setIsNova(false);}} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// GESTÃO DE USUÁRIOS (só para admin: advairvieira@gmail.com)
// ═══════════════════════════════════════════════════════════════
const ADMIN_EMAIL   = "advairvieira@gmail.com";
const ADMIN_SENHA   = "010789wi";
const USERS_KEY     = "mr_users_extra";

function GestaoUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({nome:"",email:"",senha:"",oab:"",role:"advogado"});
  const F = (k,v) => setForm(f=>({...f,[k]:v}));
  const [showSenhas, setShowSenhas] = useState({});

  // Carregar usuários do Supabase
  async function carregarUsuarios() {
    setCarregando(true);
    try {
      const res = await dbGet("usuarios_sistema","order=criado_em.asc");
      setUsuarios(Array.isArray(res)?res:[]);
      // Sincronizar no localStorage para o login funcionar offline/rápido
      localStorage.setItem(USERS_KEY, JSON.stringify(Array.isArray(res)?res:[]));
    } catch(e) {
      // Fallback localStorage
      try{ setUsuarios(JSON.parse(localStorage.getItem(USERS_KEY)||"[]")); }catch{}
    }
    setCarregando(false);
  }
  useEffect(()=>{ carregarUsuarios(); },[]);

  async function salvar() {
    if(!form.nome.trim()||!form.email.trim()||!form.senha.trim()) return alert("Preencha nome, e-mail e senha.");
    if(form.senha.length<6) return alert("Senha deve ter no mínimo 6 caracteres.");
    const existe = [...USERS,...usuarios].find(u=>u.email===form.email);
    if(existe) return alert("Já existe um usuário com este e-mail.");
    const payload = { nome:form.nome, email:form.email, senha:form.senha, oab:form.oab||null, role:form.role, criado_por:user.nome, criado_em:new Date().toISOString() };
    try {
      const res = await dbInsert("usuarios_sistema", payload);
      const novo = Array.isArray(res)?res[0]:res;
      const novos = [...usuarios, novo||{...payload,id:Date.now()}];
      setUsuarios(novos);
      localStorage.setItem(USERS_KEY, JSON.stringify(novos));
      setModal(false);
      setForm({nome:"",email:"",senha:"",oab:"",role:"advogado"});
      alert(`✅ Usuário "${form.nome}" cadastrado! Ele já pode fazer login em qualquer dispositivo.`);
    } catch(e) {
      // Fallback local se tabela não existir ainda
      const novo = {...payload, id:Date.now()};
      const novos = [...usuarios, novo];
      setUsuarios(novos);
      localStorage.setItem(USERS_KEY, JSON.stringify(novos));
      setModal(false);
      setForm({nome:"",email:"",senha:"",oab:"",role:"advogado"});
      alert(`✅ Usuário "${form.nome}" cadastrado localmente!

⚠️ Para funcionar em outros dispositivos, execute o SQL_USUARIOS.sql no Supabase.`);
    }
  }

  async function excluir(id) {
    if(!window.confirm("Excluir este usuário? Ele perderá o acesso imediatamente.")) return;
    try { await dbDelete("usuarios_sistema", id); } catch(e){}
    const novos = usuarios.filter(u=>u.id!==id);
    setUsuarios(novos);
    localStorage.setItem(USERS_KEY, JSON.stringify(novos));
  }

  const todosUsers = [
    ...USERS.map(u=>({...u,_sistema:true})),
    ...usuarios,
  ];

  const roleCor = { admin:["#7c3aed","#ede9fe"], advogado:["#2563eb","#dbeafe"], assistente:["#d97706","#fef3c7"], estagiario:["#64748b","#f1f5f9"] };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:22,color:"#0f172a",letterSpacing:"-.5px"}}>👥 Gestão de Usuários</h2>
          <p style={{fontSize:13,color:"#64748b",marginTop:2}}>Controle de acesso ao sistema — apenas você pode gerenciar usuários</p>
        </div>
        <button onClick={()=>setModal(true)}
          style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",gap:8}}>
          + Novo Usuário
        </button>
      </div>

      {/* Aviso admin */}
      <div style={{background:"linear-gradient(135deg,#ede9fe,#fce7f3)",borderRadius:14,padding:"14px 18px",marginBottom:20,border:"1px solid #ddd6fe",display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:24}}>🔐</span>
        <div>
          <p style={{fontWeight:700,color:"#6366f1",fontSize:13}}>Área Restrita — Administrador</p>
          <p style={{fontSize:12,color:"#64748b",marginTop:2}}>Esta seção só aparece para você. Os usuários cadastrados aqui poderão acessar o sistema com os dados informados.</p>
        </div>
      </div>

      {/* Lista de usuários */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {todosUsers.map(u=>{
          const [cor,bg] = roleCor[u.role]||roleCor.assistente;
          return(
            <div key={u.id} style={{background:"#fff",borderRadius:14,padding:"16px 20px",border:"1.5px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
              <div style={{display:"flex",gap:14,alignItems:"center"}}>
                <div style={{width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${cor},${cor}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",flexShrink:0}}>
                  {u.nome[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <p style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{u.nome}</p>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:bg,color:cor}}>{u.role}</span>
                    {u._sistema&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:99,background:"#f1f5f9",color:"#94a3b8",fontWeight:600}}>SISTEMA</span>}
                  </div>
                  <p style={{fontSize:12,color:"#64748b"}}>{u.email}{u.oab?` · ${u.oab}`:""}</p>
                  {!u._sistema&&(
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
                      <span style={{fontSize:11,color:"#94a3b8"}}>Senha:</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#475569",letterSpacing:showSenhas[u.id]?".05em":"2px"}}>
                        {showSenhas[u.id]?u.senha:"••••••••"}
                      </span>
                      <button onClick={()=>setShowSenhas(s=>({...s,[u.id]:!s[u.id]}))}
                        style={{fontSize:10,color:"#6366f1",background:"none",border:"none",cursor:"pointer",padding:0}}>
                        {showSenhas[u.id]?"ocultar":"mostrar"}
                      </button>
                    </div>
                  )}
                  {u.criado_em&&<p style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Cadastrado em {new Date(u.criado_em).toLocaleDateString("pt-BR")} por {u.criado_por}</p>}
                </div>
              </div>
              {!u._sistema&&(
                <button onClick={()=>excluir(u.id)}
                  style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                  🗑 Excluir
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal novo usuário */}
      {modal&&(
        <Modal title="➕ Novo Usuário" onClose={()=>setModal(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fef3c7",borderRadius:10,padding:"10px 14px",border:"1px solid #fde68a"}}>
              <p style={{fontSize:12,color:"#92400e",fontWeight:600}}>⚠️ A senha será visível para você gerenciar. O usuário deve alterá-la após o primeiro acesso.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Nome Completo *</label>
                <input value={form.nome} onChange={e=>F("nome",e.target.value)} placeholder="Ex: João da Silva"
                  style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>E-mail *</label>
                <input type="email" value={form.email} onChange={e=>F("email",e.target.value)} placeholder="usuario@email.com"
                  style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>Senha *</label>
                <input type="text" value={form.senha} onChange={e=>F("senha",e.target.value)} placeholder="Mínimo 6 caracteres"
                  style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"monospace"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:4,textTransform:"uppercase"}}>OAB (opcional)</label>
                <input value={form.oab} onChange={e=>F("oab",e.target.value)} placeholder="OAB/GO 00.000"
                  style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:9,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase"}}>Perfil de Acesso</label>
                <div style={{display:"flex",gap:8}}>
                  {[["advogado","Advogado"],["assistente","Assistente"],["estagiario","Estagiário"]].map(([v,l])=>(
                    <button key={v} onClick={()=>F("role",v)}
                      style={{flex:1,padding:"9px",border:`1.5px solid ${form.role===v?"#6366f1":"#e2e8f0"}`,borderRadius:9,background:form.role===v?"#ede9fe":"#fff",color:form.role===v?"#6366f1":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={salvar} color="#6366f1">✅ Criar Usuário</Btn>
              <Btn onClick={()=>setModal(false)} outline color="#64748b">Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser]             = useState(null);
  const [tab, setTab]               = useState("dashboard");
  const [tabKey, setTabKey]         = useState(0); // incrementa para forçar reset do módulo atual
  const [sideOpen, setSideOpen]     = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false); // controla se tem modal aberto em qualquer módulo

  const [devedores,  setDevedores]  = useState([]);
  const [credores,   setCredores]   = useState([]);
  const [processos,  setProcessos]  = useState([]);
  const [andamentos, setAndamentos] = useState([]);
  const [regua,      setRegua]      = useState([]);
  const [lembretesList, setLembretesList] = useState([]); // global para o alerta do Dashboard

  const carregarTudo = useCallback(async (silencioso=false) => {
    if(!silencioso) setCarregando(true);
    try {
      const [devs, creds, procs, ands, reg, lems] = await Promise.all([
        dbGet("devedores"), dbGet("credores"), dbGet("processos"), dbGet("andamentos"), dbGet("regua"),
        dbGet("lembretes","order=data_prometida.asc"),
      ]);
      setLembretesList(Array.isArray(lems)?lems:[]);
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

  // Listener para navegação via alerta do dashboard
  // detail pode ser string (tab) ou objeto {tab, filtroStatus}
  useEffect(() => {
    const handler = e => {
      if(typeof e.detail === "object" && e.detail.tab) {
        setTab(e.detail.tab);
        setTimeout(()=>window.dispatchEvent(new CustomEvent("mr_filtro", {detail: e.detail})), 50);
      } else {
        setTab(e.detail);
      }
      // Scroll para o topo
      setTimeout(()=>{ const main = document.querySelector('.mr-main'); if(main) main.scrollTop=0; }, 30);
    };
    window.addEventListener("mr_goto", handler);
    return () => window.removeEventListener("mr_goto", handler);
  }, []);

  // Polling a cada 60s — mas PAUSA se houver modal aberto
  useEffect(() => {
    if(!user) return;
    const iv = setInterval(() => {
      if(!modalAberto) carregarTudo(true); // silencioso = não mostra spinner
    }, 60000);
    return () => clearInterval(iv);
  }, [user, carregarTudo, modalAberto]);

  if(!user) return <Login onLogin={setUser}/>;

  const isAdmin = user?.email===ADMIN_EMAIL||user?.role==="admin";
  const NAV = [
    { id:"dashboard",  label:"Dashboard",   icon: I.dash,   color:"#6366f1", bg:"rgba(99,102,241,.18)"  },
    { id:"devedores",  label:"Devedores",   icon: I.dev,    color:"#ec4899", bg:"rgba(236,72,153,.18)"  },
    { id:"credores",   label:"Credores",    icon: I.cred,   color:"#14b8a6", bg:"rgba(20,184,166,.18)"  },
    { id:"calculadora",label:"Calculadora", icon: I.calc,   color:"#f59e0b", bg:"rgba(245,158,11,.18)"  },
    { id:"relatorios", label:"Relatórios",  icon: I.rel,    color:"#10b981", bg:"rgba(16,185,129,.18)"  },
    { id:"lembretes",  label:"Lembretes",   icon: I.bell,   color:"#ef4444", bg:"rgba(239,68,68,.18)"   },
    { id:"regua",      label:"Régua",       icon: I.regua2, color:"#0891b2", bg:"rgba(8,145,178,.18)"   },
    ...(isAdmin?[{ id:"usuarios", label:"Usuários", icon: I.users2, color:"#7c3aed", bg:"rgba(124,58,237,.18)" }]:[]),
  ];

  function renderPage(t) {
    switch(t) {
      case "dashboard":   return <Dashboard   devedores={devedores} processos={processos} andamentos={andamentos} user={user} lembretes={lembretesList}/>;
      case "devedores":   return <Devedores   devedores={devedores} setDevedores={setDevedores} credores={credores} onModalChange={setModalAberto} user={user} processos={processos} setTab={setTab}/>;
      case "credores":    return <Credores    credores={credores} setCredores={setCredores}/>;
      case "calculadora": return <Calculadora devedores={devedores}/>;
      case "relatorios":  return <Relatorios  devedores={devedores} processos={processos} andamentos={andamentos} credores={credores}/>;
      case "lembretes":   return <Lembretes   devedores={devedores} credores={credores} user={user}/>;
      case "regua":       return <Regua devedores={devedores} credores={credores} user={user}/>;
      case "usuarios":    return isAdmin ? <GestaoUsuarios user={user}/> : null;
      default:            return null;
    }
  }

  return (
    <div style={{ minHeight:"100vh",display:"flex",fontFamily:"'Plus Jakarta Sans',sans-serif",background:"#f1f5f9" }}>
      <FontLink/>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
        .nav-btn{transition:all .18s cubic-bezier(.4,0,.2,1)!important}
        .nav-btn:hover:not(.active){background:rgba(255,255,255,.07)!important;color:rgba(255,255,255,.85)!important}
        .mr-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
        .mr-btn:active{transform:scale(.97)}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
        .page-content{animation:fadeInUp .2s ease}
        .sync-dot{animation:pulse2 1.2s infinite}
        .mr-aside{transform:translateX(0)}
        .mr-main{margin-left:248px}

        /* ── MOBILE ── */
        @media(max-width:768px){
          .mr-aside{transform:translateX(-100%)!important;z-index:50!important}
          .mr-aside.open{transform:translateX(0)!important;animation:slideInLeft .22s ease}
          .mr-main{margin-left:0!important;padding-bottom:72px!important}
          .mr-header-date{display:none!important}
          .mr-bottomnav{display:flex!important}
          .mr-page{padding:16px!important}
        }
        @media(min-width:769px){
          .mr-bottomnav{display:none!important}
        }

        /* Bottom nav mobile */
        .mr-bottomnav{
          position:fixed;bottom:0;left:0;right:0;
          background:rgba(255,255,255,.95);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border-top:1px solid #e2e8f0;
          height:66px;z-index:40;
          align-items:center;justify-content:space-around;
          box-shadow:0 -4px 20px rgba(0,0,0,.08);
          padding-bottom:env(safe-area-inset-bottom);
        }
        .mr-bottomnav button{
          display:flex;flex-direction:column;align-items:center;gap:3px;
          background:none;border:none;cursor:pointer;padding:6px 8px;
          border-radius:12px;transition:all .15s;flex:1;max-width:70px;
          color:#94a3b8;font-family:'Plus Jakarta Sans',sans-serif;font-size:9px;font-weight:600;
        }
        .mr-bottomnav button.active{color:#6366f1}
        .mr-bottomnav button.active .bn-icon{background:#ede9fe;transform:scale(1.1)}
        .bn-icon{width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;transition:all .15s;background:transparent}

        /* Touch improvements */
        button{-webkit-appearance:none;touch-action:manipulation}
        input,select,textarea{font-size:16px!important} /* Previne zoom no iOS */

        /* Cards responsivos */
        @media(max-width:640px){
          .mr-grid-4{grid-template-columns:1fr 1fr!important}
          .mr-grid-2{grid-template-columns:1fr!important}
          .mr-kpi-v{font-size:20px!important}
        }
      `}</style>

      {sideOpen && <div onClick={()=>setSideOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(15,12,41,.55)",zIndex:30,backdropFilter:"blur(3px)" }}/>}

      {/* ── SIDEBAR ─── */}
      <aside className={`mr-aside${sideOpen?" open":""}`} style={{ position:"fixed",top:0,left:0,bottom:0,width:248,background:"linear-gradient(180deg,#100d2e 0%,#17103d 60%,#0d0f1d 100%)",display:"flex",flexDirection:"column",zIndex:40,transition:"transform .25s cubic-bezier(.4,0,.2,1)",borderRight:"1px solid rgba(255,255,255,.06)",boxShadow:"4px 0 24px rgba(0,0,0,.25)" }}>
        
        {/* Logo */}
        <div style={{ padding:"22px 18px 16px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(99,102,241,.55)",flexShrink:0 }}>
              <span style={{ color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:17,letterSpacing:"-1px" }}>MR</span>
            </div>
            <div>
              <p style={{ color:"#fff",fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:15,lineHeight:1.1,letterSpacing:"-.4px" }}>MR Cobranças</p>
              <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:4 }}>
                <div style={{ width:5,height:5,borderRadius:99,background:"#4ade80" }}/>
                <p style={{ color:"rgba(255,255,255,.35)",fontSize:9,letterSpacing:".6px",textTransform:"uppercase" }}>CRM Jurídico</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"14px 10px",display:"flex",flexDirection:"column",gap:1,overflowY:"auto",overflowX:"hidden" }}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ if(tab===n.id){ setTabKey(k=>k+1); } else { setTab(n.id); } setSideOpen(false); setTimeout(()=>{ const main=document.querySelector('.mr-main'); if(main)main.scrollTop=0; },30); }}
              className={`nav-btn${tab===n.id?" active":""}`}
              style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 12px",borderRadius:13,border:"none",cursor:"pointer",textAlign:"left",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,background:tab===n.id?"rgba(255,255,255,.12)":"transparent",color:tab===n.id?"#fff":"rgba(255,255,255,.5)",width:"100%",position:"relative",outline:"none" }}>
              {/* Ícone com fundo colorido */}
              <div style={{ width:34,height:34,borderRadius:10,background:tab===n.id?n.color:n.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",color:tab===n.id?"#fff":n.color,boxShadow:tab===n.id?`0 4px 12px ${n.color}60`:"none" }}>
                {n.icon}
              </div>
              <span style={{ flex:1,letterSpacing:"-.1px" }}>{n.label}</span>
              {tab===n.id&&<div style={{ width:3,height:20,background:n.color,borderRadius:"3px 0 0 3px",position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",boxShadow:`0 0 8px ${n.color}` }}/>}
            </button>
          ))}
        </nav>

        {/* Usuário */}
        <div style={{ padding:"12px 10px 16px",borderTop:"1px solid rgba(255,255,255,.05)" }}>
          <div style={{ background:"rgba(255,255,255,.04)",borderRadius:14,padding:"11px 12px",border:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
              <div style={{ width:36,height:36,borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'Space Grotesk',sans-serif" }}>{user.nome[0]}</div>
              <div style={{ minWidth:0 }}>
                <p style={{ color:"#f1f5f9",fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.nome.split(" ")[0]}</p>
                <p style={{ color:"rgba(255,255,255,.28)",fontSize:10,marginTop:1 }}>{user.oab}</p>
              </div>
            </div>
            <div style={{ display:"flex",gap:4 }}>
              <button onClick={carregarTudo} title="Atualizar" style={{ color:"rgba(255,255,255,.3)",background:"rgba(255,255,255,.06)",border:"none",cursor:"pointer",fontSize:13,padding:"6px 7px",borderRadius:9,transition:"all .15s",lineHeight:1 }}
                onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,.12)"}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";e.currentTarget.style.background="rgba(255,255,255,.06)"}}>🔄</button>
              <button onClick={()=>setUser(null)} title="Sair" style={{ color:"rgba(255,255,255,.3)",background:"rgba(255,255,255,.06)",border:"none",cursor:"pointer",padding:"6px 7px",borderRadius:9,display:"flex",alignItems:"center",transition:"all .15s" }}
                onMouseEnter={e=>{e.currentTarget.style.color="#fca5a5";e.currentTarget.style.background="rgba(220,38,38,.15)"}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";e.currentTarget.style.background="rgba(255,255,255,.06)"}}>{I.logout}</button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ─── */}
      <main className="mr-main" style={{ flex:1,marginLeft:248,display:"flex",flexDirection:"column",minWidth:0 }}>
        
        {/* Header */}
        <header style={{ background:"rgba(255,255,255,.9)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderBottom:"1px solid #e2e8f0",padding:"0 28px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:20,height:60,boxShadow:"0 1px 12px rgba(0,0,0,.07)" }}>
          <button onClick={()=>setSideOpen(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex",padding:6,borderRadius:9,transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#f1f5f9";e.currentTarget.style.color="#374151"}} onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#64748b"}}>{I.menu}</button>
          
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:11,color:"#94a3b8",fontWeight:500 }}>MR</span>
            <span style={{ color:"#d1d5db",fontSize:13 }}>›</span>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:16,color:"#0f172a",letterSpacing:"-.4px" }}>{NAV.find(n=>n.id===tab)?.label}</span>
          </div>

          {carregando && (
            <div style={{ display:"flex",alignItems:"center",gap:7,background:"#ede9fe",borderRadius:99,padding:"4px 12px",border:"1px solid #ddd6fe" }}>
              <div className="sync-dot" style={{ width:7,height:7,borderRadius:99,background:"#6366f1" }}/>
              <span style={{ fontSize:11,color:"#6366f1",fontWeight:700 }}>Sincronizando</span>
            </div>
          )}

          <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
            <p className="mr-header-date" style={{ fontSize:12,color:"#94a3b8",fontWeight:500 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p>
            {lembretesList.filter(l=>l.status==="pendente"&&l.data_prometida<=new Date().toISOString().slice(0,10)).length>0&&(
              <button onClick={()=>setTab("lembretes")} style={{ position:"relative",background:"linear-gradient(135deg,#fef2f2,#fee2e2)",border:"1px solid #fecaca",borderRadius:10,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .15s",boxShadow:"0 1px 4px rgba(220,38,38,.15)" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(220,38,38,.25)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(220,38,38,.15)"}>
                <span style={{ fontSize:15 }}>🔔</span>
                <span style={{ fontSize:12,color:"#dc2626",fontWeight:800 }}>{lembretesList.filter(l=>l.status==="pendente"&&l.data_prometida<=new Date().toISOString().slice(0,10)).length}</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="mr-page" style={{ flex:1,padding:"26px 30px",overflowY:"auto" }}>
          {carregando && devedores.length===0 ? (
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:16 }}>
              <div style={{ width:60,height:60,borderRadius:20,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 8px 32px rgba(99,102,241,.4)" }}>⏳</div>
              <p style={{ color:"#475569",fontSize:15,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>Carregando dados...</p>
              <p style={{ color:"#94a3b8",fontSize:13 }}>Conectando ao Supabase</p>
            </div>
          ) : <div key={`${tab}-${tabKey}`} className="page-content">{renderPage(tab)}</div>}
        </div>
      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="mr-bottomnav">
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>{ if(tab===n.id){ setTabKey(k=>k+1); } else { setTab(n.id); } setSideOpen(false); setTimeout(()=>{ const main=document.querySelector('.mr-main'); if(main)main.scrollTop=0; },30); }}
            className={tab===n.id?"active":""}>
            <div className="bn-icon" style={{ color:tab===n.id?n.color:"#94a3b8" }}>
              {n.icon}
            </div>
            <span style={{ fontSize:9,fontWeight:tab===n.id?700:500,color:tab===n.id?n.color:"#94a3b8",letterSpacing:"-.2px" }}>
              {n.label.length>8?n.label.slice(0,8)+"…":n.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
