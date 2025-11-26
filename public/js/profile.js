// state
let tasks = [];
let draggedTask = null;

// helper to detect HTML redirect to login
function handlePotentialHtmlRedirect(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    window.location.href = "/login.html";
    return true;
  }
  return false;
}

async function loadTasks() {
  try {
    const res = await fetch("/tasks", { credentials: "include" });
    if (handlePotentialHtmlRedirect(res)) return;
    tasks = await res.json();
    renderTasks();
  } catch (err) {
    console.error("loadTasks error", err);
    alert("Failed to load tasks");
  }
}

function renderTasks() {
  document.getElementById("todo").innerHTML = "";
  document.getElementById("inProgress").innerHTML = "";
  document.getElementById("completed").innerHTML = "";

  tasks.forEach(t => {
    const el = document.createElement("div");
    el.className = "task";
    el.draggable = true;
    el.textContent = t.task;
    el.dataset.id = t.id;

    el.addEventListener("dragstart", () => {
      draggedTask = el;
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      draggedTask = null;
    });

    el.addEventListener("contextmenu", e => {
      e.preventDefault();
      el.classList.toggle("selected");
    });

    const container = document.getElementById(t.status);
    if (container) container.appendChild(el);
  });
}

// drop zones
document.querySelectorAll(".task-list").forEach(list => {
  list.addEventListener("dragover", e => e.preventDefault());
  list.addEventListener("drop", async e => {
    e.preventDefault();
    if (!draggedTask) return;
    const id = draggedTask.dataset.id;
    const newStatus = list.parentElement.dataset.status;

    // optimistic move in UI
    list.appendChild(draggedTask);

    try {
      const res = await fetch(`/tasks/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (handlePotentialHtmlRedirect(res)) return;
      const j = await res.json();
      if (!j.success) alert("Failed to move task");
      else {
        const t = tasks.find(x => x.id == id);
        if (t) t.status = newStatus;
      }
    } catch (err) {
      console.error("drop error", err);
      alert("Move failed");
    }
  });
});

// add task
document.getElementById("addBtn").addEventListener("click", async () => {
  const text = document.getElementById("taskInput").value.trim();
  if (!text) return alert("Enter task");
  try {
    const res = await fetch("/tasks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: text, status: "todo" })
    });
    if (handlePotentialHtmlRedirect(res)) return;
    const data = await res.json();
    if (!data.success) return alert(data.error || "Failed to add task");
    tasks.push({ id: data.id, task: text, status: "todo" });
    document.getElementById("taskInput").value = "";
    renderTasks();
  } catch (err) {
    console.error("addTask error", err);
    alert("Failed to add task");
  }
});

// delete selected
document.getElementById("deleteSelectedBtn").addEventListener("click", async () => {
  const selected = document.querySelectorAll(".task.selected");
  if (!selected.length) return alert("No tasks selected");
  try {
    for (const el of Array.from(selected)) {
      const id = el.dataset.id;
      const res = await fetch(`/tasks/${id}`, { method: "DELETE", credentials: "include" });
      if (handlePotentialHtmlRedirect(res)) return;
      const j = await res.json();
      if (!j.success) alert("Failed to delete some tasks");
      tasks = tasks.filter(t => t.id != id);
      el.remove();
    }
  } catch (err) {
    console.error("delete error", err);
    alert("Delete failed");
  }
});

// logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    await fetch("/logout", { credentials: "include" });
  } finally {
    window.location.href = "/login.html";
  }
});

// load on start
loadTasks();
