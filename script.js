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

taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const task = {
    id: crypto.randomUUID(),   // Generates a unique ID for each task 
    title: document.getElementById("task-title").value,
    description: document.getElementById("task-description").value, 
    priority: document.getElementById("task-priority").value,
    due_date: document.getElementById("task-due-date").value,
    status: "todo",
  };

  tasks.push(task); // Add the new task to the tasks array
  taskForm.reset(); // Clear the form after submission
  taskDialog.close(); // Close the task dialog after submission
  renderTasks(); // Re-render the list of tasks
});

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
  column.addEventListener("dragover", function (e) {
    e.preventDefault();
  });  
    column.addEventListener("drop", function (e) {
      e.preventDefault();
      const draggedTaskId = e.dataTransfer.getData("text/plain");
      const task = tasks.find(function (t) {
        return t.id === draggedTaskId;
      });
      task.status = column.dataset.status;
      renderTasks();
    });
  
  });