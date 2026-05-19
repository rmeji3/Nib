// chat.jsx — Right-side AI chat panel.
// Renders messages, suggested prompts, reasoning steps, citations (3 styles), composer.

// ── Sample Q&A library ────────────────────────────────────────────────
// Each scripted answer points to specific blocks in the PDF so the
// citation → jump interaction is real.

const PROMPT_LIBRARY = [
  {
    q: "What's the highest peak thermal load reported?",
    icon: "search",
    a: {
      reasoning: [
        "Searching across 6 pages, 24 text blocks, 1 table.",
        "Top hits: Table 1 (p.4), Conclusion (p.6), §3 discussion (p.4).",
        "Cross-checking values against §3 prose.",
      ],
      // segments: plain string OR { cite: n } to inject a citation marker
      segments: [
        "Across the six characterized racks, ",
        "Rack R6 (8 × B200) reaches the highest peak load at ",
        { strong: "62.4 kW" },
        " under sustained training",
        { cite: 1 },
        ". This exceeds the original 32 kW per-rack design budget by 95%. The H200-class racks top out at ",
        { strong: "38.2 kW" },
        " on R4",
        { cite: 1 },
        ", which is still 4 °C inside the silicon throttle threshold",
        { cite: 2 },
        ".",
      ],
      citations: [
        { page: 3, blockId: "p4-table1", label: "Table 1", snippet: "R6 · 8 × B200 · Peak 62.4 kW (commissioned Feb 28, 9-day window)." },
        { page: 3, blockId: "p4-discussion", label: "§3, p.4", snippet: "R6 exceeds the original 32 kW per-rack design budget by 95%..." },
      ],
      confidence: 0.92,
    },
  },
  {
    q: "Explain Figure 3.",
    icon: "sparkles",
    a: {
      reasoning: [
        "Locating Figure 3 on page 5.",
        "Parsing axes: x = flow rate (L/min), y = tokens/s/GPU.",
        "Extracting the knee inflection point and caption.",
      ],
      segments: [
        "Figure 3 plots sustained training throughput against secondary coolant flow rate, swept from 1.0 to 3.6 L/min at a 27 °C inlet",
        { cite: 1 },
        ". The throughput curve shows a sharp ",
        { strong: "knee at 2.4 L/min" },
        ": below it, throughput is flow-limited; above it, additional flow yields diminishing returns while pump power continues to rise super-linearly",
        { cite: 1 },
        ". Based on this, the paper adopts 2.4 L/min as the steady-state setpoint with transient surges allowed up to 3.0 L/min",
        { cite: 2 },
        ".",
      ],
      citations: [
        { page: 4, blockId: "p5-figure3", label: "Figure 3, p.5", snippet: "Sustained training throughput as a function of secondary coolant flow rate. Knee at 2.4 L/min..." },
        { page: 4, blockId: "p5-recommendation", label: "§4, p.5", snippet: "We adopt 2.4 L/min as the nominal setpoint for steady-state operation..." },
      ],
      confidence: 0.95,
    },
  },
  {
    q: "How is the cooling system architected?",
    icon: "search",
    a: {
      reasoning: [
        "Reading §2 System Architecture (p.3).",
        "Cross-referencing Figure 1 diagram blocks.",
        "Validating temperature ranges against caption.",
      ],
      segments: [
        "The system is a ",
        { strong: "two-stage loop" },
        ". A primary facility loop carries water at 18–22 °C from rooftop dry coolers to a row-end CDU",
        { cite: 1 },
        ". The CDU isolates the facility side from a treated propylene-glycol secondary loop that feeds the racks at 25–28 °C and returns at 38–42 °C under load",
        { cite: 1 },
        ". At the rack, RDHx panels handle ambient-air heat shed and direct-to-chip cold plates handle GPU and NVSwitch die-level extraction",
        { cite: 2 },
        ". The split is intentionally undersized for D2C — 68–74% goes through cold plates, the rest through RDHx — to preserve redundancy if a hose disconnects during service",
        { cite: 3 },
        ".",
      ],
      citations: [
        { page: 2, blockId: "p3-arch", label: "§2, p.3", snippet: "Primary facility loop carries water at 18–22 °C from rooftop dry coolers..." },
        { page: 2, blockId: "p3-figure1", label: "Figure 1, p.3", snippet: "Two-stage cooling loop. Facility water is isolated from the treated technology coolant at the CDU..." },
        { page: 2, blockId: "p3-splits", label: "§2.1, p.3", snippet: "Under typical training workloads, 68–74% of total rack heat is removed via D2C..." },
      ],
      confidence: 0.91,
    },
  },
  {
    q: "What flow rate do they recommend?",
    icon: "sparkles",
    a: {
      reasoning: [
        "Locating recommendation in §4 (p.5).",
        "Confirming with Figure 3 caption.",
      ],
      segments: [
        "The recommended steady-state setpoint is ",
        { strong: "2.4 L/min per chassis" },
        ", chosen at the throughput–flow knee shown in Figure 3",
        { cite: 1 },
        ". The adaptive controller is permitted to surge to ",
        { strong: "3.0 L/min for up to 90 s" },
        " during transient thermal events; above 3.0 L/min the additional pump-power cost crosses the savings threshold versus the air-cooled baseline",
        { cite: 1 },
        ".",
      ],
      citations: [
        { page: 4, blockId: "p5-recommendation", label: "§4, p.5", snippet: "We adopt 2.4 L/min as the nominal setpoint for steady-state operation..." },
      ],
      confidence: 0.97,
    },
  },
];

// Render a list of "segments" into JSX, with citation refs.
function MessageSegments({ segments, citations, citationStyle, onCiteHover, onCiteClick }) {
  return (
    <>
      {segments.map((s, i) => {
        if (typeof s === "string") return <React.Fragment key={i}>{s}</React.Fragment>;
        if (s.strong) return <b key={i}>{s.strong}</b>;
        if (s.cite != null) {
          const c = citations[s.cite - 1];
          if (!c) return null;
          if (citationStyle === "highlights") {
            // No inline marker — just a tiny dot indicator
            return (
              <span key={i}
                    onClick={() => onCiteClick(c, s.cite)}
                    onMouseEnter={(e) => onCiteHover(c, e.currentTarget)}
                    onMouseLeave={() => onCiteHover(null)}
                    style={{
                      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                      background: "var(--citation)", verticalAlign: 2, margin: "0 3px",
                      cursor: "pointer",
                    }}
                    title={`${c.label}`}
              />
            );
          }
          // Inline number (also used as the small marker for "cards" style;
          // the cards just add a wrap below the message)
          return (
            <span
              key={i}
              className="cite-inline"
              onMouseEnter={(e) => onCiteHover(c, e.currentTarget)}
              onMouseLeave={() => onCiteHover(null)}
              onClick={() => onCiteClick(c, s.cite)}
            >
              {s.cite}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

function CitePreview({ data, anchor }) {
  if (!data || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  // Position above the anchor; clamp to viewport
  const top = Math.max(8, r.top - 12 - 100);
  const left = Math.min(window.innerWidth - 280, Math.max(8, r.left - 130));
  return ReactDOM.createPortal(
    <div className="cite-preview" style={{ top, left }}>
      <div className="cite-preview-label">{data.label} · click to jump</div>
      <div className="cite-preview-body">{data.snippet}</div>
    </div>,
    document.body
  );
}

function ReasoningPanel({ steps, done }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={"reasoning" + (open ? " open" : "")}>
      <div className="reasoning-header" onClick={() => setOpen((o) => !o)}>
        {done
          ? <Icon name="chevron-right" />
          : <div className="reasoning-spin" />}
        <span style={{ flex: 1 }}>
          {done
            ? `Reviewed ${steps.length} sources · ${(0.4 + steps.length * 0.3).toFixed(1)}s`
            : steps[steps.length - 1] || "Searching document..."}
        </span>
        {done && <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{open ? "hide" : "show"}</span>}
      </div>
      <div className="reasoning-body">
        {steps.map((s, i) => (
          <div key={i} className={"reasoning-step" + (done || i < steps.length - 1 ? " done" : "")}
               style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="dot" />
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  return (
    <div className={"confidence" + (value < 0.7 ? " low" : "")}>
      <div className="confidence-bar"><i style={{ width: pct + "%" }} /></div>
      <span>{pct}% confidence · grounded</span>
    </div>
  );
}

function AssistantMessage({ msg, citationStyle, onCiteHover, onCiteClick }) {
  return (
    <div className={"msg msg-assistant" + (msg.streaming ? " is-streaming" : "")}>
      <div className="msg-byline">
        <span className="msg-byline-dot" />
        Foliate Assistant
      </div>
      {msg.reasoning && <ReasoningPanel steps={msg.reasoningShown || msg.reasoning} done={msg.streamDone} />}
      <div className="msg-bubble">
        {msg.streaming
          ? <span style={{ color: "var(--text-dim)" }}>{msg.streamedText}<span className="caret">▍</span></span>
          : <MessageSegments
              segments={msg.segments}
              citations={msg.citations}
              citationStyle={citationStyle}
              onCiteHover={onCiteHover}
              onCiteClick={onCiteClick}
            />
        }
      </div>
      {!msg.streaming && citationStyle === "cards" && (
        <div className="cite-cards-wrap">
          {msg.citations.map((c, i) => (
            <button key={i} className="cite-card"
                    onClick={() => onCiteClick(c, i + 1)}
                    onMouseEnter={(e) => onCiteHover(c, e.currentTarget)}
                    onMouseLeave={() => onCiteHover(null)}>
              <span className="cite-card-idx">{i + 1}</span>
              <span className="cite-card-body">
                <span className="cite-card-where">{c.label}</span>
                <span className="cite-card-snippet">{c.snippet}</span>
              </span>
              <Icon name="arrow-right" />
            </button>
          ))}
        </div>
      )}
      {!msg.streaming && <ConfidenceBar value={msg.confidence} />}
      {!msg.streaming && (
        <div style={{ display: "flex", gap: 4, marginTop: 8, color: "var(--text-faint)" }}>
          <button className="tb-btn icon" title="Copy"><Icon name="copy" /></button>
          <button className="tb-btn icon" title="Regenerate"><Icon name="regenerate" /></button>
          <button className="tb-btn icon" title="More"><Icon name="more" /></button>
        </div>
      )}
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <div className="msg msg-user">
      <div className="msg-bubble">{msg.text}</div>
    </div>
  );
}

function Suggestions({ onPick }) {
  return (
    <div className="suggestions">
      <div className="suggestions-label">Try asking</div>
      {PROMPT_LIBRARY.map((p, i) => (
        <button key={i} className="suggestion" onClick={() => onPick(p)}>
          <span className="suggestion-icon"><Icon name={p.icon} /></span>
          <span>{p.q}</span>
        </button>
      ))}
    </div>
  );
}

function Composer({ onSend, disabled }) {
  const [val, setVal] = React.useState("");
  const taRef = React.useRef(null);
  const submit = () => {
    const v = val.trim();
    if (!v) return;
    onSend(v);
    setVal("");
    if (taRef.current) taRef.current.style.height = "auto";
  };
  return (
    <div className="composer">
      <div className="composer-inner">
        <textarea
          ref={taRef}
          rows={1}
          placeholder="Ask anything about this document…"
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(160, e.target.scrollHeight) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
        />
        <button className="send-btn" disabled={!val.trim() || disabled} onClick={submit} title="Send (Enter)">
          <Icon name="send" />
        </button>
        <div className="composer-bar">
          <div className="composer-hint">
            <kbd>↵</kbd> send · <kbd>⇧↵</kbd> newline · answers cite document
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPanel({
  messages, citationStyle, onSendPrompt, onPickSuggestion,
  onCiteClick, busy,
}) {
  const [hover, setHover] = React.useState(null);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const empty = messages.length === 0;

  return (
    <div className={"chat" + (busy ? " is-thinking" : "")}>
      <div className="chat-glow" aria-hidden="true">
        <div className="chat-glow-blob a" />
        <div className="chat-glow-blob b" />
        <div className="chat-glow-blob c" />
      </div>
      <div className="chat-glow-seam" aria-hidden="true" />
      <div className="chat-header">
        <div>
          <div className="chat-title">
            <span className={"chat-title-dot" + (busy ? " thinking" : "")} />
            {busy ? "Thinking…" : "Ask this document"}
          </div>
          <div className="chat-subtitle">Grounded in 6 pages · 24 blocks indexed · 2 figures · 1 table</div>
        </div>
        <div className="chat-header-actions">
          <button className="tb-btn icon" title="New conversation"
                  onClick={() => onPickSuggestion({ reset: true })}>
            <Icon name="clear" />
          </button>
          <button className="tb-btn icon" title="Settings"><Icon name="settings" /></button>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {empty && (
          <div className="chat-empty">
            <div className="chat-welcome">
              <h2>Hi — ask about the cooling whitepaper</h2>
              <p>Foliate has indexed every paragraph, the table on page 4, and both figures. Every answer is grounded with page-level citations you can click to jump to.</p>
            </div>
            <Suggestions onPick={onPickSuggestion} />
          </div>
        )}

        {messages.map((m) =>
          m.role === "user"
            ? <UserMessage key={m.id} msg={m} />
            : <AssistantMessage key={m.id} msg={m}
                citationStyle={citationStyle}
                onCiteHover={(c, anchor) => setHover(c ? { c, anchor } : null)}
                onCiteClick={onCiteClick} />
        )}

        {!empty && !busy && (
          <Suggestions onPick={onPickSuggestion} />
        )}
      </div>

      <Composer onSend={onSendPrompt} disabled={busy} />
      {hover && <CitePreview data={hover.c} anchor={hover.anchor} />}
    </div>
  );
}

Object.assign(window, {
  ChatPanel, PROMPT_LIBRARY, AssistantMessage, UserMessage,
  Suggestions, Composer, MessageSegments, CitePreview,
});
