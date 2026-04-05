// 🔐 Protect page
async function checkAdmin() {
  const res = await fetch("/api/admin/check");

  if (!res.ok) {
    window.location.replace("admin-login.html");
  }
}

checkAdmin();

// 🚪 Logout
document.getElementById("logoutBtn").onclick = async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.replace("admin-login.html");
};

// 👥 Load total teachers count
async function loadTeacherCount() {
  const res = await fetch("/api/admin/teachers/count");
  const data = await res.json();

  if (data.success) {
    document.getElementById("teacherCount").innerText = data.total;
  }
}

loadTeacherCount();

// 📂 Open panel when card clicked
document.getElementById("teachersCard").onclick = () => {
  document.getElementById("teacherPanel").classList.add("show");
  loadTeachers();
};

function closePanel() {
  document.getElementById("teacherPanel").classList.remove("show");
}

// 👨‍🏫 Load teachers list
async function loadTeachers() {
  const search = document.getElementById("teacherSearch").value;

  const res = await fetch(`/api/admin/teachers?search=${search}`);
  const data = await res.json();

  if (!data.success) return;

  const tbody = document.getElementById("teacherTable");
  tbody.innerHTML = "";

  data.teachers.forEach((t) => {
    tbody.innerHTML += `
      <tr>
        <td>${t.id}</td>
        <td>${t.name}</td>
        <td>${t.email}</td>
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
        <td><button class="delete-btn">Delete</button></td>
      </tr>
    `;
  });
}

// 🧪 Load total tests count
async function loadTestCount() {
  const res = await fetch("/api/admin/tests/count");
  const data = await res.json();

  if (data.success) {
    document.getElementById("testCount").innerText = data.total;
  }
}

loadTestCount();

// 🧪 Open tests panel
document.getElementById("testsCard").onclick = () => {
  document.getElementById("testsPanel").classList.add("show");
  loadTests();
};

function closeTestsPanel() {
  document.getElementById("testsPanel").classList.remove("show");
}

// 🧪 Load tests overview
async function loadTests() {
  const search = document.getElementById("testSearch").value;

  const res = await fetch(`/api/admin/tests?search=${search}`);
  const data = await res.json();

  if (!data.success) return;

  const tbody = document.getElementById("testsTable");
  tbody.innerHTML = "";

  data.data.forEach((t) => {
    tbody.innerHTML += `
      <tr>
        <td>${t.teacher_id}</td>
        <td>${t.name}</td>
        <td>${t.total_tests}</td>
        <td>${new Date(t.last_created).toLocaleDateString()}</td>
      </tr>
    `;
  });
}

// 🎓 Load total unique students

async function loadStudents() {
  const search = document.getElementById("studentSearch").value;

  const res = await fetch(`/api/admin/students?search=${search}`);
  const data = await res.json();

  if (!data.success) return;

  const tbody = document.getElementById("studentsTable");
  tbody.innerHTML = "";

  data.students.forEach((s) => {
    tbody.innerHTML += `
      <tr>
        <td>${s.student_name}</td>
        <td>${s.roll_no}</td>
        <td>${s.class}</td>
        <td>${new Date(s.last_attempt).toLocaleString()}</td>
      </tr>
    `;
  });
}

// loadStudentCount();

// 🎓 Load total students count
async function loadStudentCount() {
  const res = await fetch("/api/admin/students/count");
  const data = await res.json();

  if (data.success) {
    document.getElementById("studentCount").innerText = data.total;
  }
}

loadStudentCount();

// 🎓 Open students panel
document.getElementById("studentsCard").onclick = () => {
  document.getElementById("studentsPanel").classList.add("show");
  loadStudents();
};

function closeStudentsPanel() {
  document.getElementById("studentsPanel").classList.remove("show");
}

//revenue panel opn close

document.getElementById("revenueCard").onclick = () => {
  document.getElementById("revenuePanel").classList.add("show");
  loadRevenue();
};

function closeRevenuePanel() {
  document.getElementById("revenuePanel").classList.remove("show");
}

//load revenue data

async function loadRevenue() {
  const search = document.getElementById("revenueSearch").value;

  const res = await fetch(`/api/admin/revenue?search=${search}`);
  const data = await res.json();

  if (!data.success) return;

  const tbody = document.getElementById("revenueTable");
  tbody.innerHTML = "";

  data.data.forEach((r) => {
    tbody.innerHTML += `
      <tr>
        <td>${r.name}</td>
        <td>${r.email}</td>
        <td>${r.order_id}</td>
        <td>₹${r.amount}</td>
        <td><span class="rev-status-ok">Success</span></td>
        <td>${new Date(r.payment_time).toLocaleString()}</td>
      </tr>
    `;
  });
}
//total revenue load

async function loadRevenueAmount() {
  const res = await fetch("/api/admin/revenue/total");
  const data = await res.json();

  if (data.success) {
    document.getElementById("revenueAmount").innerText = "₹" + data.total;
  }
}

loadRevenueAmount();

//dow revinue csv file

document.getElementById("downloadBtn").onclick = () => {
  window.open("/api/admin/revenue/download");
};
