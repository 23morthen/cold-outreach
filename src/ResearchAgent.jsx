import { useState } from "react"
import { supabase } from "./supabaseClient"

const btn = (label, onClick, variant = "primary", disabled = false) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0",
    background: disabled ? "#e2e8f0" : variant === "primary" ? "#6366f1" : variant === "danger" ? "#fee2e2" : "#fff",
    color: disabled ? "#a0aec0" : variant === "primary" ? "#fff" : variant === "danger" ? "#ef4444" : "#4a5568",
    fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit"
  }}>{label}</button>
)

export default function ResearchAgent({ company, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  const runResearch = async () => {
    if (!company.website && company.research_links?.length === 0) {
      setError("Bitte zuerst eine Website oder Research-Links hinterlegen.")
      return
    }
    setLoading(true)
    setError("")
    setStep("Website wird analysiert…")

    const urls = [
      company.website ? `https://${company.website.replace(/^https?:\/\//, "")}` : null,
      ...(company.research_links || [])
    ].filter(Boolean)

    try {
      setStep("KI analysiert Unternehmen…")
      const response = await fetch("/api/research", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          system: `Du bist ein erfahrener Business Development Analyst für 55BirchStreet, eine Hamburger Management-Beratung spezialisiert auf Projects & Processes, Change & Organization und Generative AI. Du analysierst potenzielle Akquise-Targets und erstellst präzise, actionable Unternehmensanalysen. Antworte NUR mit validem JSON, kein Markdown, keine Erklärungen außerhalb des JSON.`,
          messages: [{
            role: "user",
            content: `Analysiere das Unternehmen "${company.name}" für eine Kaltakquise durch 55BirchStreet.

Unternehmenswebsite: ${urls[0] || "nicht angegeben"}
Weitere Links: ${urls.slice(1).join(", ") || "keine"}
Branche: ${company.industry || "unbekannt"}
Bekannte Infos: ${company.description || "keine"}

Bitte recherchiere das Unternehmen und erstelle eine vollständige Analyse. Antworte NUR mit diesem JSON (kein Markdown):

{
  "summary": "2-3 Sätze Unternehmensüberblick",
  "market_position": "Marktposition und Wettbewerbsumfeld in 2-3 Sätzen",
  "challenges": [
    {"title": "Herausforderung 1", "description": "Erklärung warum relevant"},
    {"title": "Herausforderung 2", "description": "Erklärung warum relevant"},
    {"title": "Herausforderung 3", "description": "Erklärung warum relevant"}
  ],
  "relevance_score": 8,
  "relevance_reasoning": "Begründung des Scores für 55BirchStreet",
  "fit_areas": ["Projects & Processes", "Change & Organization", "Generative AI"],
  "one_pager": {
    "headline": "Prägnante Headline für den 1-Pager",
    "intro": "Einleitungssatz über das Unternehmen",
    "challenge_1_title": "Titel",
    "challenge_1_text": "Beschreibung der Herausforderung und wie 55BirchStreet helfen kann",
    "challenge_2_title": "Titel",
    "challenge_2_text": "Beschreibung",
    "challenge_3_title": "Titel",
    "challenge_3_text": "Beschreibung",
    "closing": "Abschlusssatz mit Call-to-Action"
  },
  "spin_questions": {
    "situation": ["Frage 1", "Frage 2", "Frage 3"],
    "problem": ["Frage 1", "Frage 2", "Frage 3"],
    "implication": ["Frage 1", "Frage 2", "Frage 3"],
    "need_payoff": ["Frage 1", "Frage 2", "Frage 3"]
  },
  "talk_track": "Kurzer Gesprächseinstieg für das erste Akquise-Gespräch (3-4 Sätze)"
}`
          }]
        })
      })

      const data = await response.json()

      // Extract text from response (handle tool use)
      const textBlock = data.content?.find(b => b.type === "text")
      if (!textBlock) throw new Error("Keine Antwort von der KI erhalten")

      setStep("Ergebnis wird verarbeitet…")
      let parsed
      try {
        const clean = textBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        parsed = JSON.parse(clean)
      } catch {
        throw new Error("KI-Antwort konnte nicht verarbeitet werden")
      }

      setResult(parsed)

      // Save to Supabase
      setStep("Wird gespeichert…")
      await supabase.from("companies").update({
        ai_summary: parsed.summary,
        ai_challenges: JSON.stringify(parsed.challenges),
        ai_relevance_score: parsed.relevance_score,
      }).eq("id", company.id)

      if (onUpdate) onUpdate({
        ai_summary: parsed.summary,
        ai_challenges: JSON.stringify(parsed.challenges),
        ai_relevance_score: parsed.relevance_score,
      })

      setStep("")
    } catch (e) {
      setError(e.message || "Fehler bei der KI-Analyse")
    }
    setLoading(false)
  }

  const printOnePager = () => {
    const w = window.open("", "_blank")
    const op = result.one_pager
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>1-Pager ${company.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; padding: 48px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #6366f1; padding-bottom: 16px; }
          .company-name { font-size: 28px; font-weight: 700; color: #1a202c; }
          .company-industry { font-size: 14px; color: #718096; margin-top: 4px; }
          .logo-placeholder { width: 80px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; }
          .branding { text-align: right; }
          .branding-name { font-size: 13px; font-weight: 600; color: #6366f1; }
          .headline { font-size: 20px; font-weight: 600; color: #2d3748; margin-bottom: 12px; line-height: 1.4; }
          .intro { font-size: 14px; color: #4a5568; line-height: 1.7; margin-bottom: 28px; }
          .challenges { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
          .challenge { background: #f7f7fe; border-left: 3px solid #6366f1; padding: 14px; border-radius: 0 6px 6px 0; }
          .challenge-title { font-size: 13px; font-weight: 600; color: #6366f1; margin-bottom: 6px; }
          .challenge-text { font-size: 12px; color: #4a5568; line-height: 1.6; }
          .closing { font-size: 14px; color: #2d3748; font-style: italic; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #a0aec0; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${company.name}</div>
            <div class="company-industry">${company.industry || ""}</div>
          </div>
          <div class="branding">
            <div class="branding-name">55BirchStreet</div>
            <div style="font-size:11px;color:#a0aec0">Management Consulting</div>
          </div>
        </div>
        <div class="headline">${op.headline}</div>
        <div class="intro">${op.intro}</div>
        <div class="challenges">
          <div class="challenge">
            <div class="challenge-title">${op.challenge_1_title}</div>
            <div class="challenge-text">${op.challenge_1_text}</div>
          </div>
          <div class="challenge">
            <div class="challenge-title">${op.challenge_2_title}</div>
            <div class="challenge-text">${op.challenge_2_text}</div>
          </div>
          <div class="challenge">
            <div class="challenge-title">${op.challenge_3_title}</div>
            <div class="challenge-text">${op.challenge_3_text}</div>
          </div>
        </div>
        <div class="closing">${op.closing}</div>
        <div class="footer">55BirchStreet GmbH · Hamburg · 55birchstreet.com</div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    w.document.close()
  }

  const scoreColor = (s) => s >= 8 ? "#10b981" : s >= 6 ? "#f59e0b" : "#ef4444"

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {!result && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#718096", marginBottom: 12, lineHeight: 1.6 }}>
            Der KI-Agent analysiert die Website und Research-Links von <strong>{company.name}</strong> und erstellt automatisch:
            Unternehmensanalyse · Herausforderungen · Relevanz-Score · 1-Pager · SPIN-Fragen · Gesprächsleitfaden
          </div>
          {(!company.website && (!company.research_links || company.research_links.length === 0)) && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3c7", border: "1px solid #f59e0b22", fontSize: 12, color: "#92400e", marginBottom: 12 }}>
              ⚠ Bitte zuerst Website oder Research-Links im Tab "Research" hinterlegen.
            </div>
          )}
          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef444422", fontSize: 12, color: "#991b1b", marginBottom: 12 }}>{error}</div>}
          {loading
            ? <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                <div style={{ width: 16, height: 16, border: "2px solid #6366f1", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 13, color: "#6366f1" }}>{step}</span>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            : btn("✦ KI-Research starten", runResearch, "primary", !company.website && (!company.research_links || company.research_links.length === 0))
          }
        </div>
      )}

      {result && (
        <div>
          {/* Score + Fit */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ padding: "12px 16px", borderRadius: 8, background: scoreColor(result.relevance_score) + "11", border: `1px solid ${scoreColor(result.relevance_score)}33`, flex: "0 0 auto" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: scoreColor(result.relevance_score) }}>Relevanz-Score</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(result.relevance_score) }}>{result.relevance_score}/10</div>
              <div style={{ fontSize: 11, color: "#718096", marginTop: 4, maxWidth: 180 }}>{result.relevance_reasoning}</div>
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#f7f7fe", border: "1px solid #e2e8f0", flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", marginBottom: 6 }}>Fit-Bereiche</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.fit_areas?.map((a, i) => <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#6366f122", color: "#6366f1", border: "1px solid #6366f133" }}>{a}</span>)}
              </div>
              <div style={{ fontSize: 12, color: "#4a5568", marginTop: 10, lineHeight: 1.6 }}>{result.market_position}</div>
            </div>
          </div>

          {/* Challenges */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#2d3748" }}>Herausforderungen</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.challenges?.map((c, i) => (
                <div key={i} style={{ padding: "12px 14px", borderRadius: 8, background: "#f7f7fe", borderLeft: "3px solid #6366f1" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "#4a5568", lineHeight: 1.6 }}>{c.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Talk Track */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>Gesprächseinstieg</div>
            <div style={{ padding: "14px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontSize: 13, color: "#166534", lineHeight: 1.7, fontStyle: "italic" }}>
              "{result.talk_track}"
            </div>
          </div>

          {/* SPIN Questions */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#2d3748" }}>SPIN-Fragen</div>
            {[
              { key: "situation", label: "Situation", color: "#0ea5e9" },
              { key: "problem", label: "Problem", color: "#f59e0b" },
              { key: "implication", label: "Implication", color: "#ef4444" },
              { key: "need_payoff", label: "Need Pay-Off", color: "#10b981" },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                {result.spin_questions?.[key]?.map((q, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#4a5568", padding: "6px 10px", background: color + "11", borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}>„{q}"</div>
                ))}
              </div>
            ))}
          </div>

          {/* 1-Pager Preview */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#2d3748" }}>1-Pager Vorschau</div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "2px solid #6366f1", paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{company.name}</div>
                  <div style={{ fontSize: 12, color: "#718096" }}>{company.industry}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#6366f1" }}>55BirchStreet</div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>Management Consulting</div>
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#2d3748", marginBottom: 8 }}>{result.one_pager?.headline}</div>
              <div style={{ fontSize: 12, color: "#4a5568", lineHeight: 1.7, marginBottom: 16 }}>{result.one_pager?.intro}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ background: "#f7f7fe", borderLeft: "3px solid #6366f1", padding: 10, borderRadius: "0 6px 6px 0" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>{result.one_pager?.[`challenge_${n}_title`]}</div>
                    <div style={{ fontSize: 11, color: "#4a5568", lineHeight: 1.5 }}>{result.one_pager?.[`challenge_${n}_text`]}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#2d3748", fontStyle: "italic", borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>{result.one_pager?.closing}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {btn("🖨 1-Pager drucken / PDF", printOnePager, "secondary")}
            {btn("↺ Neu analysieren", () => { setResult(null); setStep("") }, "secondary")}
          </div>
        </div>
      )}
    </div>
  )
}
