<script>
  let email = $state('');
  let password = $state('');
  let isLoading = $state(false);
  let errorMessage = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      errorMessage = 'Please fill in all fields.';
      return;
    }
    errorMessage = '';
    isLoading = true;
    await new Promise(r => setTimeout(r, 1200));
    isLoading = false;
  }
</script>

<div class="shell">
  <div class="card">
    <div class="brand">
      <div class="logo-mark">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="#6366f1"/>
          <path d="M8 14h12M14 8v12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <span class="brand-name">Aether</span>
    </div>

    <div class="heading-group">
      <h1>Welcome back</h1>
      <p>Sign in to continue to your workspace.</p>
    </div>

    <form onsubmit={handleSubmit} novalidate>
      <div class="field">
        <label for="email">Email address</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          bind:value={email}
          class:has-error={errorMessage && !email}
        />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••••••"
          autocomplete="current-password"
          bind:value={password}
          class:has-error={errorMessage && !password}
        />
      </div>

      {#if errorMessage}
        <p class="error-msg" role="alert">{errorMessage}</p>
      {/if}

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          <span class="spinner" aria-hidden="true"></span>
          Signing in…
        {:else}
          Sign in
        {/if}
      </button>
    </form>

    <div class="footer-links">
      <a href="/forgot-password">Forgot password?</a>
    </div>
  </div>
</div>

<style>
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0d0d10;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    padding: 24px;
  }

  .card {
    width: 100%;
    max-width: 400px;
    background: #16161a;
    border: 1px solid #232329;
    border-radius: 16px;
    padding: 40px 36px 36px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03),
      0 24px 64px rgba(0,0,0,0.5);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }

  .logo-mark {
    display: flex;
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 17px;
    font-weight: 600;
    color: #f4f4f5;
    letter-spacing: -0.01em;
  }

  .heading-group {
    margin-bottom: 28px;
  }

  .heading-group h1 {
    font-size: 22px;
    font-weight: 700;
    color: #f4f4f5;
    letter-spacing: -0.03em;
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .heading-group p {
    font-size: 14px;
    color: #71717a;
    line-height: 1.5;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: #a1a1aa;
    letter-spacing: 0.01em;
  }

  input {
    width: 100%;
    padding: 11px 14px;
    background: #0d0d10;
    border: 1px solid #27272a;
    border-radius: 9px;
    color: #f4f4f5;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
    -webkit-appearance: none;
  }

  input::placeholder {
    color: #3f3f46;
  }

  input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  input.has-error {
    border-color: #f43f5e;
    box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.12);
  }

  .error-msg {
    font-size: 13px;
    color: #f43f5e;
    padding: 10px 13px;
    background: rgba(244, 63, 94, 0.08);
    border: 1px solid rgba(244, 63, 94, 0.2);
    border-radius: 8px;
    line-height: 1.4;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 4px;
    padding: 12px 20px;
    background: #6366f1;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    letter-spacing: -0.01em;
    transition:
      background 0.15s ease,
      opacity 0.15s ease,
      transform 0.1s ease;
    box-shadow: 0 1px 3px rgba(99,102,241,0.3), 0 4px 16px rgba(99,102,241,0.2);
  }

  .submit-btn:hover:not(:disabled) {
    background: #818cf8;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(99,102,241,0.35), 0 8px 24px rgba(99,102,241,0.25);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .footer-links {
    margin-top: 20px;
    text-align: center;
  }

  .footer-links a {
    font-size: 13px;
    color: #71717a;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-links a:hover {
    color: #a1a1aa;
  }
</style>
