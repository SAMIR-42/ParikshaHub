// if already logged in go to dashboard

async function checkSession() {
  let res = await fetch("/api/teacher", {
    credentials: "include",
  });
  let data = await res.json();

  if (data.loggedIn) {
    window.location.replace("/pages/dashboard.html");
  }
}

checkSession();

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value.trim();

  let emailError = document.getElementById("emailError");
  let passError = document.getElementById("passError");

  emailError.textContent = "";
  passError.textContent = "";

  if (!email) {
    emailError.textContent = "Enter email";
    return;
  }

  if (!password) {
    passError.textContent = "Enter password";
    return;
  }

  try {
    let res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    let data = await res.json();

    if (data.success) {
      showPopup("Login successful");

      //dashboard pe typewriter chalane ke liye flag
      sessionStorage.removeItem("typed");
      //old best experience popup remove
      sessionStorage.removeItem("devicePopupShown");

      setTimeout(() => {
        window.location.replace("dashboard.html");
      }, 1200);
    } else {
      showPopup(data.message);
    }
  } catch (err) {
    showPopup("Server error");
  }
});

function showPopup(msg) {
  let popup = document.getElementById("popup");

  popup.textContent = msg;

  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}
