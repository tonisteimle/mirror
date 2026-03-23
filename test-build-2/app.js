// Mirror App - Settings Card

function createUI() {
  // Card
  const card = document.createElement('div');
  card.className = 'card';

  // H4 "Settings"
  const h4 = document.createElement('h4');
  h4.textContent = 'Settings';
  card.appendChild(h4);

  // Row (spread)
  const row = document.createElement('div');
  row.className = 'row';

  // Text "Dark Mode"
  const label = document.createElement('span');
  label.textContent = 'Dark Mode';
  row.appendChild(label);

  // Toggle (state off, onclick toggle)
  const toggle = document.createElement('button');
  toggle.className = 'toggle';
  toggle.setAttribute('data-state', 'off');
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', 'false');

  toggle.addEventListener('click', () => {
    const currentState = toggle.getAttribute('data-state');
    const newState = currentState === 'off' ? 'on' : 'off';
    toggle.setAttribute('data-state', newState);
    toggle.setAttribute('aria-checked', newState === 'on' ? 'true' : 'false');
  });

  row.appendChild(toggle);
  card.appendChild(row);

  // PrimaryButton "Save"
  const saveButton = document.createElement('button');
  saveButton.className = 'primary-button';
  saveButton.textContent = 'Save';
  card.appendChild(saveButton);

  return card;
}

// App starten
const app = document.getElementById('app');
const ui = createUI();
app.appendChild(ui);
