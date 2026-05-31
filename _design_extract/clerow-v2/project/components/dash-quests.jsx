/* Quests — the full Duolingo-style conquest path. This is the core loop. */

const QUEST_LEVELS = [
  {
    n: 1, name: "Quick Wins", sub: "The technical basics AI needs to even read you", reward: 60,
    status: "active",
    tasks: [
      { t: "Let AI crawlers in via robots.txt", why: "GPTBot & ClaudeBot were blocked — they literally couldn't read your site.", time: "2 min", xp: 20, done: true },
      { t: "Add an llms.txt file", why: "A plain-text map telling AI what Warbls is and which pages matter.", time: "5 min", xp: 25, done: true },
      { t: "Give your homepage one clear H1", why: "You had 3 competing H1s. AI couldn't tell what you actually do.", time: "3 min", xp: 20, done: false },
      { t: "Write meta descriptions for 8 pages", why: "Missing everywhere — it's often the exact snippet AI quotes back.", time: "8 min", xp: 25, done: false },
    ],
  },
  {
    n: 2, name: "Structure", sub: "Help AI understand every page", reward: 120,
    status: "locked",
    tasks: [
      { t: "Add Product schema (JSON-LD)", time: "15 min", xp: 40 },
      { t: "Add FAQ schema", time: "10 min", xp: 30 },
      { t: "Fix your H2 / H3 hierarchy", time: "12 min", xp: 25 },
      { t: "Add alt text to product images", time: "15 min", xp: 20 },
      { t: "Submit a clean sitemap.xml", time: "5 min", xp: 20 },
      { t: "Add canonical tags", time: "10 min", xp: 25 },
    ],
  },
  {
    n: 3, name: "Content", sub: "Give AI something worth quoting", reward: 200,
    status: "locked",
    tasks: [
      { t: "Publish /compare/warbls-vs-suno", time: "45 min", xp: 80 },
      { t: "Publish /compare/warbls-vs-udio", time: "45 min", xp: 80 },
      { t: "Write a real FAQ answering buyer prompts", time: "40 min", xp: 60 },
      { t: "Add a 'for creators' use-case page", time: "35 min", xp: 50 },
      { t: "Clarify your pricing page copy", time: "15 min", xp: 30 },
    ],
  },
  {
    n: 4, name: "Authority", sub: "Show up in the sources AI actually trusts", reward: 300,
    status: "locked",
    tasks: [
      { t: "Claim your G2 + Capterra listings", time: "30 min", xp: 120 },
      { t: "Answer 3 threads in r/WeAreTheMusicMakers", time: "1 h", xp: 90 },
      { t: "Land a mention from a YouTube creator", time: "outreach", xp: 200 },
      { t: "Expand your Wikidata presence", time: "30 min", xp: 60 },
      { t: "Get 1 guest post / press mention", time: "outreach", xp: 100 },
    ],
  },
];

function PageQuests({ onNavigate }) {
  const [tasks, setTasks] = React.useState(QUEST_LEVELS[0].tasks);
  const [openLevel, setOpenLevel] = React.useState(1);
  const [openWhy, setOpenWhy] = React.useState(2);
  const toggle = (i) => setTasks(tasks.map((t, j) => j === i ? { ...t, done: !t.done } : t));

  const l1done = tasks.filter(t => t.done).length;
  const l1total = tasks.length;
  const l1complete = l1done === l1total;
  const totalFixes = QUEST_LEVELS.reduce((s, l) => s + l.tasks.length, 0);
  const doneFixes = l1done; // only L1 actionable in this proto

  const flip = (n) => setOpenLevel(openLevel === n ? -1 : n);

  return (
    <>
      <PageHead
        title="Quests"
        sub="Your path to getting cited. Do them in order — quick wins first."
      />

      {/* Player progression header */}
      <div className="quest-hero">
        <div className="qhero-avatar"><MascotClerow size={56} float /></div>
        <div className="qhero-main">
          <div className="qhero-rank">
            <span className="qhero-lv">⚡ Level 7</span>
            <span className="qhero-title">SEO Apprentice</span>
            <span className="qhero-next">→ SEO Mage</span>
          </div>
          <div className="qhero-bar"><i style={{ width: "74%" }} /></div>
          <div className="qhero-meta">
            <span className="mono">740 / 1000 XP</span>
            <span>{doneFixes} of {totalFixes} fixes done</span>
          </div>
        </div>
        <div className="qhero-streak">
          <span className="flame">🔥</span>
          <span className="n">12</span>
          <span className="lbl">streak</span>
        </div>
      </div>

      {/* The conquest path */}
      <div className="ladder">
        {QUEST_LEVELS.map((lv) => {
          const isL1 = lv.n === 1;
          const done = isL1 && l1complete;
          const active = isL1 && !l1complete;
          const locked = !isL1;
          const open = openLevel === lv.n;
          const cls = done ? "lvl--done" : active ? "lvl--active" : "lvl--locked";
          const liveTasks = isL1 ? tasks : lv.tasks;
          const ldone = isL1 ? l1done : 0;

          return (
            <div key={lv.n} className={`lvl ${cls}`}>
              <div className="lvl-rail">
                <div className="lvl-node">
                  {done ? <Icon name="check" size={22} /> : locked ? <Icon name="lock" size={18} /> : <span>{lv.n}</span>}
                  {active && <span className="lvl-node-pulse" />}
                </div>
              </div>
              <div className="lvl-body">
                <div className={`lvl-card ${locked ? "lvl-card--locked" : ""}`}>
                  <div className="lvl-card-head lvl-card-head--btn" onClick={() => flip(lv.n)}>
                    <div>
                      <div className="lvl-name">Level {lv.n} · {lv.name}</div>
                      <div className="lvl-sub">{lv.sub}</div>
                    </div>
                    <div className="lvl-head-right">
                      <span className={`lvl-badge ${locked ? "lvl-badge--ghost" : ""}`}>
                        {isL1 ? `${ldone}/${l1total}` : `${lv.tasks.length} tasks`} · +{lv.reward} XP
                      </span>
                      <span className="lvl-chev">{open ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {open && (
                    <div className="lvl-tasks">
                      {liveTasks.map((task, i) => (
                        <div key={i} className={`ltask ${task.done ? "done" : ""} ${locked ? "ltask--upcoming" : ""} ${openWhy === i && isL1 ? "open" : ""}`}>
                          <div className="ltask-row">
                            <span className="ltask-check" onClick={() => !locked && toggle(i)}>
                              {task.done && <Icon name="check" size={13} />}
                              {locked && <Icon name="lock" size={11} />}
                            </span>
                            <div className="ltask-main" onClick={() => isL1 && setOpenWhy(openWhy === i ? -1 : i)}>
                              <div className="ltask-title">{task.t}</div>
                              <div className="ltask-meta">≈ {task.time}</div>
                            </div>
                            <span className="ltask-xp">+{task.xp}</span>
                          </div>
                          {isL1 && openWhy === i && task.why && (
                            <div className="ltask-why">
                              <span className="why-tag">Why this?</span>{task.why}
                              <button className="why-cta">Show me how →</button>
                            </div>
                          )}
                        </div>
                      ))}

                      {locked ? (
                        <div className="lvl-locked-hint" style={{ marginTop: 4 }}>🔒 Clear Level {lv.n - 1} to start these</div>
                      ) : l1complete ? (
                        <div className="lvl-foot lvl-foot--win"><span>🎉 Level 1 cleared! Level 2 is open.</span></div>
                      ) : (
                        <div className="lvl-foot"><span>🎁 Clear all {l1total} to unlock <b>Level 2</b> + a <b>+60 XP</b> bonus.</span></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Re-scan checkpoint */}
        <div className="lvl lvl--checkpoint">
          <div className="lvl-rail">
            <div className="lvl-node lvl-node--flag">🚩</div>
          </div>
          <div className="lvl-body">
            <div className="lvl-card lvl-card--checkpoint">
              <div className="cp-main">
                <div className="lvl-name">Checkpoint · Re-scan</div>
                <div className="lvl-sub">After Level 2, re-scan to bank your gains and reveal a fresh set of fixes.</div>
              </div>
              <button className="btn btn--primary btn--sm" disabled title="Clear Level 2 first">
                <Icon name="bolt" size={14} />Re-scan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones strip — the long game */}
      <h3 className="quest-section-h" style={{ marginTop: 26 }}>
        <span>🏔️ Milestones</span>
        <span className="quest-section-sub">rare · big XP · what veterans chase</span>
      </h3>
      <div className="milestones-grid">
        <Milestone ico="💯" title="Hit visibility score 80" xp={600} progress={18} desc="You're at 18. Levels 1–3 get you most of the way." />
        <Milestone ico="🔥" title="30-day scan streak" xp={300} progress={40} desc="12 days in, 18 to go. Don't break the chain." />
        <Milestone ico="👑" title="Reach #1 in any model" xp={500} progress={8} desc="Closest in ChatGPT — comparison pages do it." />
        <Milestone ico="🌟" title="Cited in all 4 models" xp={700} progress={25} desc="Cited in 1. Authority quests open the rest." />
      </div>
    </>
  );
}

function Milestone({ ico, title, xp, progress, desc }) {
  return (
    <div className="milestone">
      <div className="ms-head">
        <span className="ms-ico">{ico}</span>
        <span className="ms-xp">+{xp} XP</span>
      </div>
      <div className="ms-title">{title}</div>
      <div className="ms-desc">{desc}</div>
      <div className="ms-progress"><i style={{ width: `${progress}%` }} /></div>
      <div className="ms-progress-l">{progress}% there</div>
    </div>
  );
}

Object.assign(window, { PageQuests });
