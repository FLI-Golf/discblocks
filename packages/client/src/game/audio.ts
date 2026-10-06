const CHAINS_URL = encodeURI('/audio/disc golf chains.mp3');

let chains: HTMLAudioElement | null = null;

/** Chain rattle for a made putt. Lazily created so it is never built server-side. */
export function playChains() {
  if (!chains) {
    chains = new Audio(CHAINS_URL);
    chains.volume = 0.8;
  }

  chains.currentTime = 0;
  // Autoplay can still be blocked until the first gesture; a missed sound is not fatal.
  void chains.play().catch(() => {});
}
