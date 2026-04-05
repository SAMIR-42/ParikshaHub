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


document.getElementById("refundMailBtn").onclick = () => {
  const email = "parikshahub@gmail.com";

  const subject = encodeURIComponent("Refund Request - ParikshaHub");

  const bodyText = `Hello ParikshaHub Team,

I would like to request a refund for my payment.

-----------------------------
Name: [Enter your name]
Registered Email: [Enter your email]
Order ID: [Enter order ID]
Payment ID: [Enter payment ID]
Amount Paid: ₹[Enter amount]
Date of Payment: [Enter date]
-----------------------------

Reason:
[Write your issue]

Attach:
- Payment Screenshot
- Error Screenshot (if any)

Thank you.`;

  const body = encodeURIComponent(bodyText);

  // ✅ 1. Try opening mail app (Gmail app if default)
  const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;

  // ✅ 2. Fallback to Gmail web (if app not opened)
  setTimeout(() => {
    const gmailWeb = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailWeb, "_blank");
  }, 1200); // thoda delay dena important hai
};