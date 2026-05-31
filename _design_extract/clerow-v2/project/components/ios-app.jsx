/* Clerow iOS — design canvas layout of every screen */

const DEV_W = 402, DEV_H = 874;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="onb" title="Onboarding & Sign-in" subtitle="First run">
        <DCArtboard id="onb1" label="Onboarding · 1" width={DEV_W} height={DEV_H}><IOSDevice><ScreenOnboarding idx={0} /></IOSDevice></DCArtboard>
        <DCArtboard id="onb2" label="Onboarding · 2" width={DEV_W} height={DEV_H}><IOSDevice><ScreenOnboarding idx={1} /></IOSDevice></DCArtboard>
        <DCArtboard id="onb3" label="Onboarding · 3" width={DEV_W} height={DEV_H}><IOSDevice><ScreenOnboarding idx={2} /></IOSDevice></DCArtboard>
        <DCArtboard id="auth" label="Sign up / in"   width={DEV_W} height={DEV_H}><IOSDevice><ScreenAuth /></IOSDevice></DCArtboard>
      </DCSection>

      <DCSection id="scan" title="Scan flow" subtitle="URL → discover prompts → score">
        <DCArtboard id="scan1" label="Paste URL"    width={DEV_W} height={DEV_H}><IOSDevice><ScreenScan /></IOSDevice></DCArtboard>
        <DCArtboard id="scan2" label="Scanning"     width={DEV_W} height={DEV_H}><IOSDevice><ScreenScanning /></IOSDevice></DCArtboard>
        <DCArtboard id="scan3" label="Free results" width={DEV_W} height={DEV_H}><IOSDevice><ScreenResults /></IOSDevice></DCArtboard>
      </DCSection>

      <DCSection id="app" title="Main app" subtitle="Home + insight tabs">
        <DCArtboard id="home"    label="Home"      width={DEV_W} height={DEV_H}><IOSDevice><ScreenHome /></IOSDevice></DCArtboard>
        <DCArtboard id="prompts" label="Prompts"   width={DEV_W} height={DEV_H}><IOSDevice><ScreenPrompts /></IOSDevice></DCArtboard>
        <DCArtboard id="sources" label="Sources"   width={DEV_W} height={DEV_H}><IOSDevice><ScreenSources /></IOSDevice></DCArtboard>
        <DCArtboard id="models"  label="AI Models" width={DEV_W} height={DEV_H}><IOSDevice><ScreenModels /></IOSDevice></DCArtboard>
      </DCSection>

      <DCSection id="game" title="Gamification & account" subtitle="The retention loop">
        <DCArtboard id="quests"  label="Quests"      width={DEV_W} height={DEV_H}><IOSDevice><ScreenQuests /></IOSDevice></DCArtboard>
        <DCArtboard id="rank"    label="Leaderboard" width={DEV_W} height={DEV_H}><IOSDevice><ScreenLeaderboard /></IOSDevice></DCArtboard>
        <DCArtboard id="reports" label="Reports"     width={DEV_W} height={DEV_H}><IOSDevice><ScreenReports /></IOSDevice></DCArtboard>
        <DCArtboard id="profile" label="Profile"     width={DEV_W} height={DEV_H}><IOSDevice><ScreenProfile /></IOSDevice></DCArtboard>
        <DCArtboard id="paywall" label="Paywall"     width={DEV_W} height={DEV_H}><IOSDevice><ScreenPaywall /></IOSDevice></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
