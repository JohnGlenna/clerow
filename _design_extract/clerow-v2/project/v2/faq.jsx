function FAQ() {
  const [open, setOpen] = React.useState(0);
  const items = [
    { q: "How is Clerow different from regular SEO tools?", a: "Regular SEO ranks you in Google's blue links. Clerow ranks you inside the answers ChatGPT, Claude, and Perplexity actually give. Different surface, different signals, different fixes — and a lot less competition right now." },
    { q: "Will my site really show up in ChatGPT after this?", a: "If you ship the changes in the punch list, yes — usually within 2–6 weeks as the models re-crawl. We can't promise a specific position, but we can promise concrete reasons you're not being cited today." },
    { q: "Do I need a developer to use Clerow?", a: "No. Most fixes are copy changes, new pages, or schema you can paste in. We write the schema for you. If you can edit a Webflow, Framer, or Next.js project, you're fine." },
    { q: "What's with the XP and badges?", a: "Ranking in AI is a slow grind, and most founders give up after week two. The streak counter and quest list are designed to make tiny daily progress feel rewarding, so you keep showing up. It works on us; it works on you." },
    { q: "How often does Clerow re-scan?", a: "Solo plan re-scans weekly. Founder and Agency re-scan daily, plus you can trigger an on-demand scan whenever you ship something." },
    { q: "Can I cancel anytime?", a: "Yes. One click, from settings. No emails to support, no \"are you sure\" survey. If you cancel mid-month you keep access until the period ends." },
  ];

  return (
    <section className="section section--soft">
      <div className="shell">
        <div className="faq-head">
          <div className="section-eyebrow" style={{ marginBottom: 18 }}>
            <span className="ico"><Icon name="help" size={13} /></span>
            FAQ
          </div>
          <h2 className="h-section">Questions, answered.</h2>
          <p className="lede" style={{ margin: "0 auto" }}>
            Can't find what you need? Email{" "}
            <a href="mailto:john@clerow.com" style={{ color: "var(--ink)", borderBottom: "1.5px solid var(--accent)", fontWeight: 700 }}>john@clerow.com</a>.
          </p>
        </div>

        <div className="faq-list">
          {items.map((it, i) => (
            <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{it.q}</span>
                <span className="ind">{open === i ? "−" : "+"}</span>
              </button>
              <div className="faq-a">
                <div className="faq-a-inner">{it.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FAQ });
