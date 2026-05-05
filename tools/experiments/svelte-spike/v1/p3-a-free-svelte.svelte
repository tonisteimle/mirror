<script>
  let activeTab = $state('account');

  let account = $state({ name: 'Alex Johnson', email: 'alex@example.com' });
  let saved = $state(false);

  let notifications = $state({ email: true, push: false, sms: true });

  let privacy = $state('public');

  function saveAccount() {
    saved = true;
    setTimeout(() => (saved = false), 2000);
  }

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'privacy', label: 'Privacy' },
  ];
</script>

<div class="panel">
  <header class="panel-header">
    <h1>Settings</h1>
    <p>Manage your account preferences</p>
  </header>

  <nav class="tabs" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.id}
        class="tab"
        class:active={activeTab === tab.id}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </nav>

  <div class="panel-body">
    {#if activeTab === 'account'}
      <section class="section" role="tabpanel" aria-label="Account">
        <div class="section-title">
          <h2>Account Information</h2>
          <p>Update your personal details below.</p>
        </div>
        <div class="fields">
          <label class="field">
            <span class="field-label">Full Name</span>
            <input
              type="text"
              bind:value={account.name}
              placeholder="Your name"
              class="input"
            />
          </label>
          <label class="field">
            <span class="field-label">Email Address</span>
            <input
              type="email"
              bind:value={account.email}
              placeholder="you@example.com"
              class="input"
            />
          </label>
        </div>
        <button class="btn-primary" class:saved onclick={saveAccount}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </section>

    {:else if activeTab === 'notifications'}
      <section class="section" role="tabpanel" aria-label="Notifications">
        <div class="section-title">
          <h2>Notification Preferences</h2>
          <p>Choose how you want to be notified.</p>
        </div>
        <div class="toggles">
          {#each [
            { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
            { key: 'push', label: 'Push Notifications', desc: 'Browser and mobile alerts' },
            { key: 'sms', label: 'SMS Notifications', desc: 'Text messages to your phone' },
          ] as item}
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">{item.label}</span>
                <span class="toggle-desc">{item.desc}</span>
              </div>
              <button
                role="switch"
                aria-checked={notifications[item.key]}
                class="toggle"
                class:on={notifications[item.key]}
                onclick={() => (notifications[item.key] = !notifications[item.key])}
              >
                <span class="thumb"></span>
              </button>
            </div>
          {/each}
        </div>
      </section>

    {:else if activeTab === 'privacy'}
      <section class="section" role="tabpanel" aria-label="Privacy">
        <div class="section-title">
          <h2>Privacy Settings</h2>
          <p>Control who can see your profile.</p>
        </div>
        <div class="radios">
          {#each [
            { value: 'public', label: 'Public Profile', desc: 'Anyone can view your profile and activity.' },
            { value: 'private', label: 'Private Profile', desc: 'Only approved followers can see your content.' },
          ] as option}
            <label class="radio-card" class:selected={privacy === option.value}>
              <input
                type="radio"
                name="privacy"
                value={option.value}
                bind:group={privacy}
                class="radio-input"
              />
              <div class="radio-mark" class:checked={privacy === option.value}>
                {#if privacy === option.value}<span class="radio-dot"></span>{/if}
              </div>
              <div class="radio-content">
                <span class="radio-label">{option.label}</span>
                <span class="radio-desc">{option.desc}</span>
              </div>
            </label>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .panel {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    width: 480px;
    max-width: 100%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.07);
    overflow: hidden;
  }

  .panel-header {
    padding: 28px 32px 20px;
    border-bottom: 1px solid #f3f4f6;
  }

  .panel-header h1 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.3px;
  }

  .panel-header p {
    font-size: 13px;
    color: #9ca3af;
    margin-top: 3px;
  }

  .tabs {
    display: flex;
    padding: 0 32px;
    border-bottom: 1px solid #f3f4f6;
    gap: 4px;
  }

  .tab {
    padding: 14px 16px 12px;
    font-size: 13.5px;
    font-weight: 500;
    color: #6b7280;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #374151;
  }

  .tab.active {
    color: #4f46e5;
    border-bottom-color: #4f46e5;
  }

  .panel-body {
    padding: 28px 32px 32px;
  }

  .section-title {
    margin-bottom: 24px;
  }

  .section-title h2 {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
    letter-spacing: -0.2px;
  }

  .section-title p {
    font-size: 13px;
    color: #9ca3af;
    margin-top: 4px;
  }

  /* Account */
  .fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
  }

  .input {
    padding: 10px 14px;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #fafafa;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
    width: 100%;
  }

  .input:focus {
    border-color: #4f46e5;
    background: #ffffff;
  }

  .btn-primary {
    padding: 10px 22px;
    background: #4f46e5;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .btn-primary:hover {
    background: #4338ca;
  }

  .btn-primary:active {
    transform: scale(0.98);
  }

  .btn-primary.saved {
    background: #10b981;
  }

  /* Notifications */
  .toggles {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-radius: 10px;
    background: #f9fafb;
    gap: 16px;
  }

  .toggle-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toggle-label {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .toggle-desc {
    font-size: 12px;
    color: #9ca3af;
  }

  .toggle {
    width: 44px;
    height: 24px;
    background: #d1d5db;
    border: none;
    border-radius: 99px;
    padding: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .toggle.on {
    background: #4f46e5;
  }

  .thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    transition: transform 0.2s;
    display: block;
  }

  .toggle.on .thumb {
    transform: translateX(20px);
  }

  /* Privacy */
  .radios {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .radio-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    border: 1.5px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    background: #fafafa;
  }

  .radio-card.selected {
    border-color: #4f46e5;
    background: #f5f3ff;
  }

  .radio-input {
    display: none;
  }

  .radio-mark {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    transition: border-color 0.15s;
  }

  .radio-mark.checked {
    border-color: #4f46e5;
  }

  .radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4f46e5;
    display: block;
  }

  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .radio-label {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .radio-desc {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.4;
  }
</style>
