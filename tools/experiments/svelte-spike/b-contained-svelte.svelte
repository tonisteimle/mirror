<script>
  let playing = false;
  let favorited = false;
  let progress = 38;

  const track = {
    title: "Weightless",
    artist: "Marconi Union",
    album: "Weightless",
    duration: 480,
  };

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  let elapsed = Math.round((progress / 100) * track.duration);
  let remaining = track.duration - elapsed;

  function togglePlay() {
    playing = !playing;
  }

  function toggleFavorite() {
    favorited = !favorited;
  }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    progress = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    elapsed = Math.round((progress / 100) * track.duration);
    remaining = track.duration - elapsed;
  }
</script>

<div class="player">
  <div class="art-wrap">
    <div class="art">
      <svg class="art-svg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
        <rect width="240" height="240" fill="#0d0d0d"/>
        <circle cx="120" cy="120" r="88" fill="none" stroke="#1a1a1a" stroke-width="1"/>
        <circle cx="120" cy="120" r="64" fill="none" stroke="#1a1a1a" stroke-width="1"/>
        <circle cx="120" cy="120" r="40" fill="none" stroke="#1a1a1a" stroke-width="1"/>
        <circle cx="120" cy="120" r="16" fill="none" stroke="#222" stroke-width="1"/>
        <path d="M120 32 Q156 76 120 120 Q84 76 120 32Z" fill="#1c1c1c"/>
        <path d="M208 120 Q164 156 120 120 Q164 84 208 120Z" fill="#161616"/>
        <path d="M120 208 Q84 164 120 120 Q156 164 120 208Z" fill="#1a1a1a"/>
        <path d="M32 120 Q76 84 120 120 Q76 156 32 120Z" fill="#131313"/>
        <circle cx="120" cy="120" r="10" fill="#0a0a0a" stroke="#222" stroke-width="1"/>
      </svg>
    </div>
    <div class="art-label">
      <span class="art-label-text">NOW PLAYING</span>
    </div>
  </div>

  <div class="meta">
    <span class="title">{track.title}</span>
    <span class="artist">{track.artist}</span>
  </div>

  <div class="progress-area" on:click={seek}>
    <div class="track-bar">
      <div class="track-fill" style="--pct: {progress}%"></div>
      <div class="track-thumb" style="--pct: {progress}%"></div>
    </div>
    <div class="times">
      <span class="time">{formatTime(elapsed)}</span>
      <span class="time">−{formatTime(remaining)}</span>
    </div>
  </div>

  <div class="controls">
    <button class="ctrl-btn ctrl-skip">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="19 20 9 12 19 4 19 20"/>
        <line x1="5" y1="19" x2="5" y2="5"/>
      </svg>
    </button>
    <button class="ctrl-btn ctrl-play" on:click={togglePlay}>
      {#if playing}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      {:else}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      {/if}
    </button>
    <button class="ctrl-btn ctrl-skip">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4"/>
        <line x1="19" y1="5" x2="19" y2="19"/>
      </svg>
    </button>
  </div>

  <div class="actions">
    <button class="action-btn" on:click={toggleFavorite}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? "#c084fc" : "none"} stroke={favorited ? "#c084fc" : "currentColor"} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      <span class="action-label">{favorited ? "Liked" : "Like"}</span>
    </button>
    <button class="action-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
      <span class="action-label">Queue</span>
    </button>
    <button class="action-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      <span class="action-label">Share</span>
    </button>
  </div>
</div>

<style>
  :root {
    --bg: #0f0f0f;
    --surface: #141414;
    --border: #222222;
    --muted: #555555;
    --text: #e8e8e8;
    --accent: #c084fc;
    --accent-dim: #7c3aed22;
  }

  .player {
    display: flex;
    flex-direction: column;
    width: 280px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  }

  .art-wrap {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 280px;
    height: 280px;
  }

  .art {
    display: flex;
    width: 280px;
    height: 280px;
  }

  .art-svg {
    display: flex;
    width: 280px;
    height: 280px;
  }

  .art-label {
    display: flex;
    position: absolute;
    top: 16px;
    left: 16px;
    background: var(--accent-dim);
    border: 1px solid #7c3aed44;
    border-radius: 2px;
    padding: 3px 8px;
  }

  .art-label-text {
    display: flex;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 2px;
    color: var(--accent);
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 20px 20px 0px 20px;
  }

  .title {
    display: flex;
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .artist {
    display: flex;
    font-size: 12px;
    font-weight: 400;
    color: var(--muted);
    letter-spacing: 0.2px;
  }

  .progress-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px 20px 0px 20px;
    cursor: pointer;
  }

  .track-bar {
    display: flex;
    position: relative;
    height: 2px;
    background: var(--border);
    border-radius: 2px;
  }

  .track-fill {
    display: flex;
    position: absolute;
    left: 0;
    top: 0;
    height: 2px;
    width: var(--pct);
    background: var(--accent);
    border-radius: 2px;
  }

  .track-thumb {
    display: flex;
    position: absolute;
    top: -4px;
    left: var(--pct);
    width: 10px;
    height: 10px;
    background: var(--text);
    border-radius: 50%;
    transform: translateX(-5px);
  }

  .times {
    display: flex;
    justify-content: space-between;
  }

  .time {
    display: flex;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.3px;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 20px 16px 20px;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: 2px;
    padding: 8px;
  }

  .ctrl-btn:hover {
    color: var(--text);
  }

  .ctrl-play {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    background: var(--text);
    border: none;
    border-radius: 50%;
    color: var(--bg);
    cursor: pointer;
    margin: 0 12px;
    padding: 0;
  }

  .ctrl-play:hover {
    background: var(--accent);
    color: var(--bg);
  }

  .ctrl-play:active {
    background: #a855f7;
  }

  .actions {
    display: flex;
    border-top: 1px solid var(--border);
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex: 1;
    padding: 14px 8px;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
  }

  .action-btn:hover {
    color: var(--text);
    background: #ffffff08;
  }

  .action-label {
    display: flex;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
</style>
