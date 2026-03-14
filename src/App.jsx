import { useState } from "react"

const STATUS_CONFIG = {
  identified:    { label: "Identifiziert",   color: "#888" },
  researching:   { label: "Research",        color: "#6366f1" },
  relevant:      { label: "Relevant",        color: "#0ea5e9" },
  outreach:      { label: "Outreach aktiv",  color: "#f59e0b" },
  opportunity:   { label: "Opportunity",     color: "#10b981" },
  disqualified:  { label: "Disqualifiziert", color: "#ef4444" },
}

const ACTIVITY_ICONS = {
  status_change:      "◎",
  note_added:         "✎",
  email_sent:         "✉",
  call_done:          "☎",
  linkedin_message:   "🔗",
  meeting_scheduled:  "📅",
  meeting_done:       "✓",
  task_created:       "□",
}

const DEMO_DATA = [
  {
    id: "1", name: "EDEKA Digital GmbH", industry: "Handel / Retail",
    website: "edeka-digital.de", status: "outreach",
    ai_relevance_score: 8,
    description: "IT-Tochter des EDEKA-Konzerns, verantwortlich für Digitalisierung und E-Commerce.",
    research_links: ["https://www.edeka-digital.de/about"],
    notes: "Kontakt über Henkel-Netzwerk möglich. CIO ist neu seit Q1.",
    contacts: [
      { id: "c1", first_name: "Julia", last_name: "Meier", position: "CIO", linkedin_url: "", email: "", phone: "",
        contact_points: [{ id: "cp1", internal_name: "Martin Orthen", relationship: "LinkedIn 1st" }] },
      { id: "c2", first_name: "Thomas", last_name: "Brandt", position: "Head of IT Projects", linkedin_url: "", email: "t.brandt@edeka.de", phone: "",
        contact_points: [{ id: "cp2", internal_name: "Kai Müller", relationship: "Ehemaliger Kollege" }] },
    ],
    activities: [
      { id: "a1", activity_type: "status_change", description: "Status → Outreach aktiv", created_at: "2026-03-10" },
      { id: "a2", activity_type: "linkedin_message", description: "LinkedIn-Nachricht an Julia Meier gesendet", created_at: "2026-03-12" },
    ]
  },
  {
    id: "2", name: "Beiersdorf AG", industry: "FMCG / Consumer Goods",
    website: "beiersdorf.com", status: "researching",
    ai_relevance_score: 7,
    description: "Internationaler FMCG-Konzern (NIVEA, Eucerin). Transformationsprogramm läuft.",
    research_links: [],
    notes: "",
    contacts: [
      { id: "c3", first_name: "Stefan", last_name: "Koch", position: "VP Operations", linkedin_url: "", email: "", phone: "",
        contact_points: [] }
    ],
    activities: [
      { id: "a3", activity_type: "note_added", description: "Research gestartet – Geschäftsbericht 2025 gesichtet", created_at: "2026-03-08" },
    ]
  },
  {
    id: "3", name: "Otto Group", industry: "E-Commerce / Handel",
    website: "ottogroup.com", status: "identified",
    ai_relevance_score: null,
    description: "Einer der größten E-Commerce-Konzerne Europas, HQ Hamburg.",
    research_links: [],
    notes: "",
    contacts: [],
    activities: []
  }
]

const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500, background: cfg.color + "22",
      color: cfg.color, border: `1px solid ${cfg.color}44`
    }}>{cfg.label}</span>
  )
}

const ScoreDot = ({ score }) => {
  if (!score) return <span style={{ color: "#aaa", fontSize: 12 }}>–</span>
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#f59e0b" : "#ef4444"
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontSize: 12, color }}>{score}/10</span>
    </span>
  )
}

export default function App() {
  const [companies, setCompanies] = useState(DEMO_DATA)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState("list")
  const [statusFilter, setStatusFilter] = useState("all")
  const [newCompany, setNewCompany] = useState({ name: "", industry: "", website: "", description: "", notes: "" })
  const [newContact, setNewContact] = useState({ first_name: "", last_name: "", position: "", linkedin_url: "", email: "", phone: "" })
  const [newContactPoint, setNewContactPoint] = useState("")
  const [contactPoints, setContactPoints] = useState([])
  const [newLink, setNewLink] = useState("")
  const [newActivity, setNewActivity] = useState({ activity_type: "note_added", description: "" })
  const [activeTab, setActiveTab] = useState("overview")

  const filtered = statusFilter === "all" ? companies : companies.filter(c => c.status === statusFilter)
  const company = selected ? companies.find(c => c.id === selected) : null

  const saveCompany = () => {
    const id = Date.now().toString()
    setCompanies(prev => [...prev, {
      ...newCompany, id, status: "identified", ai_relevance_score: null,
      research_links: [], contacts: [], activities: [],
      created_at: new Date().toISOString()
    }])
    setNewCompany({ name: "", industry: "", website: "", description: "", notes: "" })
    setView("list")
  }

  const saveContact = () => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== selected) return c
      return {
        ...c,
        contacts: [...c.contacts, {
          ...newContact,
          id: Date.now().toString(),
          contact_points: contactPoints.map((n, i) => ({ id: `cp_${Date.now()}_${i}`, internal_name: n, relationship: "" }))
        }]
      }
    }))
    setNewContact({ first_name: "", last_name: "", position: "", linkedin_url: "", email: "", phone: "" })
    setContactPoints([])
    setView("detail")
  }

  const addLink = () => {
    if (!newLink.trim()) return
    setCompanies(prev => prev.map(c =>
      c.id === selected ? { ...c, research_links: [...c.research_links, newLink.trim()] } : c
    ))
    setNewLink("")
  }

  const addActivity = () => {
    if (!newActivity.description.trim()) return
    setCompanies(prev => prev.map(c => {
      if (c.id !== selected) return c
      return {
        ...c,
        activities: [{ id: Date.now().toString(), ...newActivity, created_at: new Date().toISOString().split("T")[0] }, ...c.activities]
      }
    }))
    setNewActivity({ activity_type: "note_added", description: "" })
  }

  const updateStatus = (companyId, newStatus) => {
    setCompanies(prev => prev.map(c => {
      if (c.id !== companyId) return c
      return {
        ...c, status: newStatus,
        activities: [{ id: Date.now().toString(), activity_type: "status_change", description: `Status → ${STATUS_CONFIG[newStatus].label}`, created_at: new Date().toISOString().split("T")[0] }, ...c.activities]
      }
    }))
  }

  const inp = (placeholder, val, setter, textarea) => {
    const style = {
      width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e2e8f0",
      background: "#fff", color: "#1a202c", fontSize: 13, outline: "none",
      boxSizing: "border-box", resize: textarea ? "vertical" : undefined,
      minHeight: textarea ? 72 : undefined, fontFamily: "inherit"
    }
    return textarea
      ? <textarea style={style} placeholder={placeholder} value={val} onChange={e => setter(e.target.value)} />
      : <input style={style} placeholder={placeholder} value={val} onChange={e => setter(e.target.value)} />
  }

  const btn = (label, onClick, variant = "primary") => {
    const bg = variant === "primary" ? "#6366f1" : "transparent"
    const color = variant === "primary" ? "#fff" : "#4a5568"
    return (
      <button onClick={onClick} style={{
        padding: "7px 14px", borderRadius: 6, border: "1px solid #e2e8f0",
        background: bg, color, fontSize: 13, cursor: "pointer", fontFamily: "inherit"
      }}>{label}</button>
    )
  }

  if (view === "list") return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a202c", padding: "20px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Cold Outreach Pipeline</div>
          <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>55BirchStreet · {companies.length} Targets</div>
        </div>
        {btn("+ Unternehmen", () => setView("new_company"))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {[["all", "Alle", companies.length], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label, companies.filter(c => c.status === k).length])].map(([k, label, count]) => (
          <button key={k} onClick={() => setStatusFilter(k)} style={{
            padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${statusFilter === k ? "#6366f1" : "#e2e8f0"}`,
            background: statusFilter === k ? "#6366f122" : "transparent",
            color: statusFilter === k ? "#6366f1" : "#718096"
          }}>{label} <span style={{ opacity: 0.6 }}>{count}</span></button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(c => (
          <div key={c.id} onClick={() => { setSelected(c.id); setView("detail"); setActiveTab("overview") }}
            style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{c.industry} {c.website && `· ${c.website}`}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                <ScoreDot score={c.ai_relevance_score} />
                <Badge status={c.status} />
              </div>
            </div>
            {c.description && <div style={{ fontSize: 12, color: "#718096", marginTop: 8, lineHeight: 1.5 }}>{c.description.slice(0, 120)}{c.description.length > 120 ? "…" : ""}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "#a0aec0" }}>
              <span>👤 {c.contacts.length} Kontakte</span>
              <span>⚡ {c.activities.length} Aktivitäten</span>
              {c.research_links.length > 0 && <span>🔗 {c.research_links.length} Links</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", color: "#a0aec0", padding: 32, fontSize: 13 }}>Keine Targets in diesem Status</div>}
      </div>
    </div>
  )

  if (view === "new_company") return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a202c", padding: "20px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#718096", fontSize: 18 }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Neues Target anlegen</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {inp("Unternehmensname *", newCompany.name, v => setNewCompany(p => ({ ...p, name: v })))}
        {inp("Branche", newCompany.industry, v => setNewCompany(p => ({ ...p, industry: v })))}
        {inp("Website", newCompany.website, v => setNewCompany(p => ({ ...p, website: v })))}
        {inp("Kurzbeschreibung", newCompany.description, v => setNewCompany(p => ({ ...p, description: v })), true)}
        {inp("Erste Notiz", newCompany.notes, v => setNewCompany(p => ({ ...p, notes: v })), true)}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {btn("Speichern", saveCompany)}
          {btn("Abbrechen", () => setView("list"), "secondary")}
        </div>
      </div>
    </div>
  )

  if (view === "new_contact") return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a202c", padding: "20px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView("detail")} style={{ background: "none", border: "none", cursor: "pointer", color: "#718096", fontSize: 18 }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Neuer Kontakt</div>
          <div style={{ fontSize: 12, color: "#718096" }}>{company?.name}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>{inp("Vorname *", newContact.first_name, v => setNewContact(p => ({ ...p, first_name: v })))}</div>
          <div style={{ flex: 1 }}>{inp("Nachname *", newContact.last_name, v => setNewContact(p => ({ ...p, last_name: v })))}</div>
        </div>
        {inp("Position / Titel", newContact.position, v => setNewContact(p => ({ ...p, position: v })))}
        {inp("LinkedIn URL", newContact.linkedin_url, v => setNewContact(p => ({ ...p, linkedin_url: v })))}
        {inp("E-Mail (optional)", newContact.email, v => setNewContact(p => ({ ...p, email: v })))}
        {inp("Telefon (optional)", newContact.phone, v => setNewContact(p => ({ ...p, phone: v })))}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Kontaktpunkte (wer kennt diese Person?)</div>
          {contactPoints.map((cp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, flex: 1, padding: "6px 10px", background: "#f7fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>{cp}</span>
              <button onClick={() => setContactPoints(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16 }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            {inp("Name der internen Person", newContactPoint, setNewContactPoint)}
            <button onClick={() => { if (newContactPoint.trim()) { setContactPoints(p => [...p, newContactPoint.trim()]); setNewContactPoint("") } }}
              style={{ padding: "8px 12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#1a202c", whiteSpace: "nowrap", fontFamily: "inherit" }}>+ Hinzufügen</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {btn("Kontakt speichern", saveContact)}
          {btn("Abbrechen", () => setView("detail"), "secondary")}
        </div>
      </div>
    </div>
  )

  if (view === "detail" && company) {
    const tabs = ["overview", "contacts", "research", "activities"]
    const tabLabels = { overview: "Übersicht", contacts: "Kontakte", research: "Research", activities: "Aktivitäten" }

    return (
      <div style={{ fontFamily: "system-ui, sans-serif", color: "#1a202c", padding: "20px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#718096", fontSize: 18, marginTop: 2 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{company.name}</div>
            <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{company.industry} {company.website && `· ${company.website}`}</div>
          </div>
          <Badge status={company.status} />
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => updateStatus(company.id, k)} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              border: `1px solid ${company.status === k ? v.color : "#e2e8f0"}`,
              background: company.status === k ? v.color + "22" : "transparent",
              color: company.status === k ? v.color : "#a0aec0"
            }}>{v.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: "8px 16px", border: "none", borderBottom: activeTab === t ? "2px solid #6366f1" : "2px solid transparent",
              background: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
              color: activeTab === t ? "#6366f1" : "#718096", fontWeight: activeTab === t ? 600 : 400
            }}>{tabLabels[t]}</button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {company.ai_relevance_score && (
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#10b98111", border: "1px solid #10b98133" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>KI-Relevanz-Score</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#10b981", marginTop: 4 }}>{company.ai_relevance_score}/10</div>
              </div>
            )}
            {company.description && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#718096" }}>Beschreibung</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{company.description}</div>
              </div>
            )}
            {company.notes && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#718096" }}>Notizen</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{company.notes}</div>
              </div>
            )}
            <button style={{
              padding: "10px 16px", borderRadius: 8, border: "1px dashed #e2e8f0",
              background: "transparent", cursor: "pointer", fontSize: 13, color: "#6366f1", fontFamily: "inherit", textAlign: "left"
            }}>✦ KI-Research starten (Modul 2)</button>
          </div>
        )}

        {activeTab === "contacts" && (
          <div>
            {company.contacts.map(ct => (
              <div key={ct.id} style={{ padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 10, background: "#f7fafc" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ct.first_name} {ct.last_name}</div>
                {ct.position && <div style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{ct.position}</div>}
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                  {ct.email && <span style={{ fontSize: 12, color: "#718096" }}>✉ {ct.email}</span>}
                  {ct.phone && <span style={{ fontSize: 12, color: "#718096" }}>☎ {ct.phone}</span>}
                  {ct.linkedin_url && <span style={{ fontSize: 12, color: "#0077b5" }}>in LinkedIn</span>}
                </div>
                {ct.contact_points.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#a0aec0", marginBottom: 4 }}>Kontaktpunkte</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ct.contact_points.map(cp => (
                        <span key={cp.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#6366f122", color: "#6366f1", border: "1px solid #6366f133" }}>
                          {cp.internal_name}{cp.relationship ? ` · ${cp.relationship}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {btn("+ Kontakt hinzufügen", () => setView("new_contact"))}
          </div>
        )}

        {activeTab === "research" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#718096" }}>Research-Links</div>
              {company.research_links.map((link, i) => (
                <div key={i} style={{ fontSize: 12, color: "#6366f1", marginBottom: 6, wordBreak: "break-all" }}>{link}</div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {inp("URL hinzufügen", newLink, setNewLink)}
                <button onClick={addLink} style={{ padding: "8px 12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#1a202c", whiteSpace: "nowrap", fontFamily: "inherit" }}>+ Link</button>
              </div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px dashed #e2e8f0", background: "#f7fafc" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Dokumente</div>
              <div style={{ fontSize: 12, color: "#a0aec0" }}>Dokument-Upload wird in Modul 2 freigeschaltet (Supabase Storage)</div>
            </div>
            <button style={{
              padding: "10px 16px", borderRadius: 8, border: "1px dashed #e2e8f0",
              background: "transparent", cursor: "pointer", fontSize: 13, color: "#6366f1", fontFamily: "inherit", textAlign: "left"
            }}>✦ KI-Research aus Links generieren (Modul 2)</button>
          </div>
        )}

        {activeTab === "activities" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select value={newActivity.activity_type} onChange={e => setNewActivity(p => ({ ...p, activity_type: e.target.value }))}
                style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#1a202c", fontSize: 13, fontFamily: "inherit" }}>
                <option value="note_added">Notiz</option>
                <option value="email_sent">E-Mail gesendet</option>
                <option value="call_done">Anruf</option>
                <option value="linkedin_message">LinkedIn-Nachricht</option>
                <option value="meeting_scheduled">Meeting geplant</option>
                <option value="meeting_done">Meeting stattgefunden</option>
                <option value="task_created">Aufgabe erstellt</option>
              </select>
              <div style={{ flex: 1 }}>{inp("Beschreibung…", newActivity.description, v => setNewActivity(p => ({ ...p, description: v })))}</div>
              <button onClick={addActivity} style={{ padding: "7px 14px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>+</button>
            </div>
            {company.activities.map(a => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0, color: "#718096" }}>{ACTIVITY_ICONS[a.activity_type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 2 }}>{a.created_at}</div>
                </div>
              </div>
            ))}
            {company.activities.length === 0 && <div style={{ color: "#a0aec0", fontSize: 13, textAlign: "center", padding: 24 }}>Noch keine Aktivitäten</div>}
          </div>
        )}
      </div>
    )
  }

  return null
}
