//admin login
const form = document.getElementById("adminLoginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = form.querySelector('input[type="email"]').value;
  const password = form.querySelector('input[type="password"]').value;

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.success) {
    window.location.href = "admin.html";
  } else {
    alert("Invalid credentials");
  }
});



//admin logout

document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.replace("admin-login.html");
};
