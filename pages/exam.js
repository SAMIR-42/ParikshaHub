let questions = [];

//timer global variables;

let timerInterval;
let remainingSeconds = 0;

const params = new URLSearchParams(window.location.search);
const TEST_ID = params.get("tid");

const rulesPopup = document.getElementById("rulesPopup");
const studentPopup = document.getElementById("studentPopup");

const startExamBtn = document.getElementById("startExamBtn");
const finalStartBtn = document.getElementById("finalStartBtn");

history.pushState(null, null, location.href);
window.onpopstate = function () {
  history.go(1);
};

// ✅ Page reload hone par exam wapas wahi se start karne ka system
window.addEventListener("DOMContentLoaded", () => {
  const attemptId = sessionStorage.getItem("attemptId");
  const examStarted = sessionStorage.getItem("examStarted");

  // restore blur if active
  const activeBlur = sessionStorage.getItem("antiBlurRemaining");
  if (activeBlur) {
    startAntiCheatTimer(parseInt(activeBlur), "⚠️ Tab switching detected.");
  }

  // agar exam chal raha tha
  if (attemptId && examStarted === "yes") {
    rulesPopup.style.display = "none";
    studentPopup.style.display = "none";

    //full screen
    enterFullscreen();

    // sidha questions load
    loadTestQuestions();
  } else {
    // normal flow
    rulesPopup.style.display = "flex";
  }
});

// STEP 1 → rules accept
startExamBtn.addEventListener("click", () => {
  rulesPopup.style.display = "none";
  studentPopup.style.display = "flex";
});

// STEP 2 → student details submit
finalStartBtn.addEventListener("click", async () => {
  const name = document.getElementById("stuName").value.trim();
  const roll = document.getElementById("stuRoll").value.trim();
  const stuClass = document.getElementById("stuClass").value.trim();

  if (!name || !roll || !stuClass) {
    alert("Please fill all details");
    return;
  }

  // loading text
  document.querySelector(".exam-container").innerHTML =
    "<h2>Starting Exam...</h2>";

  try {
    const res = await fetch("/api/start-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: TEST_ID,
        name,
        roll,
        studentClass: stuClass,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      // ❌ Already attempted
      if (data.message === "ALREADY_ATTEMPTED") {
        document.getElementById("attemptPopup").style.display = "flex";
        return;
      }

      alert("Server error");
      return;
    }

    // attempt id save
    sessionStorage.setItem("attemptId", data.attemptId);

    // ✅ Exam start ho gaya → refresh ke baad popup mat dikhana
    sessionStorage.setItem("examStarted", "yes");

    studentPopup.style.display = "none";

    //full screen
    enterFullscreen();

    // real questions load
    loadTestQuestions();
  } catch (err) {
    alert("Server not reachable");
  }
});

//full screen lock at exam time student ke liye
function enterFullscreen() {
  const el = document.documentElement;

  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

//agar full screen se nikle vapas ghusa do

setInterval(() => {
  const attemptId = sessionStorage.getItem("attemptId");
  if (!attemptId) return;

  if (!document.fullscreenElement) {
    enterFullscreen();
  }
}, 1000);

//student alredy exist popup open close
document.getElementById("closeAttemptPopup").onclick = () => {
  document.getElementById("attemptPopup").style.display = "none";
};

//fetch real qun from server
async function loadTestQuestions() {
  const res = await fetch("/api/get-test/" + TEST_ID);
  const data = await res.json();

  if (!data.success) {
    document.querySelector(".exam-container").innerHTML =
      "<h2>Test not found</h2>";
    return;
  }

  if (!res.ok) {
    showError("Server issue");
    return;
  }

  const test = data.test;
  questions = data.questions;

  // ✅ TOTAL EXAM TIME & MARKS CALC
  let totalMinutes = 0;
  let totalMarks = 0;

  questions.forEach((q) => {
    totalMinutes += q.time_minutes;
    totalMarks += q.marks;
  });

  let html = `
      <div class="exam-header">
        <h2>${test.subject}</h2>
        <p>Class: ${test.class}</p>
        <p>Total Questions: ${questions.length}</p>
      </div>
    `;

  document.querySelector(".exam-container").innerHTML = `
  <header class="exam-header">
  <div class="exam-title">
    <div>
      <h2>${test.subject}</h2>
      <p>Class: ${test.class}</p>
    </div>
  </div>

  <div class="exam-stats">
    <div>Questions: ${questions.length}</div>
    <div>Marks: <span id="totalMarks">0</span></div>
    <div id="timerBox"><span id="examTimer">00:00</span></div>
  </div>
</header>


<main class="question-area">
  <div class="question-card">
    <div class="q-number">Question <span id="qNum">1</span></div>
    <div class="q-text" id="questionText"></div>
    <div class="options" id="optionsBox"></div>
  </div>
</main>

<footer class="exam-footer">
  <button id="nextBtn" class="nav-btn primary">
    Next <i class="fa-solid fa-arrow-right"></i>
  </button>
</footer>
`;

  document.getElementById("totalMarks").innerText = totalMarks;

  startExamTimerFromServer();

  showQuestion();
  // question navigation
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);
}

function nextQuestion() {
  if (currentQ < questions.length - 1) {
    currentQ++;
    showQuestion();
  } else {
    finishExamFlow();
  }
}

async function startExamTimerFromServer() {
  const attemptId = sessionStorage.getItem("attemptId");

  const res = await fetch(`/api/exam-timer/${attemptId}`);
  const data = await res.json();

  // ✅ ADD HERE
  if (data.expired) {
    finishExamFlow();
    return;
  }

  examRemainingSeconds = data.remaining;
  updateExamTimerUI();

  clearInterval(examTimerInterval);

  examTimerInterval = setInterval(() => {
    examRemainingSeconds--;
    updateExamTimerUI();

    if (examRemainingSeconds <= 0) {
      clearInterval(examTimerInterval);
      finishExamFlow();
    }
  }, 1000);
}

// ================= EXAM TOTAL TIMER =================
let examTimerInterval;
let examRemainingSeconds = 0;

function startExamTimer(seconds) {
  examRemainingSeconds = seconds;
  updateExamTimerUI();

  clearInterval(examTimerInterval);

  examTimerInterval = setInterval(() => {
    examRemainingSeconds--;
    updateExamTimerUI();

    if (examRemainingSeconds <= 0) {
      clearInterval(examTimerInterval);
      finishExamFlow(); // auto submit
    }
  }, 1000);
}

function updateExamTimerUI() {
  const m = String(Math.floor(examRemainingSeconds / 60)).padStart(2, "0");
  const s = String(examRemainingSeconds % 60).padStart(2, "0");
  document.getElementById("examTimer").innerText = `${m}:${s}`;
}

//select option fun

async function selectOption(questionId, option) {
  const attemptId = sessionStorage.getItem("attemptId");

  await fetch("/api/save-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId,
      questionId,
      selectedOption: option,
    }),
  });

  const data = await res.json();

  if (data.expired) {
    finishExamFlow();
    return;
  }
}
//option render function

function renderOptions(q) {
  const box = document.getElementById("optionsBox");
  box.innerHTML = "";

  ["A", "B", "C", "D"].forEach((letter) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<b>${letter}.</b> ${q["option_" + letter.toLowerCase()]}`;

    btn.onclick = async () => {
      document
        .querySelectorAll(".option-btn")
        .forEach((b) => b.classList.remove("selected"));

      btn.classList.add("selected");

      // 🔥 LIVE SAVE TO DB
      await selectOption(q.id, letter);
    };

    box.appendChild(btn);
  });
}

// ========= QUESTION ENGINE =========
let currentQ = 0;

function showQuestion() {
  const q = questions[currentQ];

  document.getElementById("qNum").innerText = currentQ + 1;
  document.getElementById("questionText").innerHTML = `
  ${q.question_text}

  ${
    q.question_image
      ? `<div class="q-img-preview">
           <img src="${q.question_image}" onclick="openImagePopup('${q.question_image}')" />
         </div>`
      : ""
  }

  <div class="q-meta">
    <span>Marks: ${q.marks}</span>
    <span>Time: ${q.time_minutes} min</span>
  </div>

  <div class="q-timer">
    <i class="fa-solid fa-clock"></i>
    <span id="qTimer">00:00</span>
  </div>
`;

  renderOptions(q);
  startQuestionTimer(q.id);

  markQuestionStart(q.id);
}

async function markQuestionStart(questionId) {
  const attemptId = sessionStorage.getItem("attemptId");

  await fetch("/api/question-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, questionId }),
  });
}

//student side  question img open close popup

function openImagePopup(src) {
  document.getElementById("imgPopup").style.display = "flex";
  document.getElementById("popupImg").src = src;
}

function closeImagePopup() {
  document.getElementById("imgPopup").style.display = "none";
}

//start timer function

async function startQuestionTimer(questionId) {
  const attemptId = sessionStorage.getItem("attemptId");

  const res = await fetch(`/api/question-timer/${attemptId}/${questionId}`);
  const data = await res.json();

  // ✅ ADD HERE
  if (data.expired) {
    finishExamFlow();
    return;
  }

  remainingSeconds = data.remaining;

  updateTimerUI();

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    remainingSeconds--;

    updateTimerUI();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      nextQuestion();
    }
  }, 1000);
}

//timer ui format

function updateTimerUI() {
  const m = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const s = String(remainingSeconds % 60).padStart(2, "0");
  document.getElementById("qTimer").innerText = `${m}:${s}`;
}

//exam finish fun and mark save
async function finishExamFlow() {
  const attemptId = sessionStorage.getItem("attemptId");

  // simple loader
  document.querySelector(".exam-container").innerHTML =
    "<h2>Submitting Exam...</h2>";

  // future: server marks calculate karega
  await fetch("/api/finish-exam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId }),
  });

  // document.querySelector(".exam-container").innerHTML =
  //   "<h2>✅ Exam Submitted Successfully</h2>";

  window.location.href = "/pages/result.html?attempt=" + attemptId;

  // exam khatam → session clean
  sessionStorage.removeItem("examStarted");
  sessionStorage.removeItem("attemptId");
}

// ================= TAB SWITCH ANTI-CHEAT =================

const overlay = document.getElementById("antiCheatOverlay");
const antiMsg = document.getElementById("antiMsg");
const antiTimerText = document.getElementById("antiTimer");

let cheatCount = parseInt(sessionStorage.getItem("cheatCount") || "0");
let antiInterval;

// detect tab hidden / app minimize (mobile + desktop)
document.addEventListener("visibilitychange", () => {
  const attemptId = sessionStorage.getItem("attemptId");
  if (!attemptId) return;

  if (document.hidden) {
    handleCheating();
  }
});

function handleCheating() {
  cheatCount++;
  sessionStorage.setItem("cheatCount", cheatCount);

  let seconds = 60;
  let message = "⚠️ Do not switch tabs during exam.";

  if (cheatCount === 2) {
    seconds = 180;
    message = "🚨 Strict Warning! Next time exam may auto-submit.";
  } else if (cheatCount >= 3) {
    seconds = 420;
    message = "⛔ Final Warning! Serious violation detected.";
  }

  startAntiCheatTimer(seconds, message);
}

function startAntiCheatTimer(seconds, message) {
  overlay.style.display = "flex";
  antiMsg.innerText = message;

  updateAntiTimer(seconds);

  // refresh survive ke liye save
  sessionStorage.setItem("antiBlurRemaining", seconds);

  clearInterval(antiInterval);

  antiInterval = setInterval(() => {
    seconds--;

    // 🔴 YE LINE ADD — har second save hoga
    sessionStorage.setItem("antiBlurRemaining", seconds);

    updateAntiTimer(seconds);

    if (seconds <= 0) {
      clearInterval(antiInterval);
      overlay.style.display = "none";

      // 🔴 YE LINE ADD — blur khatam to storage clean
      sessionStorage.removeItem("antiBlurRemaining");
    }
  }, 1000);
}

function updateAntiTimer(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  antiTimerText.innerText = `${m}:${s}`;
}

// ================= COPY PASTE BLOCK =================

// copy block
document.addEventListener("copy", (e) => e.preventDefault());

// cut block
document.addEventListener("cut", (e) => e.preventDefault());

// paste block
document.addEventListener("paste", (e) => e.preventDefault());

// keyboard shortcuts block
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === "c" || k === "v" || k === "x" || k === "a") {
      e.preventDefault();
    }
  }
});

// text selection block
document.addEventListener("selectstart", (e) => e.preventDefault());

// mobile long-press menu block and right click on desk
// document.addEventListener("contextmenu", (e) => e.preventDefault());
