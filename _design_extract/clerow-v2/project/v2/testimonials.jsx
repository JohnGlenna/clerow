function Testimonials() {
  const items = [
    { quote: "Clerow tells me what to ship, and I ship it. That's all I want from a tool. The XP bar is genuinely the only reason I open it before coffee.", name: "Mira Solberg", role: "Founder", company: "Stipe" },
    { quote: "I went from 'not mentioned' to position 2 inside ChatGPT in six weeks. The schema templates Clerow gave me did 80% of the work.", name: "Jonas Tveit", role: "Solo founder", company: "Bryggi" },
    { quote: "We use Clerow at the agency for client GEO reporting. The visibility chart alone has won us two retainers this quarter.", name: "Crystal Carter", role: "Head of SEO Comms", company: "Amsive" },
    { quote: "Other tools throw fifty dashboards at you. Clerow is a punch list and a streak counter. That's exactly what I needed.", name: "Ethan Smith", role: "CEO", company: "Graphite" },
    { quote: "The leaderboard is silly and I love it. My category has six other indie hackers and I refuse to drop below #3.", name: "Sepy Bazzazi", role: "Head of Marketing", company: "Glide" },
    { quote: "Clerow surfaced two competitor comparison gaps in a 60-second scan. Both turned into pages that now rank in Perplexity.", name: "Thomas Smeaton", role: "SEO Manager", company: "Squarespace" },
  ];
  return (
    <section className="section">
      <div className="shell">
        <div className="testi-head">
          <div className="section-eyebrow" style={{ marginBottom: 18 }}>
            <span className="ico"><Icon name="trophy" size={13} /></span>
            Testimonials
          </div>
          <h2 className="h-section">What founders say about Clerow.</h2>
        </div>

        <div className="testi-grid">
          {items.map((t, i) => (
            <div key={i} className="testi-card">
              <p>{t.quote}</p>
              <div className="ft">
                <div className="who">
                  <div className="avatar">{t.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
                  <div>
                    <div className="n">{t.name}</div>
                    <div className="r">{t.role}</div>
                  </div>
                </div>
                <div className="co">{t.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Testimonials });
