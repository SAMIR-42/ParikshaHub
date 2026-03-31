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

// Smooth scroll for navigation links

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

// Navbar shadow on scroll

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 20) {
    navbar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
  } else {
    navbar.style.boxShadow = "none";
  }
});

// Hero button scroll

const heroBtn = document.querySelector(".secondary-btn");

if (heroBtn) {
  heroBtn.addEventListener("click", () => {
    const section = document.querySelector(".workflow");

    section.scrollIntoView({
      behavior: "smooth",
    });
  });
}

// Prevent accidental image drag

document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("dragstart", (e) => e.preventDefault());
});
