// ============================================
// Mirror App - Generated from Mirror DSL
// ============================================

/**
 * Creates the UI from Mirror spec:
 *
 * Card
 *   H3 "Titel"
 *   Text "Beschreibung"
 *   PrimaryButton "Button"
 */
function createUI() {
  // Card container
  const card = document.createElement('div');
  card.className = 'card';

  // H3 "Titel"
  const h3 = document.createElement('h3');
  h3.className = 'h3';
  h3.textContent = 'Titel';
  card.appendChild(h3);

  // Text "Beschreibung"
  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = 'Beschreibung';
  card.appendChild(text);

  // PrimaryButton "Button"
  const primaryButton = document.createElement('button');
  primaryButton.className = 'primary-button';
  primaryButton.textContent = 'Button';
  card.appendChild(primaryButton);

  return card;
}

// Initialize App
function init() {
  const app = document.getElementById('app');
  const ui = createUI();
  app.appendChild(ui);
}

// Start
init();
