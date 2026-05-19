// app.jsx — top-level App, state, divider, tweaks wiring.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "citationStyle": "inline",
  "panelPosition": "right",
  "splitRatio": 60,
  "zoom": 0.9
}/*EDITMODE-END*/;

let __MSG_ID = 1;
const nextId = () => "m" + (__MSG_ID++);

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [currentPage, setCurrentPage] = React.useState(0);
  const [highlightedBlock, setHighlightedBlock] = React.useState(null);
  const [highlightSeq, setHighlightSeq] = React.useState(0); // re-trigger pulse animation
  const [jumpSeq, setJumpSeq] = React.useState(null);
  const [messages, setMessages] = React.useState(() => seedMessages());
  const [busy, setBusy] = React.useState(false);

  const scrollContainerRef = React.useRef(null);
  const blockRegistry = React.useRef({}); // id -> ref

  const registerBlock = React.useCallback((id, ref) => {
    blockRegistry.current[id] = ref;
  }, []);

  // ── Citation click: jump to page + flash block ──────────────────────
  const onCiteClick = React.useCallback((citation) => {
    const { page, blockId } = citation;
    // Jump to page
    const el = scrollContainerRef.current;
    if (el) {
      const pages = el.querySelectorAll(".page");
      const target = pages[page];
      if (target) el.scrollTo({ top: target.offsetTop - 24, behavior: "smooth" });
    }
    // After scroll settles, flash the block (use a setTimeout so layout has caught up)
    setTimeout(() => {
      setHighlightedBlock(blockId);
      setHighlightSeq((n) => n + 1);
      const ref = blockRegistry.current[blockId]?.current;
      if (ref) {
        ref.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      // auto-fade after a while
      setTimeout(() => setHighlightedBlock((b) => (b === blockId ? null : b)), 4200);
    }, 350);
  }, []);

  // ── Sending a prompt ────────────────────────────────────────────────
  const sendPrompt = React.useCallback((text) => {
    const userMsg = { id: nextId(), role: "user", text };
    // Try to match a scripted answer (by question similarity), else use a generic one
    const matched =
      PROMPT_LIBRARY.find((p) => p.q.toLowerCase() === text.toLowerCase()) ||
      PROMPT_LIBRARY.find((p) =>
        text.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
          .some((w) => p.q.toLowerCase().includes(w))
      );
    const answer = matched ? matched.a : genericAnswer(text);

    const asstId = nextId();
    const asstMsg = {
      id: asstId,
      role: "assistant",
      reasoning: answer.reasoning,
      reasoningShown: [],
      segments: answer.segments,
      citations: answer.citations,
      confidence: answer.confidence,
      streaming: true,
      streamDone: false,
      streamedText: "",
    };
    setMessages((ms) => [...ms, userMsg, asstMsg]);
    setBusy(true);

    // Stream reasoning steps first, then "stream" the answer text
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx++;
      setMessages((ms) =>
        ms.map((m) =>
          m.id === asstId
            ? { ...m, reasoningShown: answer.reasoning.slice(0, stepIdx) }
            : m
        )
      );
      if (stepIdx >= answer.reasoning.length) {
        clearInterval(stepInterval);
        // Begin streaming the body
        const fullText = answer.segments
          .map((s) => (typeof s === "string" ? s : s.strong ? s.strong : ""))
          .join("");
        let i = 0;
        const chunk = Math.max(2, Math.floor(fullText.length / 35));
        const textInterval = setInterval(() => {
          i = Math.min(fullText.length, i + chunk);
          setMessages((ms) =>
            ms.map((m) =>
              m.id === asstId ? { ...m, streamedText: fullText.slice(0, i) } : m
            )
          );
          if (i >= fullText.length) {
            clearInterval(textInterval);
            setMessages((ms) =>
              ms.map((m) =>
                m.id === asstId
                  ? { ...m, streaming: false, streamDone: true }
                  : m
              )
            );
            setBusy(false);
            // Auto-highlight the first cited block briefly
            if (answer.citations[0]) {
              setTimeout(() => {
                const c = answer.citations[0];
                setHighlightedBlock(c.blockId);
                setHighlightSeq((n) => n + 1);
                setTimeout(() => setHighlightedBlock((b) => (b === c.blockId ? null : b)), 3000);
              }, 200);
            }
          }
        }, 35);
      }
    }, 320);
  }, []);

  const onPickSuggestion = React.useCallback((p) => {
    if (p.reset) {
      setMessages([]);
      setBusy(false);
      return;
    }
    sendPrompt(p.q);
  }, [sendPrompt]);

  // ── Divider drag ────────────────────────────────────────────────────
  const dividerRef = React.useRef(null);
  React.useEffect(() => {
    const div = dividerRef.current;
    if (!div) return;
    let dragging = false;
    const onDown = (e) => {
      dragging = true;
      div.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.clientX;
      const w = window.innerWidth;
      let pct = (x / w) * 100;
      if (t.panelPosition === "left") pct = 100 - pct;
      pct = Math.max(28, Math.min(78, pct));
      setTweak("splitRatio", Math.round(pct));
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      div.classList.remove("dragging");
      document.body.style.cursor = "";
    };
    div.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      div.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [t.panelPosition, setTweak]);

  // ── Keyboard nav ────────────────────────────────────────────────────
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j") {
        e.preventDefault();
        scrollPage(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k") {
        e.preventDefault();
        scrollPage(-1);
      }
    };
    const scrollPage = (dir) => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const pages = el.querySelectorAll(".page");
      const next = Math.max(0, Math.min(pages.length - 1, currentPage + dir));
      if (pages[next]) el.scrollTo({ top: pages[next].offsetTop - 24, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage]);

  const viewerFrac = `${t.splitRatio}fr`;
  const chatFrac = `${100 - t.splitRatio}fr`;

  return (
    <div className="app">
      <ViewerToolbar
        currentPage={currentPage}
        totalPages={DOC_PAGES.length}
        onJumpPage={(idx) => {
          const el = scrollContainerRef.current;
          if (!el) return;
          const pages = el.querySelectorAll(".page");
          if (pages[idx]) el.scrollTo({ top: pages[idx].offsetTop - 24, behavior: "smooth" });
        }}
        zoom={t.zoom}
        setZoom={(z) => setTweak("zoom", z)}
        panelPosition={t.panelPosition}
        citationStyle={t.citationStyle}
      />
      <div
        className={"main " + t.panelPosition}
        style={{
          "--viewer-frac": viewerFrac,
          "--chat-frac": chatFrac,
        }}
      >
        {t.panelPosition === "right" ? (
          <>
            <Viewer
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              highlightedBlock={highlightedBlock + ":" + highlightSeq}
              registerBlock={registerBlock}
              zoom={t.zoom}
              scrollContainerRef={scrollContainerRef}
              jumpSeq={jumpSeq}
            />
            <div className="divider" ref={dividerRef} />
            <ChatPanel
              messages={messages}
              citationStyle={t.citationStyle}
              onSendPrompt={sendPrompt}
              onPickSuggestion={onPickSuggestion}
              onCiteClick={onCiteClick}
              busy={busy}
            />
          </>
        ) : (
          <>
            <ChatPanel
              messages={messages}
              citationStyle={t.citationStyle}
              onSendPrompt={sendPrompt}
              onPickSuggestion={onPickSuggestion}
              onCiteClick={onCiteClick}
              busy={busy}
            />
            <div className="divider" ref={dividerRef} />
            <Viewer
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              highlightedBlock={highlightedBlock + ":" + highlightSeq}
              registerBlock={registerBlock}
              zoom={t.zoom}
              scrollContainerRef={scrollContainerRef}
              jumpSeq={jumpSeq}
            />
          </>
        )}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Citation style" />
        <TweakRadio
          label="Style"
          value={t.citationStyle}
          options={[
            { value: "inline",     label: "Inline" },
            { value: "cards",      label: "Cards" },
            { value: "highlights", label: "Dots" },
          ]}
          onChange={(v) => setTweak("citationStyle", v)}
        />
        <p style={{ fontSize: 10.5, color: "rgba(41,38,27,.55)", margin: "2px 0 0", lineHeight: 1.4 }}>
          {t.citationStyle === "inline" && "Numbered chips inside the prose — compact, scannable."}
          {t.citationStyle === "cards" && "Numbered prose chips PLUS expanded source cards under each answer."}
          {t.citationStyle === "highlights" && "Subtle dot markers; hover or click to preview. Most minimal."}
        </p>

        <TweakSection label="Layout" />
        <TweakRadio
          label="Chat side"
          value={t.panelPosition}
          options={[
            { value: "right", label: "Right" },
            { value: "left",  label: "Left" },
          ]}
          onChange={(v) => setTweak("panelPosition", v)}
        />
        <TweakSlider
          label="Viewer width"
          value={t.splitRatio} min={30} max={75} step={1} unit="%"
          onChange={(v) => setTweak("splitRatio", v)}
        />
        <TweakSlider
          label="Page zoom"
          value={Math.round(t.zoom * 100)} min={60} max={140} step={5} unit="%"
          onChange={(v) => setTweak("zoom", v / 100)}
        />
      </TweaksPanel>
    </div>
  );
}

// ── Seed conversation so the demo opens with content ─────────────────
function seedMessages() {
  const a = PROMPT_LIBRARY[0].a;
  return [
    { id: nextId(), role: "user", text: PROMPT_LIBRARY[0].q },
    {
      id: nextId(),
      role: "assistant",
      reasoning: a.reasoning,
      reasoningShown: a.reasoning,
      segments: a.segments,
      citations: a.citations,
      confidence: a.confidence,
      streaming: false,
      streamDone: true,
    },
  ];
}

function genericAnswer(text) {
  return {
    reasoning: [
      "Embedding query…",
      "Retrieving top-k chunks from 24 indexed blocks.",
      "Reranking by relevance + extraction confidence.",
      "Drafting grounded response.",
    ],
    segments: [
      "I couldn't find a strong direct match for that in the indexed document. The whitepaper covers the cooling architecture (§2, p.3), per-rack thermal envelopes (Table 1, p.4), throughput vs. flow rate (Figure 3, p.5), and the adaptive flow policy",
      { cite: 1 },
      ". Try one of the suggested questions below, or rephrase to point at a specific section.",
    ],
    citations: [
      { page: 0, blockId: "p1-abstract", label: "Abstract, p.1", snippet: "Modern accelerator deployments routinely exceed 40 kW per rack..." },
    ],
    confidence: 0.45,
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
