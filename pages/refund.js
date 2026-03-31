// reveal animation
const sections = document.querySelectorAll("section");

sections.forEach((sec) => {
  sec.style.opacity = "0";
  sec.style.transform = "translateY(30px)";
  sec.style.transition = "all .6s ease";
});

const reveal = () => {
  const trigger = window.innerHeight * 0.85;
  sections.forEach((sec) => {
    if (sec.getBoundingClientRect().top < trigger) {
      sec.style.opacity = "1";
      sec.style.transform = "translateY(0)";
    }
  });
};

window.addEventListener("scroll", reveal);
window.addEventListener("load", reveal);
