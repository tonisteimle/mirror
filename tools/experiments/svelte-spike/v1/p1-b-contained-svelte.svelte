<script>
  let email = '';
  let password = '';
  let submitted = false;
  let error = '';

  function handleSubmit() {
    if (!email || !password) {
      error = 'Please fill in all fields.';
      return;
    }
    error = '';
    submitted = true;
  }

  function handleForgotPassword() {
    alert('Password reset link sent to ' + (email || 'your email'));
  }
</script>

<div class="root">
  <div class="card">
    <div class="header">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#6366f1"/>
          <path d="M10 22 L16 10 L22 22" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12.5 18 L19.5 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="title">Welcome back</h1>
      <p class="subtitle">Sign in to your account to continue</p>
    </div>

    {#if submitted}
      <div class="success">
        <span class="success-icon">✓</span>
        <span class="success-text">Signed in successfully!</span>
      </div>
    {:else}
      <div class="form">
        {#if error}
          <div class="error-banner">
            <span class="error-text">{error}</span>
          </div>
        {/if}

        <div class="field">
          <label class="label" for="email">Email address</label>
          <input
            class="input"
            id="email"
            type="email"
            placeholder="you@example.com"
            bind:value={email}
          />
        </div>

        <div class="field">
          <label class="label" for="password">Password</label>
          <input
            class="input"
            id="password"
            type="password"
            placeholder="••••••••"
            bind:value={password}
          />
        </div>

        <button class="submit" on:click={handleSubmit}>
          Sign in
        </button>
      </div>

      <div class="footer">
        <button class="forgot" on:click={handleForgotPassword}>
          Forgot password?
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  :root {
    --bg-base: #0f1117;
    --bg-card: #1a1d27;
    --bg-input: #13151f;
    --bg-input-focus: #0f1117;
    --border: #2a2d3e;
    --border-focus: #6366f1;
    --accent: #6366f1;
    --accent-hover: #5254cc;
    --text-primary: #f0f1f6;
    --text-secondary: #8b8fa8;
    --text-muted: #555972;
    --success-bg: #0d2318;
    --success-border: #1a4a30;
    --success-text: #34d399;
    --error-bg: #1f0d0d;
    --error-border: #4a1a1a;
    --error-text: #f87171;
    --radius-card: 16px;
    --radius-input: 10px;
    --radius-btn: 10px;
    --space-xs: 6px;
    --space-sm: 12px;
    --space-md: 20px;
    --space-lg: 32px;
    --space-xl: 48px;
  }

  .root {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    background-color: var(--bg-base);
  }

  .card {
    display: flex;
    flex-direction: column;
    width: 400px;
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: var(--space-xl);
    gap: var(--space-lg);
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-xs);
  }

  .logo-icon {
    width: 40px;
    height: 40px;
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.5px;
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    text-align: center;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .error-banner {
    display: flex;
    align-items: center;
    background-color: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
  }

  .error-text {
    font-size: 13px;
    color: var(--error-text);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
  }

  .input {
    display: flex;
    background-color: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    color: var(--text-primary);
    font-size: 15px;
    padding: 14px var(--space-md);
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .input:hover {
    border-color: var(--text-muted);
  }

  .input:focus {
    border-color: var(--border-focus);
    background-color: var(--bg-input-focus);
    box-shadow: 0 0 0 3px #6366f122;
  }

  .submit {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--accent);
    color: #ffffff;
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-btn);
    padding: 14px var(--space-md);
    cursor: pointer;
    margin-top: var(--space-xs);
    letter-spacing: 0.1px;
  }

  .submit:hover {
    background-color: var(--accent-hover);
  }

  .submit:active {
    background-color: #4446b8;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .forgot {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: 6px;
  }

  .forgot:hover {
    color: var(--text-primary);
  }

  .success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    background-color: var(--success-bg);
    border: 1px solid var(--success-border);
    border-radius: var(--radius-input);
    padding: var(--space-lg) var(--space-md);
  }

  .success-icon {
    font-size: 32px;
    color: var(--success-text);
  }

  .success-text {
    font-size: 15px;
    font-weight: 500;
    color: var(--success-text);
  }
</style>
