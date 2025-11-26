document.getElementById("loginBtn").addEventListener("click", loginUser);

function togglePassword() {
  const p = document.getElementById("password");
  p.type = p.type === "password" ? "text" : "password";
}
document.querySelectorAll(".show-password").forEach(el => el.addEventListener("click", togglePassword));

async function loginUser() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!username || !password) { alert("Enter username & password"); return; }

  try {
    const res = await fetch("/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = "/profile";
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error("login error", err);
    alert("Network error");
  }
}
