const storageKey = "mainichi-tasks-v1";
const focusKey = "mainichi-focus-v1";

const categories = ["家事", "リベ活", "資格", "英語", "海外ワーク", "自分時間"];
const priorityLabels = {
  3: { text: "優先度 高", className: "high" },
  2: { text: "優先度 中", className: "medium" },
  1: { text: "優先度 低", className: "low" },
};

const state = {
  tasks: loadTasks(),
  filter: "all",
  focus: localStorage.getItem(focusKey) || "",
};

const todayLabel = document.querySelector("#todayLabel");
const doneCount = document.querySelector("#doneCount");
const focusForm = document.querySelector("#focusForm");
const focusInput = document.querySelector("#focusInput");
const focusText = document.querySelector("#focusText");
const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const categoryInput = document.querySelector("#categoryInput");
const priorityInput = document.querySelector("#priorityInput");
const taskList = document.querySelector("#taskList");
const taskTemplate = document.querySelector("#taskTemplate");
const emptyState = document.querySelector("#emptyState");
const goalList = document.querySelector("#goalList");
const clearDoneButton = document.querySelector("#clearDoneButton");
const filterButtons = [...document.querySelectorAll(".filter-button")];

todayLabel.textContent = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "full",
}).format(new Date());

focusInput.value = state.focus;
render();

focusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.focus = focusInput.value.trim();
  localStorage.setItem(focusKey, state.focus);
  render();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  state.tasks.push({
    id: crypto.randomUUID(),
    title,
    category: categoryInput.value,
    priority: Number(priorityInput.value),
    done: false,
    createdAt: Date.now(),
  });

  taskInput.value = "";
  priorityInput.value = "2";
  saveTasks();
  render();
  taskInput.focus();
});

clearDoneButton.addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.done);
  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    render();
  });
});

taskList.addEventListener("click", (event) => {
  const taskItem = event.target.closest(".task-item");
  if (!taskItem) return;

  const task = state.tasks.find((item) => item.id === taskItem.dataset.id);
  if (!task) return;

  if (event.target.closest(".check-button")) {
    task.done = !task.done;
  }

  if (event.target.closest(".delete-button")) {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
  }

  saveTasks();
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function loadTasks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function getVisibleTasks() {
  return [...state.tasks]
    .filter((task) => {
      if (state.filter === "active") return !task.done;
      if (state.filter === "done") return task.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done);
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.createdAt - b.createdAt;
    });
}

function render() {
  renderFocus();
  renderTasks();
  renderGoals();
  doneCount.textContent = state.tasks.filter((task) => task.done).length;

  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderFocus() {
  focusText.textContent = state.focus ? `今日の軸：${state.focus}` : "今日の軸を決めると、迷った時に戻る場所になります。";
}

function renderTasks() {
  taskList.replaceChildren();
  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach((task) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    const priority = priorityLabels[task.priority] || priorityLabels[2];

    node.dataset.id = task.id;
    node.classList.toggle("done", task.done);
    node.querySelector(".check-button").textContent = task.done ? "✓" : "";
    node.querySelector(".task-title").textContent = task.title;
    node.querySelector(".category-pill").textContent = task.category;

    const priorityPill = node.querySelector(".priority-pill");
    priorityPill.textContent = priority.text;
    priorityPill.classList.add(priority.className);

    taskList.append(node);
  });

  emptyState.classList.toggle("visible", visibleTasks.length === 0);
}

function renderGoals() {
  goalList.replaceChildren();

  categories.forEach((category) => {
    const related = state.tasks.filter((task) => task.category === category);
    const done = related.filter((task) => task.done).length;
    const percent = related.length ? Math.round((done / related.length) * 100) : 0;

    const card = document.createElement("div");
    card.className = "goal-card";
    card.innerHTML = `
      <div class="goal-title-row">
        <span>${category}</span>
        <span class="goal-count">${done}/${related.length}</span>
      </div>
      <div class="progress-track" aria-label="${category}の進捗 ${percent}%">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
    `;
    goalList.append(card);
  });
}
