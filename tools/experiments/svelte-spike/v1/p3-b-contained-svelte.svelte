<script>
  let activeTab = 'account';

  let name = 'Ada Lovelace';
  let email = 'ada@example.com';
  let saved = false;

  let notifEmail = true;
  let notifPush = false;
  let notifSms = false;

  let privacy = 'public';

  function selectTab(tab) {
    activeTab = tab;
    saved = false;
  }

  function save() {
    saved = true;
  }

  function toggleEmail() { notifEmail = !notifEmail; }
  function togglePush()  { notifPush  = !notifPush;  }
  function toggleSms()   { notifSms   = !notifSms;   }

  function setPublic()  { privacy = 'public';  }
  function setPrivate() { privacy = 'private'; }
</script>

<div class="shell">
  <div class="card">
    <div class="card-header">
      <h1 class="heading">Settings</h1>
      <p class="subheading">Manage your account preferences</p>
    </div>

    <div class="tabs">
      <button class={activeTab === 'account' ? 'tab tab-active' : 'tab'} on:click={() => selectTab('account')}>Account</button>
      <button class={activeTab === 'notifications' ? 'tab tab-active' : 'tab'} on:click={() => selectTab('notifications')}>Notifications</button>
      <button class={activeTab === 'privacy' ? 'tab tab-active' : 'tab'} on:click={() => selectTab('privacy')}>Privacy</button>
    </div>

    <div class="panel">

      {#if activeTab === 'account'}
        <div class="section">
          <div class="section-title-row">
            <span class="section-icon">👤</span>
            <h2 class="section-title">Account Details</h2>
          </div>
          <p class="section-desc">Update your personal information below.</p>

          <div class="field">
            <label class="field-label">Full Name</label>
            <input class="field-input" type="text" bind:value={name} placeholder="Your name" />
          </div>

          <div class="field">
            <label class="field-label">Email Address</label>
            <input class="field-input" type="email" bind:value={email} placeholder="your@email.com" />
          </div>

          <div class="action-row">
            {#if saved}
              <span class="save-confirm">✓ Changes saved</span>
            {/if}
            <button class="btn-save" on:click={save}>Save Changes</button>
          </div>
        </div>
      {/if}

      {#if activeTab === 'notifications'}
        <div class="section">
          <div class="section-title-row">
            <span class="section-icon">🔔</span>
            <h2 class="section-title">Notification Preferences</h2>
          </div>
          <p class="section-desc">Choose how you'd like to be notified.</p>

          <div class="toggle-list">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Email Notifications</span>
                <span class="toggle-desc">Receive updates via email</span>
              </div>
              <button class={notifEmail ? 'switch switch-on' : 'switch'} on:click={toggleEmail}>
                <span class="switch-thumb"></span>
              </button>
            </div>

            <div class="toggle-divider"></div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Push Notifications</span>
                <span class="toggle-desc">Alerts on your device</span>
              </div>
              <button class={notifPush ? 'switch switch-on' : 'switch'} on:click={togglePush}>
                <span class="switch-thumb"></span>
              </button>
            </div>

            <div class="toggle-divider"></div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">SMS Notifications</span>
                <span class="toggle-desc">Text messages to your phone</span>
              </div>
              <button class={notifSms ? 'switch switch-on' : 'switch'} on:click={toggleSms}>
                <span class="switch-thumb"></span>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'privacy'}
        <div class="section">
          <div class="section-title-row">
            <span class="section-icon">🔒</span>
            <h2 class="section-title">Privacy Settings</h2>
          </div>
          <p class="section-desc">Control who can see your profile.</p>

          <div class="radio-list">
            <button class={privacy === 'public' ? 'radio-card radio-card-selected' : 'radio-card'} on:click={setPublic}>
              <div class="radio-dot-wrap">
                <div class={privacy === 'public' ? 'radio-dot radio-dot-on' : 'radio-dot'}></div>
              </div>
              <div class="radio-body">
                <span class="radio-label">Public Profile</span>
                <span class="radio-desc">Anyone can view your profile and activity</span>
              </div>
            </button>

            <button class={privacy === 'private' ? 'radio-card radio-card-selected' : 'radio-card'} on:click={setPrivate}>
              <div class="radio-dot-wrap">
                <div class={privacy === 'private' ? 'radio-dot radio-dot-on' : 'radio-dot'}></div>
              </div>
              <div class="radio-body">
                <span class="radio-label">Private Profile</span>
                <span class="radio-desc">Only approved followers can see your profile</span>
              </div>
            </button>
          </div>
        </div>
      {/if}

    </div>
  </div>
</div>

<style>
  :root {
    --c-bg:        #0f1117;
    --c-surface:   #1a1d27;
    --c-surface2:  #22263a;
    --c-border:    #2e3350;
    --c-accent:    #6366f1;
    --c-accent-hi: #818cf8;
    --c-green:     #22c55e;
    --c-text:      #e2e8f0;
    --c-muted:     #94a3b8;
    --c-subtle:    #475569;
    --r-sm:        6px;
    --r-md:        12px;
    --r-lg:        20px;
  }

  .shell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--c-bg);
    padding: 40px;
  }

  .card {
    display: flex;
    flex-direction: column;
    width: 520px;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--r-lg);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 32px 36px 28px;
    border-bottom: 1px solid var(--c-border);
  }

  .heading {
    font-size: 22px;
    font-weight: 700;
    color: var(--c-text);
    margin: 0;
    letter-spacing: -0.3px;
  }

  .subheading {
    font-size: 14px;
    color: var(--c-muted);
    margin: 0;
  }

  .tabs {
    display: flex;
    flex-direction: row;
    gap: 0;
    padding: 16px 36px 0;
    border-bottom: 1px solid var(--c-border);
  }

  .tab {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--c-subtle);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    border-radius: 0;
    transition: none;
  }

  .tab:hover {
    color: var(--c-text);
  }

  .tab-active {
    color: var(--c-accent-hi);
    border-bottom: 2px solid var(--c-accent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    padding: 32px 36px 36px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .section-title-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .section-icon {
    font-size: 20px;
    line-height: 1;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--c-text);
    margin: 0;
  }

  .section-desc {
    font-size: 13px;
    color: var(--c-muted);
    margin: 0 0 28px 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--c-muted);
    letter-spacing: 0.3px;
  }

  .field-input {
    display: flex;
    padding: 12px 16px;
    font-size: 15px;
    color: var(--c-text);
    background: var(--c-surface2);
    border: 1px solid var(--c-border);
    border-radius: var(--r-sm);
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .field-input:focus {
    border-color: var(--c-accent);
  }

  .action-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    margin-top: 8px;
  }

  .save-confirm {
    font-size: 13px;
    color: var(--c-green);
    font-weight: 500;
  }

  .btn-save {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 11px 28px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: var(--c-accent);
    border: none;
    border-radius: var(--r-sm);
    cursor: pointer;
  }

  .btn-save:hover {
    background: var(--c-accent-hi);
  }

  .btn-save:active {
    background: #4f46e5;
  }

  .toggle-list {
    display: flex;
    flex-direction: column;
    background: var(--c-surface2);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    overflow: hidden;
  }

  .toggle-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .toggle-divider {
    display: flex;
    height: 1px;
    background: var(--c-border);
    margin: 0 24px;
  }

  .toggle-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toggle-label {
    font-size: 15px;
    font-weight: 500;
    color: var(--c-text);
  }

  .toggle-desc {
    font-size: 13px;
    color: var(--c-muted);
  }

  .switch {
    display: flex;
    align-items: center;
    width: 48px;
    height: 28px;
    background: var(--c-border);
    border: none;
    border-radius: 999px;
    padding: 3px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .switch:hover {
    background: var(--c-subtle);
  }

  .switch-on {
    background: var(--c-accent);
  }

  .switch-on:hover {
    background: var(--c-accent-hi);
  }

  .switch-thumb {
    display: flex;
    width: 22px;
    height: 22px;
    background: #ffffff;
    border-radius: 999px;
  }

  .switch-on .switch-thumb {
    margin-left: 20px;
  }

  .radio-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .radio-card {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 22px;
    background: var(--c-surface2);
    border: 1px solid var(--c-border);
    border-radius: var(--r-md);
    cursor: pointer;
    text-align: left;
  }

  .radio-card:hover {
    border-color: var(--c-subtle);
  }

  .radio-card-selected {
    border-color: var(--c-accent);
    background: #1e2040;
  }

  .radio-dot-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .radio-dot {
    display: flex;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 2px solid var(--c-subtle);
    background: transparent;
  }

  .radio-dot-on {
    border-color: var(--c-accent);
    background: var(--c-accent);
  }

  .radio-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .radio-label {
    font-size: 15px;
    font-weight: 500;
    color: var(--c-text);
  }

  .radio-desc {
    font-size: 13px;
    color: var(--c-muted);
  }
</style>
