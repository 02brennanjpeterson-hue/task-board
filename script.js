console.log("script.js is running");
const SUPABASE_URL = "https://zezcqbkuchyopgobgclx.supabase.co";
const SUPABASE_KEY = "sb_publishable_8t2hK-shADy1huvxD5z8AA_VllcZQTH";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserId = null;

// ---------- Message helpers ----------
const statusMessage = document.getElementById("status-message");
const formError = document.getElementById("form-error");

function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = "status-message " + (type || "");
}

function clearMessage() {
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

const addTaskButton = document.getElementById('add-task-button');
const taskDialog = document.getElementById('task-dialog');
const taskForm = document.getElementById('task-form');
const cancelButton = document.getElementById('cancel-button');

addTaskButton.addEventListener("click", function() {
  taskDialog.showModal();
});

cancelButton.addEventListener("click", function() {
  taskDialog.close();
});

let tasks = [];


// Lines deleted from last save because it broke the drag-and-drop functionality

function renderTasks() {
  document.querySelectorAll(".task-list").forEach(function (list) {
    list.innerHTML = "";
  });

  tasks.forEach(function (task) {
    const column = document.querySelector(`[data-status="${task.status}"] .task-list`);

    const card = document.createElement("div");
    card.classList.add("task-card");
    card.textContent = task.title;             
    card.draggable = true; 
    card.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", task.id);
    });
    column.appendChild(card);               
  });
}

document.querySelectorAll(".column").forEach(function (column) {
  // A card is being dragged over this column
  column.addEventListener("dragover", function (e) {
    e.preventDefault();
    column.classList.add("drag-over");                         // NEW: light it up
  });

  // The card left this column                                    NEW
  column.addEventListener("dragleave", function (e) {          // NEW
    if (!column.contains(e.relatedTarget)) {                   // NEW
      column.classList.remove("drag-over");                    // NEW
    }                                                          // NEW
  });                                                          // NEW

  // When a card is dropped on this column
  column.addEventListener("drop", async function (e) {
    e.preventDefault();
    column.classList.remove("drag-over");                      // NEW: light off

    // 1. Figure out which task was dragged and where it landed
    const draggedTaskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find(function (t) {
      return t.id === draggedTaskId;
    });
    const newStatus = column.dataset.status;

    // 2. Dropped in the same column? Nothing to do.
    if (!task || task.status === newStatus) return;

    // 3. Remember where it was, then move it on screen right away
    const oldStatus = task.status;
    task.status = newStatus;
    renderTasks();

    // 4. Tell Supabase about the move
    const { error } = await supabaseClient
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    // 5. If Supabase said no, put the card back
    if (error) {
      console.error("Could not move task:", error.message);
      task.status = oldStatus;
      renderTasks();
      showMessage("Couldn't move that task, so it was put back.", "error");
    }
  });
});
  

async function startGuestSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (data.session) {
    currentUserId = data.session.user.id;
  } else {
    const { data: anonData, error: anonError } = await supabaseClient.auth.signInAnonymously();

    if (anonError) {                                                              
      showMessage("Couldn't start your session. Please refresh the page.", "error"); 
      return;                                                                     
    }                                                                             

    currentUserId = anonData.user.id;
  }

  console.log("Guest id:", currentUserId);
  loadTasks();
}

startGuestSession();

async function loadTasks() {
  showMessage("Loading your tasks…");                                     

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load tasks:", error.message);
    showMessage("Couldn't load your tasks. Please refresh the page.", "error"); 
    return;
  }

  clearMessage();                                                               
  console.log("Loaded tasks:", data);
  tasks = data;
  renderTasks();
}

taskForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  // 1. Gather what the user typed into the form
  const newTask = {
    title: document.getElementById("task-title").value.trim(),
    description: document.getElementById("task-description").value,
    priority: document.getElementById("task-priority").value,
    due_date: document.getElementById("task-due-date").value || null,
    status: "todo",
    user_id: currentUserId,
  };

  // Don't save a task with no title
  if (newTask.title === "") {
    return;
  }

  // 2. Send it to Supabase to save
  const { data, error } = await supabaseClient
    .from("tasks")
    .insert(newTask)
    .select()
    .single();

  // 3. If it failed, say so and stop
  if (error) {
    console.error("Could not save task:", error.message);
    formError.textContent = "Couldn't save your task. Please try again.";    
    return;
  }

  // 4. It saved, so put it on the board
  formError.textContent = "";                                                     
  tasks.push(data);
  taskForm.reset();
  taskDialog.close();
  renderTasks();
});

// ---------- Dark mode ----------
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;          // tag the page
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙"; // swap the icon
  localStorage.setItem("theme", theme);                    // remember the choice
}

// On page load: use the saved choice, or match the computer's setting
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

// On click: flip it
themeToggle.addEventListener("click", function () {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === "dark" ? "light" : "dark");
});

// ---------- Small helper: build an element in one line ----------
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

// ---------- Work out how urgent a due date is ----------
function getDueInfo(dueDateText, status) {
  if (!dueDateText) return null;   // no due date = no badge

  // "2026-11-20" → year 2026, month 11, day 20
  const [year, month, day] = dueDateText.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);       // midnight, so we compare whole days

  const daysLeft = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
  const label = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (status === "done") return { text: label, level: "normal" };
  if (daysLeft < 0)      return { text: "Overdue · " + label, level: "overdue" };
  if (daysLeft === 0)    return { text: "Due today", level: "soon" };
  if (daysLeft === 1)    return { text: "Due tomorrow", level: "soon" };
  if (daysLeft <= 3)     return { text: "Due in " + daysLeft + " days", level: "soon" };
  return { text: label, level: "normal" };
}

// ---------- Draw every card on the board ----------
function renderTasks() {
  document.querySelectorAll(".task-list").forEach(function (list) {
    list.innerHTML = "";
  });

  tasks.forEach(function (task) {
    const column = document.querySelector(`[data-status="${task.status}"] .task-list`);
    if (!column) return;   // unknown status? skip it instead of crashing

    // The card itself
    const card = makeElement("div", "task-card");
    card.draggable = true;

    card.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", task.id);
      card.classList.add("dragging");      // fade it while dragging
    });
    card.addEventListener("dragend", function () {
      card.classList.remove("dragging");
    });

    // Title
    card.appendChild(makeElement("h3", "card-title", task.title));

    // Description (only if there is one)
    if (task.description) {
      card.appendChild(makeElement("p", "card-description", task.description));
    }

    // Bottom row of badges
    const meta = makeElement("div", "card-meta");

    if (task.priority) {
      const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
      meta.appendChild(makeElement("span", "badge priority-" + task.priority, priorityText));
    }

    const dueInfo = getDueInfo(task.due_date, task.status);
    if (dueInfo) {
      meta.appendChild(makeElement("span", "badge due-" + dueInfo.level, "📅 " + dueInfo.text));
    }

    if (meta.children.length > 0) {
      card.appendChild(meta);
    }

    column.appendChild(card);
  });
  document.querySelectorAll(".column").forEach(function (column) {
    const count = column.querySelectorAll(".task-card").length;
    column.querySelector(".task-count").textContent = count;
  });
}