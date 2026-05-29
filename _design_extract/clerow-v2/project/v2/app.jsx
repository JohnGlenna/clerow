function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-accent", tweaks.accent || "amber");
  }, [tweaks.accent]);

  const showMascot = tweaks.showMascot !== false;
  const showGame   = tweaks.showGamification !== false;

  return (
    <>
      <Nav showMascot={showMascot} />
      <Hero />
      <Dashboard />
      <Logos />
      <Metrics />
      {showGame && <Gamification showMascot={showMascot} />}
      <Features />
      <Testimonials />
      <FAQ />
      <FinalCTA showMascot={showMascot} />
      <Footer showMascot={showMascot} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand">
          <TweakSelect
            label="Accent"
            value={tweaks.accent}
            options={[
              { value: "amber",   label: "Amber (default)" },
              { value: "indigo",  label: "Indigo" },
              { value: "emerald", label: "Emerald" },
              { value: "rose",    label: "Rose" },
            ]}
            onChange={(v) => setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection label="Display">
          <TweakToggle label="Show mascot" value={showMascot} onChange={(v) => setTweak("showMascot", v)} />
          <TweakToggle label="Show gamification" value={showGame} onChange={(v) => setTweak("showGamification", v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
