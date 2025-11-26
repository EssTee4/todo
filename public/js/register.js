document.getElementById("registerBtn").addEventListener("click", registerUser);

function togglePassword() {
  const p = document.getElementById("password");
  p.type = p.type === "password" ? "text" : "password";
}
document.querySelectorAll(".show-password").forEach(el => el.addEventListener("click", togglePassword));

async function registerUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!username || !password) { alert("Both required"); return; }

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = "login.html";
    } else {
      alert(data.error || "Registration failed");
    }
  } catch (err) {
    console.error("register error", err);
    alert("Network error");
  }
}
