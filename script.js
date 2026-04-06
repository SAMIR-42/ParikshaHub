// agar teacher already logged in hai toh usko dashboard pe redirect kar do, agar loggin nahi he to  10 seconds ke baad mobile device ke liye popup show karo
async function checkSession() {
  let res = await fetch("/api/teacher", {
    credentials: "include",
  });
  let data = await res.json();

  if (data.loggedIn) {
    window.location.href = "/pages/dashboard.html";
    return;
  }

  setTimeout(showDevicePopup, 10000);
}

checkSession();

// mobile user ko better experience dene ke liye ek popup show karo jo better experience ke liye desktop use kro
function showDevicePopup() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
//agar mobile nahi he to popup na dikhao
  if (!isMobile) return;

  if (sessionStorage.getItem("devicePopupShown")) return;

  const popup = document.getElementById("devicePopup");
  const okBtn = document.getElementById("popupOk");

  if (!popup || !okBtn) return;

  popup.classList.add("show");
//agar ak bar popup dikh gaya to save kr do ki popup dikha diya he
  sessionStorage.setItem("devicePopupShown", "yes");
//popup pe ok dabane se close ho jayega
  okBtn.onclick = () => {
    popup.classList.remove("show");
  };
//ok na bhi dabaye apne aap 10sec baad close ho jayega
  setTimeout(() => {
    popup.classList.remove("show");
  }, 10000);
}

// Smooth scroll for navbar link (ui smooth feel ke liye)
document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href");

    if (targetId === "#") return;

    e.preventDefault();

    const target = document.querySelector(targetId);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
      });
    }
  });
});

// Navbar pe scroll karne pe shadow add karo (thoda sa depth dene ke liye)
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    navbar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
  } else {
    navbar.style.boxShadow = "none";
  }
});

//img ko drag hone se rok rahe clean ux ke liye
document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("dragstart", (e) => e.preventDefault());
});
