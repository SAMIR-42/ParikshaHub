// agar alredy login hai to bhej do dash pe
async function checkSession() {
  let res = await fetch("/api/teacher", {
    credentials: "include",//session check bro session check yahi to imp he
  });
  let data = await res.json();

  //agar session active he to kyu faltu me login page dikhana 
  if (data.loggedIn) {
    window.location.replace("/pages/dashboard.html");
  }
}

checkSession();

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();//login form sub pe reload rok diya

  //inp value li aur trim kiya
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value.trim();

  let emailError = document.getElementById("emailError");
  let passError = document.getElementById("passError");
//purane err clear kiye 
  emailError.textContent = "";
  passError.textContent = "";

  //validation kiya ki email aur password dono fill ho
  if (!email) {
    emailError.textContent = "Enter email";
    return;
  }

  if (!password) {
    passError.textContent = "Enter password";
    return;
  }
//backend se login req bheji
  try {
    let res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",//session maintain krne ke liye
      body: JSON.stringify({ email, password }),
    });

    let data = await res.json();

    if (data.success) {
      showPopup("Login successful");//login success ka popup dikhaya

      //dashboard ka fresh expe dene ke liye old flags hata diye
      sessionStorage.removeItem("typed");
      //custome popup dikhaye
      sessionStorage.removeItem("devicePopupShown");

      //thoda delay krke dash pe bheja
      setTimeout(() => {
        window.location.replace("dashboard.html");
      }, 1200);
    } else {
      showPopup(data.message);//agar login fail so backend se aaya msg dikhaya
    }
  } catch (err) {
    showPopup("Server error");//server error ka popup dikhaya
  }
});

//custom popup use kiye na ki default auraaa +++
function showPopup(msg) {
  let popup = document.getElementById("popup");

  popup.textContent = msg;

  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}
