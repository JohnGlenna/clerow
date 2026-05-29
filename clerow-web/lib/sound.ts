// Tiny UI sound effects. Currently just the satisfying "check" chime when a user
// completes a quest — part of the gamification feedback loop. Lazily constructs a
// single reusable <audio> and swallows autoplay/SSR errors so a blocked sound
// never breaks the interaction.

let checkAudio: HTMLAudioElement | null = null;

export function playCheck(): void {
  if (typeof Audio === "undefined") return; // SSR / non-browser
  try {
    if (!checkAudio) checkAudio = new Audio("/assets/check.mp3");
    checkAudio.currentTime = 0;
    void checkAudio.play().catch(() => {});
  } catch {
    // Autoplay policy or missing asset — feedback sound is non-essential.
  }
}
