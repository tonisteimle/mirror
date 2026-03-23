// ==============================================
// Todo App - Generated from Mirror DSL
// ==============================================

// Icons as SVG
const icons = {
  plus: `<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  trash: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
};

// State
let tasks = [];
let taskIdCounter = 0;

// ==============================================
// DOM Creation
// ==============================================

function createIcon(name) {
  const span = document.createElement('span');
  span.className = 'icon';
  span.innerHTML = icons[name] || '';
  return span;
}

function createUI() {
  const container = document.createElement('div');
  container.className = 'container';

  // Header
  const header = document.createElement('header');
  header.className = 'header';

  const h2 = document.createElement('h2');
  h2.textContent = 'My Tasks';

  const addButton = document.createElement('button');
  addButton.className = 'primary-button';
  addButton.appendChild(createIcon('plus'));
  const addButtonText = document.createElement('span');
  addButtonText.textContent = 'Add';
  addButton.appendChild(addButtonText);
  addButton.addEventListener('click', () => {
    showNewTaskInput();
  });

  header.appendChild(h2);
  header.appendChild(addButton);

  // New Task Input
  const newTaskInput = document.createElement('div');
  newTaskInput.id = 'NewTaskInput';
  newTaskInput.className = 'new-task-input hidden';

  const inputRow = document.createElement('div');
  inputRow.className = 'row';

  const taskInput = document.createElement('input');
  taskInput.id = 'TaskInput';
  taskInput.type = 'text';
  taskInput.className = 'input';
  taskInput.placeholder = 'What needs to be done?';
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  const submitButton = document.createElement('button');
  submitButton.className = 'primary-button';
  submitButton.textContent = 'Add';
  submitButton.addEventListener('click', addTask);

  inputRow.appendChild(taskInput);
  inputRow.appendChild(submitButton);
  newTaskInput.appendChild(inputRow);

  // Task List
  const taskList = document.createElement('div');
  taskList.id = 'TaskList';
  taskList.className = 'task-list';

  // Footer
  const footer = document.createElement('footer');
  footer.className = 'footer';

  const taskCount = document.createElement('span');
  taskCount.id = 'TaskCount';
  taskCount.className = 'text-small';
  taskCount.textContent = '0 tasks remaining';

  const clearButton = document.createElement('button');
  clearButton.className = 'ghost-button';
  clearButton.textContent = 'Clear completed';
  clearButton.addEventListener('click', clearCompleted);

  footer.appendChild(taskCount);
  footer.appendChild(clearButton);

  // Assemble
  container.appendChild(header);
  container.appendChild(newTaskInput);
  container.appendChild(taskList);
  container.appendChild(footer);

  return container;
}

function createTaskItem(id, text) {
  const taskItem = document.createElement('div');
  taskItem.className = 'task-item';
  taskItem.dataset.taskId = id;

  const row = document.createElement('div');
  row.className = 'row';

  const taskContent = document.createElement('div');
  taskContent.className = 'task-content';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'checkbox';
  checkbox.addEventListener('change', () => {
    toggleCompleted(id);
  });

  const taskText = document.createElement('span');
  taskText.className = 'task-text';
  taskText.textContent = text;

  taskContent.appendChild(checkbox);
  taskContent.appendChild(taskText);

  const deleteButton = document.createElement('button');
  deleteButton.className = 'icon-button';
  deleteButton.appendChild(createIcon('trash'));
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(id);
  });

  row.appendChild(taskContent);
  row.appendChild(deleteButton);
  taskItem.appendChild(row);

  return taskItem;
}

// ==============================================
// Actions
// ==============================================

function showNewTaskInput() {
  const input = document.getElementById('NewTaskInput');
  input.classList.remove('hidden');
  document.getElementById('TaskInput').focus();
}

function hideNewTaskInput() {
  const input = document.getElementById('NewTaskInput');
  input.classList.add('hidden');
  document.getElementById('TaskInput').value = '';
}

function addTask() {
  const input = document.getElementById('TaskInput');
  const text = input.value.trim();

  if (!text) return;

  const id = ++taskIdCounter;
  tasks.push({ id, text, completed: false });

  const taskList = document.getElementById('TaskList');
  const taskItem = createTaskItem(id, text);
  taskList.appendChild(taskItem);

  input.value = '';
  updateCount();
}

function toggleCompleted(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;

    const taskItem = document.querySelector(`[data-task-id="${id}"]`);
    if (taskItem) {
      if (task.completed) {
        taskItem.dataset.state = 'completed';
        taskItem.querySelector('.checkbox').checked = true;
      } else {
        delete taskItem.dataset.state;
        taskItem.querySelector('.checkbox').checked = false;
      }
    }

    updateCount();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);

  const taskItem = document.querySelector(`[data-task-id="${id}"]`);
  if (taskItem) {
    taskItem.remove();
  }

  updateCount();
}

function updateCount() {
  const remaining = tasks.filter(t => !t.completed).length;
  const countEl = document.getElementById('TaskCount');
  countEl.textContent = `${remaining} task${remaining !== 1 ? 's' : ''} remaining`;
}

function clearCompleted() {
  const completedIds = tasks.filter(t => t.completed).map(t => t.id);
  tasks = tasks.filter(t => !t.completed);

  completedIds.forEach(id => {
    const taskItem = document.querySelector(`[data-task-id="${id}"]`);
    if (taskItem) {
      taskItem.remove();
    }
  });

  updateCount();
}

// ==============================================
// Initialize
// ==============================================

const app = document.getElementById('app');
app.appendChild(createUI());
