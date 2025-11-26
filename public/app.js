window.onload = loadTasks;

async function loadTasks() {
    const res = await fetch("/tasks");
    const tasks = await res.json();

    document.getElementById("todoList").innerHTML = "";
    document.getElementById("progressList").innerHTML = "";
    document.getElementById("doneList").innerHTML = "";

    tasks.forEach(t => {
        const li = document.createElement("li");
        li.className = "task";
        li.draggable = true;
        li.dataset.id = t.id;
        li.innerHTML = t.task;

        addDragEvents(li);

        if (t.status === "todo") todoList.appendChild(li);
        if (t.status === "progress") progressList.appendChild(li);
        if (t.status === "done") doneList.appendChild(li);
    });

    setupColumnDrag();
}

// Add task
async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    await fetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: text })
    });

    taskInput.value = "";
    loadTasks();
}

// Drag logic
let dragged = null;

function addDragEvents(item) {
    item.addEventListener("dragstart", () => {
        dragged = item;
        item.classList.add("dragging");
    });

    item.addEventListener("dragend", () => {
        dragged = null;
        item.classList.remove("dragging");
    });
}

function setupColumnDrag() {
    document.querySelectorAll(".taskColumn").forEach(col => {
        col.addEventListener("dragover", e => e.preventDefault());

        col.addEventListener("drop", async e => {
            e.preventDefault();
            if (!dragged) return;

            col.appendChild(dragged);

            const newStatus = col.dataset.status;
            const id = dragged.dataset.id;

            // Update DB
            await fetch("/tasks/move/" + id, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            loadTasks();
        });
    });
}

// Clear entire column
async function clearColumn(status) {
    await fetch("/tasks/clear/" + status, { method: "DELETE" });
    loadTasks();
}

// Logout
async function logout() {
    await fetch("/logout");
    location.href = "login.html";
}
