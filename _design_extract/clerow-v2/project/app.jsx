/* Hash-router app for: landing → signup modal → onboarding → dashboard */

const SCREENS = ["landing", "onboarding", "dashboard"];

function useHash() {
  const [hash, setHash] = React.useState(
    typeof window !== "undefined" ? window.location.hash || "#/" : "#/"
  );
  React.useEffect(() => {
    const fn = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return [hash, (h) => { window.location.hash = h; }];
}

function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [hash, setHash] = useHash();
  const [authMode, setAuthMode] = React.useState(null); // null | "signin" | "signup"
  const [pendingUrl, setPendingUrl] = React.useState(""); // URL typed on landing, carried into onboarding

  // Apply accent immediately + on change
  React.useEffect(() => {
    document.documentElement.setAttribute("data-accent", tweaks.accent || "amber");
  }, [tweaks.accent]);

  // Allow Tweaks to jump straight to any screen for review
  React.useEffect(() => {
    const s = tweaks.startScreen;
    if (!s || s === "landing") return;
    if (s === "onboarding" && !hash.startsWith("#/onboarding")) setHash("#/onboarding/1");
    if (s === "dashboard" && hash !== "#/dashboard") setHash("#/dashboard");
    if (s === "signup" && !authMode) setAuthMode("signup");
    // eslint-disable-next-line
  }, [tweaks.startScreen]);

  const showMascot = tweaks.showMascot !== false;

  let view;
  if (hash.startsWith("#/onboarding")) {
    const step = parseInt(hash.split("/")[2] || "1", 10);
    view = (
      <Onboarding
        step={step}
        initialUrl={pendingUrl}
        onStep={(n) => setHash(`#/onboarding/${n}`)}
        onDone={() => setHash("#/dashboard")}
        showMascot={showMascot}
      />
    );
  } else if (hash.startsWith("#/dashboard")) {
    const sub = hash.split("/")[2] || "overview";
    view = (
      <AppDashboard
        page={sub}
        showMascot={showMascot}
        freemium={tweaks.freemium !== false}
        onNavigate={(p) => setHash(p === "overview" ? "#/dashboard" : `#/dashboard/${p}`)}
        onSignOut={() => setHash("#/")}
      />
    );
  } else {
    view = (
      <Landing
        showMascot={showMascot}
        onScanRequest={(url) => {
          setPendingUrl(url || "");
          setAuthMode("signup");
        }}
        onSignup={() => setAuthMode("signup")}
        onSignin={() => setAuthMode("signin")}
      />
    );
  }

  return (
    <>
      {view}
      {authMode && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          showMascot={showMascot}
          pendingUrl={pendingUrl}
          onClose={() => setAuthMode(null)}
          onSubmit={() => {
            setAuthMode(null);
            setHash("#/onboarding/1");
          }}
        />
      )}

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
        <TweakSection label="Preview">
          <TweakSelect
            label="Jump to screen"
            value={tweaks.startScreen || "landing"}
            options={[
              { value: "landing", label: "Landing page" },
              { value: "signup",  label: "Signup modal" },
              { value: "onboarding", label: "Onboarding" },
              { value: "dashboard",  label: "Dashboard" },
            ]}
            onChange={(v) => setTweak("startScreen", v)}
          />
          <TweakToggle
            label="Show mascot"
            value={showMascot}
            onChange={(v) => setTweak("showMascot", v)}
          />
          <TweakToggle
            label="Freemium gating"
            value={tweaks.freemium !== false}
            onChange={(v) => setTweak("freemium", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
