/* Clerow — task "lesson" sheet (DIY vs MCP) + app shell */

function LessonSheet({ task, onClose }) {
  const [sel, setSel] = React.useState(task.isMcp ? "mcp" : task.isRescan ? "rescan" : null);
  const [view, setView] = React.useState("choose"); // choose | steps | share | done
  const [copied, setCopied] = React.useState(false);

  const cmd = task.cmd || 'Clerow: read my open Level 1 quests for warbls.com, ship the fixes as a PR, and re-check all 4 AI models when done.';
  const copy = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(cmd); } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  // ---- DONE ----
  if (view === "done") {
    return (
      <div className="sheet-back">
        <Lessonchrome task={task} />
        <div className="done-toast">
          <div className="done-toast-in">
            <div className="done-check">✓</div>
            <div>
              <div className="dt-t">{task.isRescan ? "Scanning all 4 models…" : "Nice! Quest cleared"}</div>
              <div className="dt-s">{task.isRescan ? "Querying ChatGPT · Claude · Perplexity · Gemini" : `+${task.xp || 20} XP · streak kept 🔥`}</div>
            </div>
            <button className="btn-check" onClick={onClose}>Continue</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- STEPS (do it myself) ----
  if (view === "steps") {
    return (
      <div className="sheet-back">
        <div className="lesson-top">
          <button className="lesson-x" onClick={onClose}>✕</button>
          <div className="lesson-prog"><i style={{ width: "80%" }} /></div>
          <span className="lesson-heart">🛠️ DIY</span>
        </div>
        <div className="lesson-body">
          <div className="lesson-inner">
            <div className="lesson-tag"><span className="dot"><LDIcon name="book" /></span>Step-by-step</div>
            <h1 className="lesson-h">{task.title}</h1>
            <ol className="step-list">
              {(task.steps || ["We'll have a guide here shortly."]).map((s, i) => (
                <li key={i} className="step"><span className="step-num">{i + 1}</span><span className="step-t">{s}</span></li>
              ))}
            </ol>
            <div className="step-tip">💡 Stuck? Tap <b>back</b> and let Clerow MCP ship it for you.</div>
          </div>
        </div>
        <div className="lesson-foot">
          <div className="lesson-foot-in">
            <button className="btn-skip" onClick={() => setView("choose")}>← Back</button>
            <button className="btn-check" onClick={() => setView("done")}>Mark done ✓</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- SHARE (let MCP do it) ----
  const sharePop = view === "share" ? (
    <div className="share-pop-back" onClick={() => setView("choose")}>
      <div className="share-pop" onClick={(e) => e.stopPropagation()}>
        <div className="sp-ic">🤖</div>
        <h3>Share with your AI agent</h3>
        <p className="sp-sub">Paste this into Claude Code, Cursor, or any agent connected to Clerow MCP.</p>
        <div className="share-box">{cmd}</div>
        <button className="btn-violet" onClick={copy}>{copied ? "Copied ✓" : "Copy command"}</button>
        <div className="sp-note">Nothing happens? Your agent probably isn't connected yet — run <code>clerow mcp connect</code> once.</div>
        <div className="sp-foot">
          <span>Clerow ticks it off automatically when the fix lands.</span>
          <button className="sp-manual" onClick={() => setView("done")}>I'll mark it done</button>
        </div>
      </div>
    </div>
  ) : null;

  // ---- CHOOSE ----
  const footLabel = sel === "diy" ? "See steps"
    : sel === "mcp" ? "Share with AI"
    : task.isRescan ? "Re-scan" : "Continue";
  const onFoot = () => {
    if (sel === "diy") setView("steps");
    else if (sel === "mcp") setView("share");
    else if (task.isRescan) setView("done");
  };

  return (
    <div className="sheet-back">
      <div className="lesson-top">
        <button className="lesson-x" onClick={onClose}>✕</button>
        <div className="lesson-prog"><i style={{ width: task.done ? "100%" : "55%" }} /></div>
        <span className="lesson-heart">📊 5 models</span>
      </div>

      <div className="lesson-body">
        <div className="lesson-inner">
          <div className="lesson-tag">
            <span className="dot"><LDIcon name={task.isMcp ? "bolt" : "check"} /></span>{task.tag}
          </div>
          <h1 className="lesson-h">{task.title}</h1>
          <p className="lesson-why">{task.why}</p>
          <div className="lesson-evi"><span className="em">🔎</span><span className="t"><b>What the scan found:</b> {task.evi}</span></div>

          {task.isRescan ? (
            <button className={`opt ${sel === "rescan" ? "on" : ""}`} onClick={() => setSel("rescan")}>
              <span className="oic">🚩</span>
              <div><div className="ot">Re-scan now</div><div className="od">Clerow re-queries all 4 AI models and recomputes your score. ~60s.</div></div>
            </button>
          ) : task.isMcp ? (
            <button className="opt violet on" onClick={() => setSel("mcp")}>
              <span className="oic">🤖</span>
              <div><div className="ot">Connect Clerow MCP</div><div className="od">Your agent reads every open quest and ships the fixes. Clerow verifies across all models.</div></div>
              <span className="obadge">Autopilot</span>
            </button>
          ) : (
            <>
              <div className="lesson-choose">How do you want to fix this?</div>
              <button className={`opt ${sel === "diy" ? "on" : ""}`} onClick={() => setSel("diy")}>
                <span className="onum">1</span><span className="oic">🛠️</span>
                <div><div className="ot">I'll do it myself</div><div className="od">Get the step-by-step guide + exact code. ≈ {task.diyTime || "3 min"}.</div></div>
              </button>
              <button className={`opt violet ${sel === "mcp" ? "on" : ""}`} onClick={() => setSel("mcp")}>
                <span className="onum">2</span><span className="oic">🤖</span>
                <div><div className="ot">Let Clerow MCP do it</div><div className="od">Share a command with your AI agent — it ships the fix, Clerow re-checks all 4 models.</div></div>
                <span className="obadge">Autopilot</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="lesson-foot">
        <div className="lesson-foot-in">
          <button className="btn-skip" onClick={onClose}>Skip</button>
          <button className="btn-check" disabled={!sel} onClick={onFoot}>{footLabel}</button>
        </div>
      </div>
      {sharePop}
    </div>
  );
}

/* faded chrome behind the done-toast */
function Lessonchrome({ task }) {
  return (
    <div className="lesson-body" style={{ opacity: 0.35, filter: "blur(2px)" }}>
      <div className="lesson-inner">
        <div className="lesson-tag"><span className="dot"><LDIcon name="check" /></span>{task.tag}</div>
        <h1 className="lesson-h">{task.title}</h1>
        <p className="lesson-why">{task.why}</p>
      </div>
    </div>
  );
}

function App() {
  const [task, setTask] = React.useState(null);
  const [page, setPage] = React.useState("learn");
  const hasRail = page === "learn";
  const goLearn = () => setPage("learn");

  return (
    <div className={`ld-shell ${hasRail ? "" : "ld-shell--norail"}`}>
      <LearnNav page={page} onNav={setPage} />
      <div className="ld-center">
        <LearnTop />
        {page === "learn"   && <LearnPath onOpen={(t) => t && setTask(t)} />}
        {page === "prompts" && <PagePrompts onLearn={goLearn} />}
        {page === "models"  && <PageModels onLearn={goLearn} />}
        {page === "leaderboard" && <PageLeaderboard />}
        {page === "scan"    && <PageScan onScan={() => setTask(TASKS.rescan)} />}
        {page === "profile" && <PageProfile />}
      </div>
      {hasRail && <LearnRail onConnect={() => setTask(TASKS.mcp)} />}
      {task && <LessonSheet task={task} onClose={() => setTask(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
