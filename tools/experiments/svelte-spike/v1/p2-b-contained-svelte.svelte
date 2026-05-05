<script>
  let selected = 'pro';

  const tiers = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      period: '/mo',
      tagline: 'Get started at no cost',
      cta: 'Get started',
      features: [
        '1 project',
        'Up to 3 collaborators',
        '5 GB storage',
        'Community support',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '19',
      period: '/mo',
      tagline: 'Best for growing teams',
      cta: 'Start free trial',
      features: [
        'Unlimited projects',
        'Up to 20 collaborators',
        '100 GB storage',
        'Priority support',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '99',
      period: '/mo',
      tagline: 'For large organisations',
      cta: 'Contact sales',
      features: [
        'Unlimited projects',
        'Unlimited collaborators',
        '2 TB storage',
        'Dedicated account manager',
      ],
    },
  ];

  function choose(id) {
    selected = id;
  }
</script>

<div class="page">
  <div class="header">
    <h1 class="headline">Simple, transparent pricing</h1>
    <p class="subline">No hidden fees. Cancel anytime.</p>
  </div>

  <div class="cards">
    {#each tiers as tier}
      <div class={tier.id === 'pro' ? 'card card-pro' : 'card'}>
        {#if tier.id === 'pro'}
          <div class="badge">Recommended</div>
        {/if}

        <div class="tier-header">
          <span class="tier-name">{tier.name}</span>
          <span class="tier-tagline">{tier.tagline}</span>
        </div>

        <div class="price-row">
          <span class="currency">$</span>
          <span class="amount">{tier.price}</span>
          <span class="period">{tier.period}</span>
        </div>

        <ul class="features">
          {#each tier.features as feature}
            <li class="feature-item">
              <span class="check-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="currentColor" class="check-circle" />
                  <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="feature-text">{feature}</span>
            </li>
          {/each}
        </ul>

        <button
          class={tier.id === 'pro' ? 'cta-btn cta-btn-pro' : 'cta-btn'}
          on:click={() => choose(tier.id)}
        >
          {tier.cta}
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  :root {
    --bg-page: #0f1117;
    --bg-card: #1a1d27;
    --bg-card-pro: #1e2235;
    --accent: #6c63ff;
    --accent-dark: #564fd4;
    --accent-light: #8a84ff;
    --text-primary: #f0f0f8;
    --text-secondary: #9095b0;
    --text-muted: #5a6080;
    --border: #2a2e45;
    --border-pro: #6c63ff;
    --check-free: #4caf8a;
    --check-pro: #6c63ff;
    --check-ent: #f0a050;
    --space-xs: 6px;
    --space-sm: 12px;
    --space-md: 20px;
    --space-lg: 32px;
    --space-xl: 48px;
    --radius: 16px;
  }

  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--bg-page);
    min-height: 100%;
    padding: 80px 24px;
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: var(--space-xl);
  }

  .headline {
    font-size: 40px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -1px;
    margin: 0 0 var(--space-sm) 0;
    text-align: center;
  }

  .subline {
    font-size: 17px;
    color: var(--text-secondary);
    margin: 0;
    text-align: center;
  }

  .cards {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: var(--space-md);
  }

  .card {
    display: flex;
    flex-direction: column;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 36px 32px;
    width: 280px;
    position: relative;
  }

  .card-pro {
    background: var(--bg-card-pro);
    border: 2px solid var(--border-pro);
    box-shadow: 0 0 0 4px #6c63ff18, 0 24px 48px #00000055;
    transform: translateY(-8px);
  }

  .badge {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 14px;
    border-radius: 99px;
    white-space: nowrap;
  }

  .tier-header {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--space-lg);
  }

  .tier-name {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
  }

  .tier-tagline {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .price-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    margin-bottom: var(--space-lg);
  }

  .currency {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
    margin-right: 2px;
  }

  .amount {
    font-size: 56px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -2px;
  }

  .period {
    font-size: 15px;
    color: var(--text-muted);
    margin-bottom: 8px;
    margin-left: 4px;
  }

  .features {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    list-style: none;
    margin: 0 0 var(--space-lg) 0;
    padding: 0;
    flex: 1;
  }

  .feature-item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .check-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--check-free);
  }

  .card-pro .check-icon {
    color: var(--check-pro);
  }

  .feature-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .cta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-page);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    padding: 14px 24px;
    cursor: pointer;
    margin-top: auto;
  }

  .cta-btn:hover {
    background: var(--border);
    border-color: var(--text-muted);
  }

  .cta-btn:active {
    opacity: 0.85;
  }

  .cta-btn-pro {
    background: var(--accent);
    color: #ffffff;
    border: 1px solid var(--accent);
  }

  .cta-btn-pro:hover {
    background: var(--accent-dark);
    border-color: var(--accent-dark);
  }

  .check-circle {
    color: inherit;
  }
</style>
