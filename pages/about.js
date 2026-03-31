// smooth reveal animation
const cards = document.querySelectorAll(".card, .feature, .highlight");

cards.forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(40px)";
  el.style.transition = "all .6s ease";
});

const revealOnScroll = () => {
  const trigger = window.innerHeight * 0.85;
  cards.forEach((el) => {
    if (el.getBoundingClientRect().top < trigger) {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }
  });
};

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);
