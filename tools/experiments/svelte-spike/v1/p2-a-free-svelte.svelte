<script>
  const tiers = [
    {
      name: 'Free',
      price: 0,
      period: null,
      description: 'Perfect for individuals getting started.',
      features: [
        'Up to 3 projects',
        '1 GB storage',
        'Community support',
        'Basic analytics',
      ],
      cta: 'Get started',
      highlighted: false,
      variant: 'ghost',
    },
    {
      name: 'Pro',
      price: 19,
      period: 'mo',
      description: 'For professionals who need more power.',
      features: [
        'Unlimited projects',
        '50 GB storage',
        'Priority email support',
        'Advanced analytics',
      ],
      cta: 'Start free trial',
      highlighted: true,
      variant: 'primary',
    },
    {
      name: 'Enterprise',
      price: 99,
      period: 'mo',
      description: 'For teams that demand the very best.',
      features: [
        'Everything in Pro',
        '1 TB storage',
        'Dedicated account manager',
        'Custom integrations',
      ],
      cta: 'Contact sales',
      highlighted: false,
      variant: 'ghost',
    },
  ];
</script>

<section class="pricing">
  <div class="header">
    <p class="eyebrow">Pricing</p>
    <h1 class="headline">Simple, transparent pricing</h1>
    <p class="subline">No hidden fees. Cancel any time.</p>
  </div>

  <div class="grid">
    {#each tiers as tier}
      <div class="card" class:highlighted={tier.highlighted}>
        {#if tier.highlighted}
          <div class="badge">Recommended</div>
        {/if}

        <div class="card-top">
          <h2 class="tier-name">{tier.name}</h2>
          <div class="price-row">
            {#if tier.price === 0}
              <span class="price-amount">Free</span>
            {:else}
              <span class="price-currency">$</span>
              <span class="price-amount">{tier.price}</span>
              <span class="price-period">/ {tier.period}</span>
            {/if}
          </div>
          <p class="description">{tier.description}</p>
        </div>

        <ul class="features">
          {#each tier.features as feature}
            <li class="feature">
              <svg class="check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="10" class="check-circle" />
                <polyline points="5.5,10.5 8.5,13.5 14.5,7.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-mark" />
              </svg>
              <span>{feature}</span>
            </li>
          {/each}
        </ul>

        <button class="cta" class:cta-primary={tier.variant === 'primary'} class:cta-ghost={tier.variant === 'ghost'}>
          {tier.cta}
        </button>
      </div>
    {/each}
  </div>
</section>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .pricing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    background: #0d0f14;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
  }

  /* Header */
  .header {
    text-align: center;
    margin-bottom: 64px;
  }

  .eyebrow {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6366f1;
    margin-bottom: 14px;
  }

  .headline {
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #f8fafc;
    margin-bottom: 12px;
    line-height: 1.15;
  }

  .subline {
    font-size: 1.0625rem;
    color: #64748b;
  }

  /* Grid */
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    max-width: 1020px;
    width: 100%;
    align-items: stretch;
  }

  /* Card */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    background: #161b27;
    border: 1px solid #1e2535;
    padding: 40px 36px 36px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .card:first-child {
    border-radius: 20px 0 0 20px;
  }

  .card:last-child {
    border-radius: 0 20px 20px 0;
  }

  .card.highlighted {
    background: #1a1f36;
    border-color: #6366f1;
    border-width: 1px;
    z-index: 1;
    transform: scaleY(1.025);
    box-shadow:
      0 0 0 1px #6366f1,
      0 24px 64px -12px rgba(99, 102, 241, 0.35),
      0 4px 24px -4px rgba(0, 0, 0, 0.5);
    border-radius: 20px;
    padding-top: 52px;
  }

  /* Badge */
  .badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 99px;
    white-space: nowrap;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.5);
  }

  /* Card top */
  .card-top {
    margin-bottom: 32px;
  }

  .tier-name {
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 16px;
  }

  .highlighted .tier-name {
    color: #a5b4fc;
  }

  .price-row {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin-bottom: 14px;
  }

  .price-currency {
    font-size: 1.375rem;
    font-weight: 600;
    color: #cbd5e1;
    align-self: flex-start;
    margin-top: 6px;
  }

  .price-amount {
    font-size: 3.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f8fafc;
    line-height: 1;
  }

  .price-period {
    font-size: 0.9375rem;
    color: #475569;
    margin-left: 4px;
  }

  .description {
    font-size: 0.9375rem;
    color: #64748b;
    line-height: 1.55;
  }

  /* Features */
  .features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 36px;
    flex: 1;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9375rem;
    color: #94a3b8;
    line-height: 1.4;
  }

  .highlighted .feature {
    color: #cbd5e1;
  }

  .check {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .check-circle {
    fill: #1e2d40;
  }

  .highlighted .check-circle {
    fill: #2d2060;
  }

  .check-mark {
    stroke: #64748b;
    fill: none;
  }

  .highlighted .check-mark {
    stroke: #818cf8;
  }

  /* CTA */
  .cta {
    width: 100%;
    padding: 14px 24px;
    border-radius: 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    border: none;
    letter-spacing: 0.01em;
  }

  .cta:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }

  .cta:active {
    transform: translateY(0);
  }

  .cta-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  }

  .cta-ghost {
    background: transparent;
    color: #94a3b8;
    border: 1px solid #1e2535;
  }

  .cta-ghost:hover {
    border-color: #334155;
    color: #e2e8f0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 16px;
      max-width: 420px;
    }

    .card:first-child,
    .card:last-child {
      border-radius: 16px;
    }

    .card.highlighted {
      transform: none;
      border-radius: 16px;
    }
  }
</style>
