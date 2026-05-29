# Clerow Mobile

The Clerow iOS/Android companion app (Expo + Expo Router + TypeScript), implementing the
**Clerow iOS App** design handoff (`_design` / Claude Design bundle).

## Run

```bash
# from the repo root
npm install
npm run mobile:start          # or: npm run start --workspace=clerow-mobile

# then press `i` (iOS simulator), `a` (Android), or scan the QR with Expo Go
```

## Structure

File-based routing under `app/`:

```
app/
  _layout.tsx          Root stack + Nunito font loading + splash
  index.tsx            Redirects to /onboarding
  onboarding.tsx       3-slide welcome carousel (Ask → Score → Climb)
  auth.tsx             Sign in — Google / Apple / email
  scan/
    index.tsx          Paste URL
    scanning.tsx       Animated scan (auto-advances to results)
    results.tsx        Free visibility score + ranking
  (tabs)/
    _layout.tsx        Floating glass tab bar
    home.tsx           Streak, score ring, today's quests, model snapshot
    prompts.tsx        Discovered prompts + invisible-row quests
    quests.tsx         XP/level, daily quests, active quest, milestone
    rank.tsx           Category leaderboard
    you.tsx            Profile, achievements, settings (links to sub-pages)
  sources.tsx          Citation-source gaps
  models.tsx           Per-AI-model cards (Gemini gated)
  reports.tsx          Weekly report + Clerow Wrapped share card
  paywall.tsx          Plan picker (transparent modal)

components/            Mascot, ScoreRing, Button, icons, Header, tab bar, ...
theme/tokens.ts        Design tokens ported from the design's ios-app.css
```

## Design notes

- **Colours / type** mirror the design system: black / white / dark-blue (`#1E4F6B`),
  Nunito (loaded via `@expo-google-fonts/nunito`). Numbers use the platform monospace
  font as a stand-in for Geist Mono — swap in `@expo-google-fonts/geist-mono` if desired.
- The HTML prototype's device frame (status bar, dynamic island, home indicator) is
  intentionally dropped — those are provided by the real OS. Screens are safe-area aware.
- Several flows are wired interactively (onboarding swipe, scan auto-advance, quest
  toggles, plan selection) but use mock data — no backend is connected yet.
