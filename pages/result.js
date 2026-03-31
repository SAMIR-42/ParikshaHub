const params = new URLSearchParams(window.location.search);
const attemptId = params.get("attempt");

fetch("/api/my-result/" + attemptId)
  .then((res) => res.json())
  .then((data) => {
    if (!data.success) return;

    const r = data.info;

    document.getElementById("rName").textContent = r.student_name;
    document.getElementById("rClass").textContent = r.class;
    document.getElementById("rRoll").textContent = r.roll_no;
    document.getElementById("rMarks").textContent = r.total_marks;
    document.getElementById("rTotal").textContent = data.totalTestMarks;
  });
