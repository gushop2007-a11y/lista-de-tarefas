'use strict';

/* ========== Constantes e estado ========== */
const STORAGE_KEY = 'todo-list:tasks';

const ICONS = {
  edit: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  delete: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  save: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  cancel: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

const EMPTY_MESSAGES = {
  search: 'Nenhuma tarefa encontrada para essa pesquisa.',
  all: 'Nenhuma tarefa por aqui. Adicione a primeira!',
  pending: 'Você não tem tarefas pendentes.',
  completed: 'Nenhuma tarefa concluída ainda.',
};

const state = {
  tasks: loadTasks(),
  filter: 'all',
  searchTerm: '',
  editingId: null,
};

/* ========== Elementos do DOM ========== */
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const formError = document.getElementById('form-error');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter');
const taskList = document.getElementById('task-list');
const emptyMessage = document.getElementById('empty-message');
const remainingCounter = document.getElementById('remaining-counter');
const clearCompletedButton = document.getElementById('clear-completed');

/* ========== LocalStorage e segurança ========== */
function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null;

  const title = typeof task.title === 'string' ? task.title.trim() : '';
  if (!title) return null;

  return {
    id: typeof task.id === 'string' && task.id ? task.id : createTaskId(),
    title,
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
    status: task.status === 'completed' ? 'completed' : 'pending',
  };
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.map(normalizeTask).filter(Boolean);
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch {
    console.error('Não foi possível salvar as tarefas no LocalStorage.');
  }
}

/* ========== Regras das tarefas ========== */
function createTask(title) {
  return {
    id: createTaskId(),
    title,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
}

function addTask(title) {
  const taskTitle = title.trim();
  if (!validateTitle(taskTitle)) return;

  state.tasks.unshift(createTask(taskTitle));
  saveTasks();
  render();
}

function updateTaskTitle(id, newTitle) {
  const task = findTask(id);
  if (!task) return;

  task.title = newTitle.trim();
  state.editingId = null;
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = findTask(id);
  if (!task) return;

  task.status = task.status === 'completed' ? 'pending' : 'completed';
  saveTasks();
  render();
}

function deleteTask(id) {
  const task = findTask(id);
  if (!task) return;

  if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;

  state.tasks = state.tasks.filter((item) => item.id !== id);
  saveTasks();
  render();
}

function clearCompletedTasks() {
  const hasCompleted = state.tasks.some((task) => task.status === 'completed');
  if (!hasCompleted) return;

  if (!window.confirm('Remover todas as tarefas concluídas?')) return;

  state.tasks = state.tasks.filter((task) => task.status !== 'completed');
  saveTasks();
  render();
}

function findTask(id) {
  return state.tasks.find((task) => task.id === id);
}

function getVisibleTasks() {
  const term = state.searchTerm.trim().toLowerCase();

  return state.tasks.filter((task) => {
    const matchesFilter = state.filter === 'all' || task.status === state.filter;
    const matchesSearch = task.title.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });
}

function countPendingTasks() {
  return state.tasks.filter((task) => task.status === 'pending').length;
}

/* ========== Utilitários ========== */
function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function validateTitle(title) {
  return title.trim().length > 0;
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
  taskInput.classList.toggle('is-invalid', Boolean(message));
}

function createButton(className, action, label, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-btn ${className}`.trim();
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon;
  return button;
}

/* ========== Renderização ========== */
function createTaskElement(task) {
  const item = document.createElement('li');
  item.className = 'task';
  item.dataset.id = task.id;

  const isCompleted = task.status === 'completed';
  item.classList.toggle('is-completed', isCompleted);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task__checkbox';
  checkbox.checked = isCompleted;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', `Marcar "${task.title}" como concluída`);

  const content = document.createElement('div');
  content.className = 'task__content';
  const actions = document.createElement('div');
  actions.className = 'task__actions';

  if (state.editingId === task.id) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'input task__edit-input';
    editInput.value = task.title;
    editInput.maxLength = 120;
    editInput.dataset.role = 'edit-input';
    editInput.setAttribute('aria-label', 'Editar título da tarefa');
    content.append(editInput);
    actions.append(
      createButton('icon-btn--success', 'save', 'Salvar alteração', ICONS.save),
      createButton('', 'cancel', 'Cancelar edição', ICONS.cancel)
    );
  } else {
    const title = document.createElement('span');
    title.className = 'task__title';
    title.textContent = task.title;

    const date = document.createElement('span');
    date.className = 'task__date';
    date.textContent = `Criada em ${formatDate(task.createdAt)}`;

    content.append(title, date);
    actions.append(
      createButton('', 'edit', 'Editar tarefa', ICONS.edit),
      createButton('icon-btn--danger', 'delete', 'Excluir tarefa', ICONS.delete)
    );
  }

  item.append(checkbox, content, actions);
  return item;
}

function renderCounter() {
  const pending = countPendingTasks();
  remainingCounter.textContent =
    pending === 0
      ? 'Nenhuma tarefa restante'
      : `${pending} ${pending === 1 ? 'tarefa restante' : 'tarefas restantes'}`;
}

function renderFilters() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.filter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function render() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren(...visibleTasks.map(createTaskElement));

  const emptyKey = state.searchTerm.trim() ? 'search' : state.filter;
  emptyMessage.textContent = EMPTY_MESSAGES[emptyKey];
  emptyMessage.hidden = visibleTasks.length > 0;

  clearCompletedButton.disabled = !state.tasks.some((task) => task.status === 'completed');
  renderCounter();
  renderFilters();

  const editInput = taskList.querySelector('[data-role="edit-input"]');
  if (editInput) {
    editInput.focus();
    editInput.select();
  }
}

/* ========== Eventos ========== */
taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();

  if (!validateTitle(title)) {
    showFormError('Digite o nome da tarefa antes de adicionar.');
    taskInput.focus();
    return;
  }

  showFormError('');
  addTask(title);
  taskInput.value = '';
  taskInput.focus();
});

taskInput.addEventListener('input', () => showFormError(''));

searchInput.addEventListener('input', (event) => {
  state.searchTerm = event.target.value;
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    render();
  });
});

clearCompletedButton.addEventListener('click', clearCompletedTasks);

function saveEdit(id, input) {
  if (!input) return;

  const newTitle = input.value.trim();
  if (!validateTitle(newTitle)) {
    input.classList.add('is-invalid');
    input.focus();
    return;
  }

  input.classList.remove('is-invalid');
  updateTaskTitle(id, newTitle);
}

function cancelEdit() {
  state.editingId = null;
  render();
}

taskList.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  const item = event.target.closest('.task');
  if (!target || !item) return;

  const id = item.dataset.id;
  const actions = {
    toggle: () => toggleTask(id),
    delete: () => deleteTask(id),
    edit: () => {
      state.editingId = id;
      render();
    },
    save: () => saveEdit(id, item.querySelector('[data-role="edit-input"]')),
    cancel: cancelEdit,
  };

  const action = target.dataset.action;
  if (action in actions) {
    actions[action]();
  }
});

taskList.addEventListener('keydown', (event) => {
  if (event.target.dataset.role !== 'edit-input') return;

  const item = event.target.closest('.task');
  if (!item) return;

  if (event.key === 'Enter') saveEdit(item.dataset.id, event.target);
  if (event.key === 'Escape') cancelEdit();
});

/* ========== Inicialização ========== */
render();
