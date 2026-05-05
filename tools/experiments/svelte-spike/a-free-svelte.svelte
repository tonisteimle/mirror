<script>
  import { onDestroy } from 'svelte';

  let playing = $state(false);
  let favorited = $state(false);
  let progress = $state(0.38);
  let dragging = $state(false);

  const duration = 214; // seconds
  $derived: let current = Math.floor(progress * duration);

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  let interval;

  function togglePlay() {
    playing = !playing;
    if (playing) {
      interval = setInterval(() => {
        progress = Math.min(1, progress + 1 / duration);
        if (progress >= 1) {
          playing = false;
          clearInterval(interval);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
  }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }

  function prev() {
    progress = 0;
  }

  function next() {
    progress = 0;
    playing = false;
    clearInterval(interval);
  }

  onDestroy(() => clearInterval(interval));

  let currentTime = $derived(fmt(Math.floor(progress * duration)));
  let remainingTime = $derived(fmt(Math.floor((1 - progress) * duration)));
</script>

<div class="player">
  <div class="art">
    <img
      src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=280&h=280&fit=crop&auto=format"
      alt="Album art"
    />
    <div class="art-overlay" class:playing></div>
  </div>

  <div class="meta">
    <span class="title">Good Days</span>
    <span class="artist">SZA</span>
  </div>

  <div class="progress-area">
    <div
      class="track"
      role="slider"
      tabindex="0"
      aria-label="Seek"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progress * 100)}
      onclick={seek}
      onkeydown={(e) => {
        if (e.key === 'ArrowRight') progress = Math.min(1, progress + 0.02);
        if (e.key === 'ArrowLeft') progress = Math.max(0, progress - 0.02);
      }}
    >
      <div class="fill" style="width: {progress * 100}%">
        <div class="thumb"></div>
      </div>
    </div>
    <div class="times">
      <span>{currentTime}</span>
      <span>−{remainingTime}</span>
    </div>
  </div>

  <div class="controls">
    <button class="ctrl secondary" onclick={prev} aria-label="Previous">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
      </svg>
    </button>
    <button class="ctrl primary" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
      {#if playing}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      {/if}
    </button>
    <button class="ctrl secondary" onclick={next} aria-label="Next">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5-3.9V15l-5.5-3z M16 6h2v12h-2z"/>
      </svg>
    </button>
  </div>

  <div class="actions">
    <button
      class="action"
      class:active={favorited}
      onclick={() => (favorited = !favorited)}
      aria-label="Favorite"
      aria-pressed={favorited}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
    <button class="action" aria-label="Add to queue">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    </button>
    <button class="action" aria-label="Share">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .player {
    width: 240px;
    background: #0e0e0f;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    color: #fff;
    user-select: none;
  }

  .art {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 8s linear;
  }

  .art-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 50%, #0e0e0f 100%);
  }

  .meta {
    padding: 16px 16px 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: #fff;
  }

  .artist {
    font-size: 12px;
    font-weight: 400;
    color: #666;
    letter-spacing: 0.01em;
  }

  .progress-area {
    padding: 14px 16px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .track {
    height: 2px;
    background: #222;
    border-radius: 1px;
    cursor: pointer;
    position: relative;
    padding: 6px 0;
    margin: -6px 0;
    box-sizing: content-box;
  }

  .fill {
    height: 2px;
    background: #fff;
    border-radius: 1px;
    position: relative;
    transition: width 0.1s linear;
    pointer-events: none;
  }

  .thumb {
    position: absolute;
    right: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .track:hover .thumb {
    opacity: 1;
  }

  .times {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #444;
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
  }

  .controls {
    padding: 10px 16px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .ctrl {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    padding: 0;
    transition: opacity 0.12s;
  }

  .ctrl:hover {
    opacity: 0.7;
  }

  .ctrl:active {
    opacity: 0.5;
  }

  .ctrl.secondary {
    color: #888;
    width: 28px;
    height: 28px;
  }

  .ctrl.primary {
    color: #fff;
    width: 36px;
    height: 36px;
    background: #fff;
    color: #0e0e0f;
  }

  .ctrl.primary:hover {
    opacity: 0.9;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 0 16px 16px;
    border-top: 1px solid #181818;
    padding-top: 12px;
    margin-top: 2px;
  }

  .action {
    background: none;
    border: none;
    cursor: pointer;
    color: #444;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.12s;
  }

  .action:hover {
    color: #888;
  }

  .action.active {
    color: #ef4444;
  }
</style>
