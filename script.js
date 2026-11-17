console.log("script.js is running");
const SUPABASE_URL = "https://zezcqbkuchyopgobgclx.supabase.co";
const SUPABASE_KEY = "sb_publishable_8t2hK-shADy1huvxD5z8AA_VllcZQTH";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserId = null;

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
  // Allow cards to be dropped on this column
  column.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  // When a card is dropped on this column
  column.addEventListener("drop", async function (e) {
    e.preventDefault();

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
    }
  });
});
  

async function startGuestSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (data.session) {
    currentUserId = data.session.user.id;
  } else {
    const { data: anonData, error: anonError } = await supabaseClient.auth.signInAnonymously();
    currentUserId = anonData.user.id;
  }

  console.log("Guest id:", currentUserId);
  loadTasks();
}

startGuestSession();

async function loadTasks() {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Could not load tasks:", error.message);
    return;
  }
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
    return;
  }

  // 4. It saved, so put it on the board
  tasks.push(data);
  taskForm.reset();
  taskDialog.close();
  renderTasks();
});

