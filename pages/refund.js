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

  const body = encodeURIComponent(
`Hello ParikshaHub Team,

I would like to request a refund for my payment.

Please find my details below:

-----------------------------
Name: [Enter your name]
Registered Email: [Enter your email]
Order ID: [Enter order ID]
Payment ID: [Enter payment ID]
Amount Paid: ₹[Enter amount]
Date of Payment: [Enter date]
-----------------------------

Reason for Refund:
[Explain your issue clearly]

Proof Attached:
- Payment Screenshot (Required)
- Any Error Screenshot (if applicable)

I confirm that the above information is correct.

Thank you.`
  );

  const mailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

  window.open(mailLink, "_blank");
};