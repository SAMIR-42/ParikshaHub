// if already logged in go to dashboard

async function checkSession() {
  let res = await fetch("/api/teacher", {
    credentials: "include",
  });

  let data = await res.json();

  if (data.loggedIn) {
    window.location.href = "/pages/dashboard.html";
  }
}

checkSession();

const form = document.getElementById("signupForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let name = document.getElementById("name").value.trim();
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value.trim();

  let nameError = document.getElementById("nameError");
  let emailError = document.getElementById("emailError");
  let passError = document.getElementById("passError");

  nameError.textContent = "";
  emailError.textContent = "";
  passError.textContent = "";

  /* validation */

  let nameRegex = /^[A-Za-z ]{3,40}$/;
  let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let passRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&]).{8,}$/;

  if (!nameRegex.test(name)) {
    nameError.textContent = "Enter valid name";
    return;
  }

  if (!emailRegex.test(email)) {
    emailError.textContent = "Invalid email";
    return;
  }

  if (!passRegex.test(password)) {
    passError.textContent =
      "Password must contain uppercase, number, special char";
    return;
  }

  /* signup API call */
  try {
    let res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });

    let data = await res.json();

    if (data.success) {
      showPopup("✅ " + data.message);

      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 1500);
    } else {
      showPopup("❌ " + data.message);
    }
  } catch (err) {
    showPopup("Server error");
  }
});

function showPopup(msg) {
  let popup = document.getElementById("customPopup");

  popup.textContent = msg;

  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}
