// check session + get teacher name

async function loadTeacher() {
  let res = await fetch("/api/teacher", {
    credentials: "include",
  });
  let data = await res.json();

  if (!data.loggedIn) {
    window.location = "/index.html";
    return;
  }

  const welcomeEl = document.getElementById("welcomeText");

  const text = "Welcome, " + data.name;

  let i = 0;

  // agar pehli bar login hua hai
  if (!sessionStorage.getItem("typed")) {
    welcomeEl.textContent = "";

    function typeWriter() {
      if (i < text.length) {
        welcomeEl.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 160);
      } else {
        sessionStorage.setItem("typed", "done");
      }
    }

    typeWriter();
  } else {
    welcomeEl.textContent = text;
  }
  setTimeout(showDevicePopup, 10000);
}

loadTeacher();

//clear previous payment history

// clear previous payment history
history.replaceState(null, "", "/pages/dashboard.html");

//disable back btn
history.pushState(null, null, location.href);

window.onpopstate = function () {
  history.pushState(null, null, location.href);
};

// logout

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await fetch("/api/logout", {
    credentials: "include",
  });

  window.location.replace("/index.html");
});

// mobile device popup

function showDevicePopup() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isMobile) return;

  if (sessionStorage.getItem("devicePopupShown")) return;

  const popup = document.getElementById("devicePopup");
  const okBtn = document.getElementById("popupOk");

  popup.classList.add("show");

  sessionStorage.setItem("devicePopupShown", "yes");

  okBtn.onclick = () => {
    popup.classList.remove("show");
  };

  setTimeout(() => {
    popup.classList.remove("show");
  }, 10000);
}
//create test btn and popup
const createBtn = document.getElementById("createTestBtn");
const createPopup = document.getElementById("createTestPopup");
const closeCreate = document.getElementById("closeCreatePopup");

createBtn.onclick = () => {
  createPopup.classList.add("show");
};

closeCreate.onclick = () => {
  createPopup.classList.remove("show");
};

/* mobile drag close */

let startY = 0;
const popupBox = document.querySelector(".create-popup-box");
const dragHandle = document.querySelector(".drag-handle"); // upar se pakad ke drag

// touchstart sirf drag handle pe
dragHandle.addEventListener("touchstart", (e) => {
  startY = e.touches[0].clientY;
});

dragHandle.addEventListener("touchmove", (e) => {
  let moveY = e.touches[0].clientY;
  if (moveY - startY > 120) {
    createPopup.classList.remove("show");
  }
});

//add question js

const addQBtn = document.getElementById("addQuestionBtn");
const questionsContainer = document.getElementById("questionsContainer");
let questionCount = 0;

// Add first question automatically when popup opens
createBtn.onclick = () => {
  createPopup.classList.add("show");
  if (questionCount === 0) addQuestion();
};

addQBtn.onclick = addQuestion;

function addQuestion() {
  questionCount++;
  const qCard = document.createElement("div");
  qCard.classList.add("question-card");
  qCard.innerHTML = `
  <h4>Question ${questionCount}</h4>
  <span class="remove-q"><i class="fa-solid fa-xmark"></i></span>
  <input type="text" placeholder="Enter question text" class="q-text"/>
  <input type="file" accept="image/*" class="q-img"/>
  <div class="options">
    <input type="text" placeholder="Option A" class="optA"/>
    <input type="text" placeholder="Option B" class="optB"/>
    <input type="text" placeholder="Option C" class="optC"/>
    <input type="text" placeholder="Option D" class="optD"/>
  </div>
  <input type="number" placeholder="Marks" class="q-marks" min="1"/>
  <input type="number" placeholder="Time (minutes)" class="q-time" min="1"/>
  <select class="correct-option">
    <option value="">Select Correct Option</option>
    <option value="A">A</option>
    <option value="B">B</option>
    <option value="C">C</option>
    <option value="D">D</option>
  </select>
`;

  questionsContainer.appendChild(qCard);

  // Remove question
  qCard.querySelector(".remove-q").addEventListener("click", () => {
    qCard.remove();
    questionCount--;
    updateQuestionNumbers();
  });
}

function updateQuestionNumbers() {
  const allQ = document.querySelectorAll(".question-card h4");
  allQ.forEach((el, i) => (el.textContent = `Question ${i + 1}`));
}

//create test btn root
document
  .getElementById("createTestFinal")
  .addEventListener("click", async () => {
    const subject = document.getElementById("inputSubject").value;
    const className = document.getElementById("inputClass").value;

    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("className", className);

    const questions = [];

    document.querySelectorAll(".question-card").forEach((q, index) => {
      const imgFile = q.querySelector(".q-img").files[0];

      if (imgFile) {
        formData.append("images_" + index, imgFile); // 👈 image bhej di
      }

      questions.push({
        text: q.querySelector(".q-text").value,
        image: "",

        A: q.querySelector(".optA").value,
        B: q.querySelector(".optB").value,
        C: q.querySelector(".optC").value,
        D: q.querySelector(".optD").value,
        correct: q.querySelector(".correct-option").value,
        marks: q.querySelector(".q-marks").value,
        time: q.querySelector(".q-time").value,
      });
    });

    formData.append("questions", JSON.stringify(questions));

    const res = await fetch("/api/create-payment", {
      credentials: "include",
      method: "POST",
      body: formData, // ❗ JSON nahi — FormData
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Payment failed");
      return;
    }

    if (data && data.payment_session_id) {
      const mode = data.cashfree_mode === "sandbox" ? "sandbox" : "production";
      const cashfree = Cashfree({ mode });
      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_self",
      });
    }
  });

// ================================
// LOAD TEACHER TESTS
// ================================

async function loadTests() {
  const res = await fetch("/api/my-tests", {
    credentials: "include",
  });

  const data = await res.json();

  if (!data.success) return;

  const container = document.getElementById("testsContainer");

  container.innerHTML = "";

  data.tests.forEach((test) => {
    const card = document.createElement("div");

    card.className = "test-card";

    const date = new Date(test.created_at).toLocaleDateString();
    card.innerHTML = `
<div class="test-top">
<div class="test-subject">${test.subject}</div>

<div class="test-actions">

<i class="fa-solid fa-link copy-link" data-id="${test.id}"></i>
<i class="fa-solid fa-qrcode qr-test" data-id="${test.id}"></i>
<i class="fa-solid fa-trash delete-test" data-id="${test.id}"></i>
</div>

</div>

<div class="test-class">Class: ${test.class}</div>
<div class="test-date">Created: ${date}</div>

<button class="result-btn" data-id="${test.id}">View Result</button>

`;

    container.appendChild(card);
  });
}

loadTests();

// ================================
// DELETE TEST
// ================================

let deleteId = null;

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-test")) {
    deleteId = e.target.dataset.id;

    document.getElementById("deletePopup").classList.add("show");
  }
});

// cancel

document.getElementById("cancelDelete").onclick = () => {
  document.getElementById("deletePopup").classList.remove("show");
};

// confirm delete

document.getElementById("confirmDelete").onclick = async () => {
  if (!deleteId) return;

  await fetch("/api/delete-test/" + deleteId, {
    credentials: "include",
    method: "DELETE",
  });

  document.getElementById("deletePopup").classList.remove("show");

  // reload tests
  loadTests();
};

// ================================
// SEARCH TEST BY CLASS
// ================================

document.getElementById("testSearch").addEventListener("input", function () {
  const value = this.value.toLowerCase();

  document.querySelectorAll(".test-card").forEach((card) => {
    const text = card.innerText.toLowerCase();

    card.style.display = text.includes(value) ? "block" : "none";
  });
});

//test view and edit delete popup open
let currentTestId = null;
let changesMade = false;

document.addEventListener("click", async (e) => {
  const card = e.target.closest(".test-card");
  if (!card) return;

  // ❌ Agar kisi action button pe click hua to edit popup mat kholo
  if (
    e.target.closest(".delete-test") ||
    e.target.closest(".copy-link") ||
    e.target.closest(".result-btn") ||
    e.target.closest(".qr-test")
  ) {
    return;
  }

  const id = card.querySelector(".delete-test").dataset.id;
  currentTestId = id;
  openEditTest(id);
});

// stop bubbling for action buttons
document.addEventListener("click", (e) => {
  if (
    e.target.closest(".delete-test") ||
    e.target.closest(".copy-link") ||
    e.target.closest(".result-btn") ||
    e.target.closest(".qr-test")
  ) {
    e.stopPropagation();
  }
});

// and load test inside popup
async function openEditTest(id) {
  const res = await fetch("/api/test/" + id, {
    credentials: "include",
  });
  const data = await res.json();

  if (!data.success) return;

  const totalMinutes = data.questions.reduce(
    (sum, q) => sum + (q.time_minutes || 0),
    0
  );

  const totalMarks = data.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  let durationText = "";
  if (totalMinutes >= 60) {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    durationText = `${hrs} hr ${mins} min`;
  } else {
    durationText = `${totalMinutes} min`;
  }

  document.getElementById(
    "editMetaInfo"
  ).innerHTML = `Subject: <b>${data.test.subject}</b> |
  Class: <b>${data.test.class}</b> |
  Questions: <b>${data.questions.length}</b> |
  Total Time: <b>${durationText}</b> |
  Total Marks: <b>${totalMarks}</b>`;

  document.getElementById("editSubject").value = data.test.subject;
  document.getElementById("editClass").value = data.test.class;

  const container = document.getElementById("editQuestions");
  container.innerHTML = "";

  data.questions.forEach((q, index) => {
    const div = document.createElement("div");

    div.className = "edit-question";

    div.innerHTML = `

<div class="q-header">

<b>Question ${index + 1}</b>
<i class="fa-solid fa-trash q-delete" data-id="${q.id}"></i>
</div>

<label>Question Text</label>
<textarea class="edit-qtext" data-id="${q.id}">${q.question_text}</textarea>

${
  q.question_image
    ? `
<div class="edit-img-preview">
  <img src="${q.question_image}" onclick="openImagePopup('${q.question_image}')">
  <label class="change-img-btn">
    <i class="fa-solid fa-image"></i> Change Image
    <input type="file" accept="image/*" class="edit-img-input" data-id="${q.id}" hidden>
  </label>
</div>
`
    : `
<label class="change-img-btn noimg">
  <i class="fa-solid fa-image"></i> Add Image
  <input type="file" accept="image/*" class="edit-img-input" data-id="${q.id}" hidden>
</label>
`
}

<div class="options-grid">
<label>Option A</label>
<input class="edit-A" data-id="${q.id}" value="${q.option_a}">

<label>Option B</label>
<input class="edit-B" data-id="${q.id}" value="${q.option_b}">

<label>Option C</label>
<input class="edit-C" data-id="${q.id}" value="${q.option_c}">

<label>Option D</label>
<input class="edit-D" data-id="${q.id}" value="${q.option_d}">

</div>

<label>Correct Answer</label>
<select class="edit-correct" data-id="${q.id}">
<option value="A" ${q.correct_option == "A" ? "selected" : ""}>A</option>
<option value="B" ${q.correct_option == "B" ? "selected" : ""}>B</option>
<option value="C" ${q.correct_option == "C" ? "selected" : ""}>C</option>
<option value="D" ${q.correct_option == "D" ? "selected" : ""}>D</option>
</select>

<div class="q-meta">

<label>Marks</label>
<input type="number" value="${q.marks}" disabled>

<label>Time (minutes)</label>
<input type="number" value="${q.time_minutes}" disabled>

</div>

`;

    container.appendChild(div);
  });

  document.getElementById("editTestPopup").classList.add("show");
}
//edit test auto save logic
let timer;

document.addEventListener("input", (e) => {
  if (!(e.target.dataset && e.target.dataset.id)) return;

  clearTimeout(timer);

  timer = setTimeout(async () => {
    const id = e.target.dataset.id;
    let field = "";
    let value = e.target.value;

    if (e.target.classList.contains("edit-qtext")) field = "question_text";
    if (e.target.classList.contains("edit-A")) field = "option_a";
    if (e.target.classList.contains("edit-B")) field = "option_b";
    if (e.target.classList.contains("edit-C")) field = "option_c";
    if (e.target.classList.contains("edit-D")) field = "option_d";
    if (e.target.classList.contains("edit-correct")) field = "correct_option";

    await fetch("/api/update-question/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ field, value }),
    });
  }, 500); // 0.5 sec delay
});

//teacher size edit panel me img change live upload root

document.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("edit-img-input")) return;

  const qid = e.target.dataset.id;
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/update-question-image/" + qid, {
    method: "PUT",
    body: formData,
  });

  const data = await res.json();
  if (!data.success) return;

  // 🔥 instant UI update
  const imgEl = e.target.closest(".edit-img-preview")?.querySelector("img");
  if (imgEl) {
    imgEl.src = data.newPath + "?t=" + Date.now();
    imgEl.setAttribute("onclick", `openImagePopup('${data.newPath}')`);
  } else {
    // no image before → reload popup
    openEditTest(currentTestId);
  }

  changesMade = true;
});

//teacher side img popup open close
function openImagePopup(src) {
  document.getElementById("imgPopup").style.display = "flex";
  document.getElementById("popupImg").src = src;
}
function closeImagePopup() {
  document.getElementById("imgPopup").style.display = "none";
}

//delete qn logic inside test
let deleteQuestionId = null;
let deleteQuestionEl = null;

// open popup
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("q-delete")) {
    deleteQuestionId = e.target.dataset.id;
    deleteQuestionEl = e.target.closest(".edit-question");

    document.getElementById("deleteQPopup").classList.add("show");
  }
});

// cancel
document.getElementById("cancelQDelete").onclick = () => {
  document.getElementById("deleteQPopup").classList.remove("show");
};

// confirm delete
document.getElementById("confirmQDelete").onclick = async () => {
  if (!deleteQuestionId) return;

  await fetch("/api/delete-question/" + deleteQuestionId, {
    credentials: "include",
    method: "DELETE",
  });

  // 💥 INSTANT UI REMOVE
  deleteQuestionEl.remove();

  document.getElementById("deleteQPopup").classList.remove("show");

  changesMade = true;
};

//close test view edit popup
const editPopup = document.getElementById("editTestPopup");
const closeEditBtn = document.getElementById("closeEditPopup");

closeEditBtn.addEventListener("click", () => {
  editPopup.classList.remove("show");
  if (changesMade) {
    loadTests();
    changesMade = false;
  }
});

/* outside click close */
editPopup.addEventListener("click", (e) => {
  if (e.target === editPopup) {
    editPopup.classList.remove("show");
  }
});

// const totalMarks = data.questions.reduce((sum, q) => sum + (q.marks || 0), 0);

//sub and class edit and autosave root
document
  .getElementById("editSubject")
  .addEventListener("input", updateTestMeta);
document.getElementById("editClass").addEventListener("input", updateTestMeta);

async function updateTestMeta() {
  const subject = document.getElementById("editSubject").value;
  const className = document.getElementById("editClass").value;

  await fetch("/api/update-test/" + currentTestId, {
    credentials: "include",
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      className,
    }),
  });

  changesMade = true;
}
//copy test link js root
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("copy-link")) {
    const testId = e.target.dataset.id;

    const link = `${window.location.origin}/pages/exam.html?tid=${testId}`;

    navigator.clipboard.writeText(link).then(() => {
      showCopyPopup();
    });
  }
});

function showCopyPopup() {
  const popup = document.getElementById("copyPopup");
  popup.classList.add("show");

  setTimeout(() => popup.classList.remove("show"), 2000);
}

// QR code generate
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("qr-test")) {
    const testId = e.target.dataset.id;

    const link = `${window.location.origin}/pages/exam.html?tid=${testId}`;

    const qrBox = document.getElementById("qrPopup");
    const qrCodeDiv = document.getElementById("qrCode");

    qrCodeDiv.innerHTML = "";

    new QRCode(qrCodeDiv, {
      text: link,
      width: 220,
      height: 220,
    });

    qrBox.classList.add("show");
  }
});

// close qr popup
document.getElementById("closeQrPopup").onclick = () => {
  document.getElementById("qrPopup").classList.remove("show");
};

//student result panel open close

const resultPanel = document.getElementById("resultPanel");
const closeResultPanel = document.getElementById("closeResultPanel");

document.addEventListener("click", async function (e) {
  if (e.target.classList.contains("result-btn")) {
    const testId = e.target.dataset.id;
    currentTestId = testId;

    resultPanel.classList.add("active");

    const resultBox = document.getElementById("resultData");
    resultBox.innerHTML = "Loading...";

    const res = await fetch("/api/results/" + testId, {
      credentials: "include",
    });
    const data = await res.json();

    if (!data.results.length) {
      resultBox.innerHTML = "<p>No attempts yet</p>";
      return;
    }

    let html = "";
    data.results.forEach((r) => {
      html += `
      <div class="rt-row">
        <span>${r.student_name}</span>
        <span>${r.roll_no}</span>
        <span>${r.total_marks}</span>
        <span>
          <button class="delete-result-btn" data-id="${r.id}">
            Delete
          </button>
        </span>
      </div>
    `;
    });

    resultBox.innerHTML = html;
  }
});

closeResultPanel.addEventListener("click", () => {
  resultPanel.classList.remove("active");
});

// ================================
// STUDENT RESULT LIVE SEARCH
// ================================

document.addEventListener("input", function (e) {
  if (e.target.id !== "studentSearch") return;

  const value = e.target.value.toLowerCase().trim();

  document.querySelectorAll(".rt-row").forEach((row) => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(value) ? "grid" : "none";
  });
});

//delete btn clicl logic root student delete result panel btn se

let deleteAttemptId = null;

// open popup
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-result-btn")) {
    deleteAttemptId = e.target.dataset.id;
    document.getElementById("deleteResultPopup").classList.add("show");
  }
});

// cancel
document.getElementById("cancelResultDelete").onclick = () => {
  document.getElementById("deleteResultPopup").classList.remove("show");
};

// confirm student delete

document.getElementById("confirmResultDelete").onclick = async () => {
  if (!deleteAttemptId) return;

  await fetch("/api/delete-attempt/" + deleteAttemptId, {
    credentials: "include",
    method: "DELETE",
  });

  document.getElementById("deleteResultPopup").classList.remove("show");

  // ⚡ INSTANT REFRESH
  const resultBox = document.getElementById("resultData");
  resultBox.innerHTML = "Loading...";

  const res = await fetch("/api/results/" + currentTestId, {
    credentials: "include",
  });
  const data = await res.json();

  if (!data.results.length) {
    resultBox.innerHTML = "<p>No attempts yet</p>";
    return;
  }

  let html = "";
  data.results.forEach((r) => {
    html += `
      <div class="rt-row">
        <span>${r.student_name}</span>
        <span>${r.roll_no}</span>
        <span>${r.total_marks}</span>
        <span>
          <button class="delete-result-btn" data-id="${r.id}">
            Delete
          </button>
        </span>
      </div>
    `;
  });

  resultBox.innerHTML = html;
};

// ================================
// DOWNLOAD FULL RESULT (CSV)
// ================================

async function downloadFullResult() {
  const rows = document.querySelectorAll("#resultData .rt-row");
  if (rows.length === 0) {
    alert("No results available");
    return;
  }

  let csv = "No,Student Name,Roll Number,Marks\n";

  rows.forEach((row, index) => {
    const cols = row.querySelectorAll("span");
    const name = cols[0]?.innerText.trim() || "";
    const roll = cols[1]?.innerText.trim() || "";
    const marks = cols[2]?.innerText.trim() || "";

    csv += `${index + 1},"${name}","${roll}","${marks}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  // 🔥 TEST NAME SERVER SE
  let testName = "Result";

  try {
    const res = await fetch("/api/test-name/" + currentTestId, {
      credentials: "include",
    });
    const data = await res.json();

    if (data.success && data.name) {
      testName = data.name.replace(/\s+/g, "_");
    }
  } catch {}

  const a = document.createElement("a");
  a.href = url;
  a.download = testName + "_Result.csv";
  a.click();

  URL.revokeObjectURL(url);
}
document
  .getElementById("downloadResultBtn")
  .addEventListener("click", downloadFullResult);

//teacher progress in teacher dashboard (guarded so page without button doesn't break)
const progressBtn = document.getElementById("openProgress");
const progressPopup = document.getElementById("progressPopup");

if (progressBtn && progressPopup) {
  // open popup
  progressBtn.onclick = () => {
    progressPopup.classList.add("show");
    loadProgress();
  };

  function closeProgress() {
    progressPopup.classList.remove("show");
  }
}

// fetch data
async function loadProgress() {
  const res = await fetch("/api/teacher/progress", {
    credentials: "include",
  });
  const data = await res.json();

  if (!data.success) return;

  document.getElementById("totalTests").innerText = data.totalTests;
  document.getElementById("totalStudents").innerText = data.totalStudents;
  document.getElementById("totalRevenue").innerText = "₹" + data.totalRevenue;

  // fun line 😎
  let msg = "";

  if (data.totalStudents > 50) {
    msg = "🔥 Your tests are going viral!";
  } else if (data.totalTests > 5) {
    msg = "🚀 You are consistently creating tests!";
  } else {
    msg = "📈 Start creating more tests to grow!";
  }

  document.getElementById("funInsight").innerText = msg;
}

// 💡 GUIDE POPUP LOGIC

const guideBtn = document.getElementById("guideBtn");
const guidePopup = document.getElementById("guidePopup");
const closeGuide = document.getElementById("closeGuide");

let guideTimer;

// open
guideBtn.onclick = () => {
  guidePopup.classList.add("show");

  // auto close after 5 min
  guideTimer = setTimeout(() => {
    guidePopup.classList.remove("show");
  }, 300000);
};

// close
closeGuide.onclick = () => {
  guidePopup.classList.remove("show");
  clearTimeout(guideTimer);
};

// logout pe bhi close
document.getElementById("logoutBtn").addEventListener("click", () => {
  guidePopup.classList.remove("show");
});

