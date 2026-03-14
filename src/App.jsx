import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import ResearchAgent from "./ResearchAgent"

const STATUS_CONFIG = {
  identified:   { label: "Identifiziert",  color: "#888" },
  researching:  { label: "Research",       color: "#6366f1" },
  relevant:     { label: "Relevant",       color: "#0ea5e9" },
  outreach:     { label: "Outreach aktiv", color: "#f59e0b" },
  opportunity:  { label: "Opportunity",    color: "#10b981" },
  disqualified: { label: "Disqualifiziert",color: "#ef4444" },
}

const ACTIVITY_ICONS = {
  status_change:     "◎",
  note_added:        "✎",
  email_sent:        "✉",
  call_done:         "☎",
  linkedin_message:  "🔗",
  meeting_scheduled: "📅",
  meeting_done:      "✓",
  task_created:      "□",
}

const s = (extra = {}) => ({ fontFamily: "system-ui, sans-serif", color: "#1a202c", ...extra })

const Badge = ({ status }) => {
  const c = STATUS_CONFIG[status]
  return <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:500, background:c.color+"22", color:c.color, border:`1px solid ${c.color}44` }}>{c.label}</span>
}

const inp = (placeholder, val, setter, textarea) => {
  const style = { width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#1a202c", fontSize:13, outline:"none", boxSizing:"border-box", resize:textarea?"vertical":undefined, minHeight:textarea?72:undefined, fontFamily:"inherit" }
  return textarea
    ? <textarea style={style} placeholder={placeholder} value={val} onChange={e=>setter(e.target.value)}/>
    : <input style={style} placeholder={placeholder} value={val} onChange={e=>setter(e.target.value)}/>
}

const btn = (label, onClick, variant="primary") => (
  <button onClick={onClick} style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #e2e8f0", background:variant==="primary"?"#6366f1":"transparent", color:variant==="primary"?"#fff":"#4a5568", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
)

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

  const login = async () => {
    setLoading(true); setMsg("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    setLoading(false)
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f7fafc" }}>
      <div style={{ background:"#fff", padding:32, borderRadius:12, border:"1px solid #e2e8f0", width:340 }}>
        <div style={{ fontSize:20, fontWeight:600, marginBottom:4 }}>Cold Outreach</div>
        <div style={{ fontSize:12, color:"#718096", marginBottom:24 }}>55BirchStreet · Anmelden</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {inp("E-Mail", email, setEmail)}
          <input style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#1a202c", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} type="password" placeholder="Passwort" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} />
          {msg && <div style={{ fontSize:12, color:"#ef4444" }}>{msg}</div>}
          {btn(loading?"Anmelden…":"Anmelden", login)}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState("list")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [newCompany, setNewCompany] = useState({ name:"", industry:"", website:"", description:"", notes:"" })
  const [newContact, setNewContact] = useState({ first_name:"", last_name:"", position:"", linkedin_url:"", email:"", phone:"" })
  const [newContactPoint, setNewContactPoint] = useState("")
  const [contactPoints, setContactPoints] = useState([])
  const [newLink, setNewLink] = useState("")
  const [newActivity, setNewActivity] = useState({ activity_type:"note_added", description:"" })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadCompanies() }, [session])

  const loadCompanies = async () => {
    const { data: cos } = await supabase.from("companies").select("*").order("created_at", { ascending: false })
    if (!cos) return
    const { data: cts } = await supabase.from("contacts").select("*, contact_points(*)")
    const { data: acts } = await supabase.from("pipeline_activities").select("*").order("created_at", { ascending: false })
    setCompanies(cos.map(c => ({
      ...c,
      contacts: (cts||[]).filter(ct => ct.company_id === c.id),
      activities: (acts||[]).filter(a => a.company_id === c.id),
    })))
  }

  const company = selected ? companies.find(c => c.id === selected) : null
  const filtered = statusFilter === "all" ? companies : companies.filter(c => c.status === statusFilter)

  const saveCompany = async () => {
    const { data, error } = await supabase.from("companies").insert([{ ...newCompany, status:"identified", created_by: session.user.id }]).select().single()
    if (!error && data) {
      setCompanies(prev => [{ ...data, contacts:[], activities:[] }, ...prev])
      setNewCompany({ name:"", industry:"", website:"", description:"", notes:"" })
      setView("list")
    }
  }

  const saveContact = async () => {
    const { data: ct } = await supabase.from("contacts").insert([{ ...newContact, company_id: selected }]).select().single()
    if (ct) {
      const cps = contactPoints.map(n => ({ contact_id: ct.id, internal_name: n }))
      if (cps.length) await supabase.from("contact_points").insert(cps)
      await loadCompanies()
      setNewContact({ first_name:"", last_name:"", position:"", linkedin_url:"", email:"", phone:"" })
      setContactPoints([])
      setView("detail")
    }
  }

  const addLink = async () => {
    if (!newLink.trim()) return
    const c = companies.find(c => c.id === selected)
    const links = [...(c.research_links||[]), newLink.trim()]
    await supabase.from("companies").update({ research_links: links }).eq("id", selected)
    setCompanies(prev => prev.map(c => c.id === selected ? { ...c, research_links: links } : c))
    setNewLink("")
  }

  const addActivity = async () => {
    if (!newActivity.description.trim()) return
    const { data: act } = await supabase.from("pipeline_activities").insert([{ ...newActivity, company_id: selected, created_by: session.user.id }]).select().single()
    if (act) {
      setCompanies(prev => prev.map(c => c.id === selected ? { ...c, activities: [act, ...c.activities] } : c))
      setNewActivity({ activity_type:"note_added", description:"" })
    }
  }

  const updateStatus = async (companyId, newStatus) => {
    await supabase.from("companies").update({ status: newStatus }).eq("id", companyId)
    const { data: act } = await supabase.from("pipeline_activities").insert([{ activity_type:"status_change", description:`Status → ${STATUS_CONFIG[newStatus].label}`, company_id: companyId, created_by: session.user.id }]).select().single()
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus, activities: act ? [act, ...c.activities] : c.activities } : c))
  }

  const handleResearchUpdate = (updates) => {
    setCompanies(prev => prev.map(c => c.id === selected ? { ...c, ...updates } : c))
  }

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", color:"#718096", fontSize:14 }}>Laden…</div>
  if (!session) return <Login />

  // ── LIST ──
  if (view === "list") return (
    <div style={s({ padding:20, maxWidth:720, margin:"0 auto" })}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:600 }}>Cold Outreach Pipeline</div>
          <div style={{ fontSize:12, color:"#718096", marginTop:2 }}>55BirchStreet · {companies.length} Targets · {session.user.email}</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {btn("+ Unternehmen", () => setView("new_company"))}
          <button onClick={() => supabase.auth.signOut()} style={{ padding:"7px 14px", borderRadius:6, border:"1px solid #e2e8f0", background:"transparent", color:"#718096", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Abmelden</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {[["all","Alle",companies.length],...Object.entries(STATUS_CONFIG).map(([k,v])=>[k,v.label,companies.filter(c=>c.status===k).length])].map(([k,label,count])=>(
          <button key={k} onClick={()=>setStatusFilter(k)} style={{ padding:"4px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${statusFilter===k?"#6366f1":"#e2e8f0"}`, background:statusFilter===k?"#6366f122":"transparent", color:statusFilter===k?"#6366f1":"#718096" }}>{label} <span style={{opacity:0.6}}>{count}</span></button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>{setSelected(c.id);setView("detail");setActiveTab("overview")}} style={{ padding:"14px 16px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                <div style={{ fontSize:12, color:"#718096", marginTop:2 }}>{c.industry}{c.website&&` · ${c.website}`}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0, marginLeft:12 }}>
                {c.ai_relevance_score && <span style={{ fontSize:12, color:"#10b981", fontWeight:600 }}>{c.ai_relevance_score}/10</span>}
                <Badge status={c.status}/>
              </div>
            </div>
            {c.description&&<div style={{ fontSize:12, color:"#718096", marginTop:8, lineHeight:1.5 }}>{c.description.slice(0,120)}{c.description.length>120?"…":""}</div>}
            <div style={{ display:"flex", gap:12, marginTop:10, fontSize:11, color:"#a0aec0" }}>
              <span>👤 {c.contacts?.length||0} Kontakte</span>
              <span>⚡ {c.activities?.length||0} Aktivitäten</span>
              {(c.research_links?.length||0)>0&&<span>🔗 {c.research_links.length} Links</span>}
              {c.ai_relevance_score&&<span style={{color:"#10b981"}}>✦ KI-Analyse vorhanden</span>}
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{ textAlign:"center", color:"#a0aec0", padding:32, fontSize:13 }}>Keine Targets in diesem Status</div>}
      </div>
    </div>
  )

  // ── NEW COMPANY ──
  if (view === "new_company") return (
    <div style={s({ padding:20, maxWidth:720, margin:"0 auto" })}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setView("list")} style={{ background:"none", border:"none", cursor:"pointer", color:"#718096", fontSize:18 }}>←</button>
        <div style={{ fontSize:18, fontWeight:600 }}>Neues Target anlegen</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {inp("Unternehmensname *", newCompany.name, v=>setNewCompany(p=>({...p,name:v})))}
        {inp("Branche", newCompany.industry, v=>setNewCompany(p=>({...p,industry:v})))}
        {inp("Website (ohne https://)", newCompany.website, v=>setNewCompany(p=>({...p,website:v})))}
        {inp("Kurzbeschreibung", newCompany.description, v=>setNewCompany(p=>({...p,description:v})),true)}
        {inp("Erste Notiz", newCompany.notes, v=>setNewCompany(p=>({...p,notes:v})),true)}
        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          {btn("Speichern", saveCompany)}
          {btn("Abbrechen", ()=>setView("list"), "secondary")}
        </div>
      </div>
    </div>
  )

  // ── NEW CONTACT ──
  if (view === "new_contact") return (
    <div style={s({ padding:20, maxWidth:720, margin:"0 auto" })}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setView("detail")} style={{ background:"none", border:"none", cursor:"pointer", color:"#718096", fontSize:18 }}>←</button>
        <div><div style={{ fontSize:18, fontWeight:600 }}>Neuer Kontakt</div><div style={{ fontSize:12, color:"#718096" }}>{company?.name}</div></div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{flex:1}}>{inp("Vorname *", newContact.first_name, v=>setNewContact(p=>({...p,first_name:v})))}</div>
          <div style={{flex:1}}>{inp("Nachname *", newContact.last_name, v=>setNewContact(p=>({...p,last_name:v})))}</div>
        </div>
        {inp("Position / Titel", newContact.position, v=>setNewContact(p=>({...p,position:v})))}
        {inp("LinkedIn URL", newContact.linkedin_url, v=>setNewContact(p=>({...p,linkedin_url:v})))}
        {inp("E-Mail (optional)", newContact.email, v=>setNewContact(p=>({...p,email:v})))}
        {inp("Telefon (optional)", newContact.phone, v=>setNewContact(p=>({...p,phone:v})))}
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>Kontaktpunkte (wer kennt diese Person?)</div>
          {contactPoints.map((cp,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:13, flex:1, padding:"6px 10px", background:"#f7fafc", borderRadius:6, border:"1px solid #e2e8f0" }}>{cp}</span>
              <button onClick={()=>setContactPoints(p=>p.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", fontSize:16 }}>×</button>
            </div>
          ))}
          <div style={{ display:"flex", gap:8 }}>
            {inp("Name der internen Person", newContactPoint, setNewContactPoint)}
            <button onClick={()=>{if(newContactPoint.trim()){setContactPoints(p=>[...p,newContactPoint.trim()]);setNewContactPoint("")}}} style={{ padding:"8px 12px", background:"#f7fafc", border:"1px solid #e2e8f0", borderRadius:6, cursor:"pointer", color:"#1a202c", whiteSpace:"nowrap", fontFamily:"inherit" }}>+ Hinzufügen</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          {btn("Kontakt speichern", saveContact)}
          {btn("Abbrechen", ()=>setView("detail"), "secondary")}
        </div>
      </div>
    </div>
  )

  // ── DETAIL ──
  if (view === "detail" && company) {
    const tabs = ["overview","ki-research","contacts","research","activities"]
    const tabLabels = { overview:"Übersicht", "ki-research":"✦ KI-Research", contacts:"Kontakte", research:"Links & Docs", activities:"Aktivitäten" }
    return (
      <div style={s({ padding:20, maxWidth:720, margin:"0 auto" })}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:16 }}>
          <button onClick={()=>setView("list")} style={{ background:"none", border:"none", cursor:"pointer", color:"#718096", fontSize:18, marginTop:2 }}>←</button>
          <div style={{flex:1}}>
            <div style={{ fontSize:20, fontWeight:600 }}>{company.name}</div>
            <div style={{ fontSize:12, color:"#718096", marginTop:2 }}>{company.industry}{company.website&&` · ${company.website}`}</div>
          </div>
          <Badge status={company.status}/>
        </div>

        <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([k,v])=>(
            <button key={k} onClick={()=>updateStatus(company.id,k)} style={{ padding:"4px 10px", borderRadius:20, fontSize:11, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${company.status===k?v.color:"#e2e8f0"}`, background:company.status===k?v.color+"22":"transparent", color:company.status===k?v.color:"#a0aec0" }}>{v.label}</button>
          ))}
        </div>

        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #e2e8f0", marginBottom:16, overflowX:"auto" }}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={{ padding:"8px 14px", border:"none", borderBottom:activeTab===t?"2px solid #6366f1":"2px solid transparent", background:"none", cursor:"pointer", fontSize:13, fontFamily:"inherit", color:activeTab===t?"#6366f1":"#718096", fontWeight:activeTab===t?600:400, whiteSpace:"nowrap" }}>{tabLabels[t]}</button>
          ))}
        </div>

        {activeTab==="overview"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {company.ai_relevance_score&&(
              <div style={{ padding:"12px 14px", borderRadius:8, background:"#10b98111", border:"1px solid #10b98133", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"#10b981" }}>KI-Relevanz-Score</div>
                  <div style={{ fontSize:24, fontWeight:700, color:"#10b981" }}>{company.ai_relevance_score}/10</div>
                </div>
                <button onClick={()=>setActiveTab("ki-research")} style={{ fontSize:12, color:"#10b981", background:"none", border:"1px solid #10b981", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>Details →</button>
              </div>
            )}
            {company.description&&<div><div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:"#718096" }}>Beschreibung</div><div style={{ fontSize:13, lineHeight:1.6 }}>{company.description}</div></div>}
            {company.ai_summary&&<div><div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:"#718096" }}>KI-Zusammenfassung</div><div style={{ fontSize:13, lineHeight:1.6, color:"#4a5568" }}>{company.ai_summary}</div></div>}
            {company.notes&&<div><div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:"#718096" }}>Notizen</div><div style={{ fontSize:13, lineHeight:1.6 }}>{company.notes}</div></div>}
            {!company.ai_summary&&(
              <button onClick={()=>setActiveTab("ki-research")} style={{ padding:"10px 16px", borderRadius:8, border:"1px dashed #6366f1", background:"#6366f108", cursor:"pointer", fontSize:13, color:"#6366f1", fontFamily:"inherit", textAlign:"left" }}>✦ KI-Research starten →</button>
            )}
          </div>
        )}

        {activeTab==="ki-research"&&(
          <ResearchAgent company={company} onUpdate={handleResearchUpdate} />
        )}

        {activeTab==="contacts"&&(
          <div>
            {(company.contacts||[]).map(ct=>(
              <div key={ct.id} style={{ padding:14, borderRadius:8, border:"1px solid #e2e8f0", marginBottom:10, background:"#f7fafc" }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{ct.first_name} {ct.last_name}</div>
                {ct.position&&<div style={{ fontSize:12, color:"#718096", marginTop:2 }}>{ct.position}</div>}
                <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
                  {ct.email&&<span style={{ fontSize:12, color:"#718096" }}>✉ {ct.email}</span>}
                  {ct.phone&&<span style={{ fontSize:12, color:"#718096" }}>☎ {ct.phone}</span>}
                  {ct.linkedin_url&&<a href={ct.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#0077b5" }}>in LinkedIn</a>}
                </div>
                {(ct.contact_points||[]).length>0&&(
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:11, color:"#a0aec0", marginBottom:4 }}>Kontaktpunkte</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {ct.contact_points.map(cp=>(
                        <span key={cp.id} style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:"#6366f122", color:"#6366f1", border:"1px solid #6366f133" }}>{cp.internal_name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {btn("+ Kontakt hinzufügen", ()=>setView("new_contact"))}
          </div>
        )}

        {activeTab==="research"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:8, color:"#718096" }}>Research-Links</div>
              {(company.research_links||[]).map((link,i)=>(
                <div key={i} style={{ fontSize:12, color:"#6366f1", marginBottom:6, wordBreak:"break-all" }}>
                  <a href={link} target="_blank" rel="noreferrer" style={{ color:"#6366f1" }}>{link}</a>
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                {inp("URL hinzufügen", newLink, setNewLink)}
                <button onClick={addLink} style={{ padding:"8px 12px", background:"#f7fafc", border:"1px solid #e2e8f0", borderRadius:6, cursor:"pointer", color:"#1a202c", whiteSpace:"nowrap", fontFamily:"inherit" }}>+ Link</button>
              </div>
            </div>
            <div style={{ padding:"12px 14px", borderRadius:8, border:"1px dashed #e2e8f0", background:"#f7fafc" }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Dokumente</div>
              <div style={{ fontSize:12, color:"#a0aec0" }}>Dokument-Upload folgt in Modul 3</div>
            </div>
          </div>
        )}

        {activeTab==="activities"&&(
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <select value={newActivity.activity_type} onChange={e=>setNewActivity(p=>({...p,activity_type:e.target.value}))} style={{ padding:"7px 10px", borderRadius:6, border:"1px solid #e2e8f0", background:"#fff", color:"#1a202c", fontSize:13, fontFamily:"inherit" }}>
                <option value="note_added">Notiz</option>
                <option value="email_sent">E-Mail gesendet</option>
                <option value="call_done">Anruf</option>
                <option value="linkedin_message">LinkedIn-Nachricht</option>
                <option value="meeting_scheduled">Meeting geplant</option>
                <option value="meeting_done">Meeting stattgefunden</option>
                <option value="task_created">Aufgabe erstellt</option>
              </select>
              <div style={{flex:1}}>{inp("Beschreibung…", newActivity.description, v=>setNewActivity(p=>({...p,description:v})))}</div>
              <button onClick={addActivity} style={{ padding:"7px 14px", background:"#6366f1", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit" }}>+</button>
            </div>
            {(company.activities||[]).map(a=>(
              <div key={a.id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:"1px solid #f0f0f0" }}>
                <span style={{ fontSize:16, width:20, textAlign:"center", flexShrink:0, color:"#718096" }}>{ACTIVITY_ICONS[a.activity_type]||"·"}</span>
                <div style={{flex:1}}>
                  <div style={{ fontSize:13 }}>{a.description}</div>
                  <div style={{ fontSize:11, color:"#a0aec0", marginTop:2 }}>{a.created_at?.split("T")[0]}</div>
                </div>
              </div>
            ))}
            {(company.activities||[]).length===0&&<div style={{ color:"#a0aec0", fontSize:13, textAlign:"center", padding:24 }}>Noch keine Aktivitäten</div>}
          </div>
        )}
      </div>
    )
  }
  return null
}
