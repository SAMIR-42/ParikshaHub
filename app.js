// Core imports
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcrypt");
const session = require("express-session");
const Cashfree = require("cashfree-pg").Cashfree;

const pendingTests = {};

dotenv.config();

const app = express();

// Preserve raw request body for Cashfree webhook signature verification
const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString("utf8");
  }
};

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: true, verify: rawBodySaver }));

// ================= IMAGE UPLOAD SETUP =================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "assets")); // direct assets folder render safe
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "qimg-" + unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// ======================================================

//session check
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true, //prod me ise true kr do local pe isProd,
      httpOnly: true,
      sameSite: "none", //production me sirf none "none"
    },
  })
);

//disable catch

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");

  next();
});

// Static files
app.use(express.static(path.join(__dirname)));

// MySQL connection
let db;

async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log("✅ MySQL Connected");
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
  }
}

// teacher sign up root

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({
        success: false,
        message: "All fields required",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO teachers (name,email,password) VALUES (?,?,?)",
      [name, email, hash]
    );

    res.json({
      success: true,
      message: "Signup successful",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.json({
        success: false,
        message: "Email already registered",
      });
    }

    res.json({
      success: false,
      message: "Signup failed",
    });
  }
});

//login root
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.execute("SELECT * FROM teachers WHERE email=?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const teacher = rows[0];

    const match = await bcrypt.compare(password, teacher.password);

    if (!match) {
      return res.json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /* start session */

    req.session.teacherId = teacher.id;

    res.json({
      success: true,
    });
  } catch (err) {
    res.json({
      success: false,
      message: "Login failed",
    });
  }
});

// get logged in teacher info dashboard pe
app.get("/api/teacher", async (req, res) => {
  if (!req.session.teacherId) {
    return res.json({ loggedIn: false });
  }

  const [rows] = await db.execute("SELECT name FROM teachers WHERE id=?", [
    req.session.teacherId,
  ]);

  res.json({
    loggedIn: true,
    name: rows[0].name,
  });
});

// logout
app.get("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

//qun add root
app.post("/api/save-test", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { subject, className, questions } = req.body;

    const [testResult] = await db.execute(
      "INSERT INTO tests (teacher_id, subject, class) VALUES (?,?,?)",
      [req.session.teacherId, subject, className]
    );

    const testId = testResult.insertId;

    for (let q of questions) {
      await db.execute(
        `INSERT INTO questions
        (test_id, question_text, question_image, option_a, option_b, option_c, option_d, correct_option, marks, time_minutes)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          testId,
          q.text,
          q.image,
          q.A,
          q.B,
          q.C,
          q.D,
          q.correct,
          q.marks,
          q.time,
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save test" });
  }
});

//cashfree setup
// Cashfree configuration

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment =
  process.env.CASHFREE_ENV === "production"
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX;

async function savePaidTestForOrder(orderId, paymentId = "NA", amount = 1.0) {
  const testData = pendingTests[orderId];
  if (!testData) {
    return { ok: false, reason: "PENDING_NOT_FOUND" };
  }

  // Idempotency guard: if already saved for this order, skip duplicate create
  const [existing] = await db.execute(
    "SELECT id FROM payments WHERE order_id=? AND status='SUCCESS' LIMIT 1",
    [orderId]
  );
  if (existing.length > 0) {
    delete pendingTests[orderId];
    return { ok: true, duplicated: true };
  }

  const [testResult] = await db.execute(
    "INSERT INTO tests (teacher_id, subject, class) VALUES (?,?,?)",
    [testData.teacherId, testData.subject, testData.className]
  );

  const testId = testResult.insertId;

  await db.execute(
    `INSERT INTO payments
   (teacher_id, test_id, order_id, payment_id, amount, currency, status, payment_time)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [testData.teacherId, testId, orderId, paymentId, amount, "INR", "SUCCESS"]
  );

  for (let q of testData.questions) {
    await db.execute(
      `INSERT INTO questions
        (test_id, question_text, question_image, option_a, option_b, option_c, option_d, correct_option, marks, time_minutes)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        testId,
        q.text,
        q.image,
        q.A,
        q.B,
        q.C,
        q.D,
        q.correct,
        q.marks,
        q.time,
      ]
    );
  }

  delete pendingTests[orderId];
  return { ok: true, duplicated: false };
}

// Generate order / session
app.post("/api/create-payment", upload.any(), async (req, res) => {
  if (!req.session.teacherId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  //get teacher name from database
  const [[teacher]] = await db.execute(
    "SELECT name, email FROM teachers WHERE id=?", [req.session.teacherId]
  );

  try {
    const subject = req.body.subject;
    const className = req.body.className;
    let questions = JSON.parse(req.body.questions);

    // uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const index = file.fieldname.split("_")[1];
        questions[index].image = "/assets/" + file.filename;
      });
    }

    const orderId = "order_" + Date.now();

    pendingTests[orderId] = {
      teacherId: req.session.teacherId,
      subject,
      className,
      questions,
    };

    const request = {
      order_amount: 9,
      order_currency: "INR",
      order_id: orderId,

      customer_details: {
        customer_id: "cust_" + Date.now(),
        customer_name: teacher.name + " (T)",
        customer_email: teacher.email,
        customer_phone: "+919999999999",
      },

      order_meta: {
        return_url: `${process.env.BASE_URL}/payment-success?order_id=${orderId}`,
      },
    };

    const response = await Cashfree.PGCreateOrder("2023-08-01", request);

    console.log("cashfree resp", response.data);

    res.json({
      payment_session_id: response.data?.payment_session_id || null,
      cashfree_mode:
        process.env.CASHFREE_ENV === "production" ? "production" : "sandbox",
    });
  } catch (error) {
    console.log("cashfree error", error.response?.data || error.message);
    const raw = error.response?.data;
    let msg = "Payment failed";
    if (raw != null) {
      if (typeof raw === "string") msg = raw;
      else if (typeof raw.message === "string") msg = raw.message;
      else msg = JSON.stringify(raw);
    } else if (error.message) {
      msg = error.message;
    }
    res.status(500).json({ error: msg });
  }
});

// Return URL: Cashfree redirects here for success/fail/cancel alike — do not claim payment result.
// Real test creation = webhook only (/api/payment-webhook).

app.get("/payment-success", async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ParikshaHub</title>
<style>
body{margin:0;min-height:100vh;display:flex;justify-content:center;align-items:center;background:#f4f6fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,sans-serif;padding:20px;}
.popup{background:#fff;padding:32px 36px;border-radius:14px;box-shadow:0 15px 40px rgba(0,0,0,.12);text-align:center;max-width:420px;width:100%;animation:pop .45s ease;}
.popup h2{margin:0 0 12px;font-size:1.2rem;line-height:1.35;color:#1e293b;}
.popup p{margin:0;color:#64748b;font-size:14px;line-height:1.55;}
.sub{margin-top:14px;font-size:13px;color:#94a3b8;}
.btn{margin-top:20px;padding:10px 22px;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-size:14px;background:#2563eb;color:#fff;}
.btn:hover{opacity:.95;}
@keyframes pop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
</style>
</head>
<body>
<div class="popup">
<h2>Back to your dashboard</h2>
<p>If your payment went through, your new test will show up in <b>My Tests</b> in a few seconds after our server confirms it.</p>
<p class="sub">If you cancelled or the payment failed, simply create the test again and complete checkout.</p>
<button type="button" class="btn" id="go">Go to dashboard</button>
</div>
<script>
history.replaceState(null, "", "/payment-success");
document.getElementById("go").onclick = function () {
  window.location.replace("/pages/dashboard.html");
};
setTimeout(function () {
  window.location.replace("/pages/dashboard.html");
}, 4000);
</script>
</body>
</html>
`);
});

// Cashfree webhook: only here we finalize test creation after verified success payment
app.post("/api/payment-webhook", async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    if (!signature || !timestamp || !req.rawBody) {
      return res.status(400).json({ ok: false, message: "Invalid webhook" });
    }

    // Throws error when signature does not match
    Cashfree.PGVerifyWebhookSignature(signature, req.rawBody, timestamp);

    const event = req.body || {};
    const orderId =
      event?.data?.order?.order_id || event?.order_id || event?.orderId;
    const paymentStatus =
      event?.data?.payment?.payment_status || event?.payment_status;
    const paymentId =
      event?.data?.payment?.cf_payment_id ||
      event?.data?.payment?.payment_id ||
      "NA";
    const paidAmount =
      Number(event?.data?.order?.order_amount || event?.order_amount || 1) ||
      1;

    const isPaid =
      paymentStatus === "SUCCESS" ||
      String(event?.type || "").toUpperCase().includes("PAYMENT_SUCCESS");

    if (!orderId) {
      return res.status(200).json({ ok: true, ignored: "ORDER_ID_MISSING" });
    }

    if (!isPaid) {
      return res.status(200).json({ ok: true, ignored: "NOT_SUCCESS_EVENT" });
    }

    const saved = await savePaidTestForOrder(orderId, paymentId, paidAmount);
    return res.status(200).json({ ok: true, saved });
  } catch (err) {
    console.log("webhook verify/save error", err.message || err);
    return res.status(400).json({ ok: false });
  }
});

// =============================
// GET TEACHER TEST LIST
// =============================

app.get("/api/my-tests", async (req, res) => {
  try {
    // session check
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    // teacher ke tests nikalna
    const [rows] = await db.execute(
      `SELECT id, subject, class, created_at
       FROM tests
       WHERE teacher_id = ?
       ORDER BY id DESC`,
      [req.session.teacherId]
    );

    res.json({
      success: true,
      tests: rows,
    });
  } catch (err) {
    console.log(err);

    res.json({
      success: false,
    });
  }
});

// =============================
// DELETE TEST teacher check
// =============================

app.delete("/api/delete-question/:id", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const qid = req.params.id;

    await db.execute(
      `DELETE q FROM questions q
       JOIN tests t ON q.test_id = t.id
       WHERE q.id=? AND t.teacher_id=?`,
      [qid, req.session.teacherId]
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// =============================
// DELETE FULL TEST (Teacher Secure)
// =============================
app.delete("/api/delete-test/:id", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const testId = req.params.id;

    // pehle questions delete
    await db.execute(
      `DELETE q FROM questions q
       JOIN tests t ON q.test_id = t.id
       WHERE q.test_id=? AND t.teacher_id=?`,
      [testId, req.session.teacherId]
    );

    // phir test delete
    await db.execute("DELETE FROM tests WHERE id=? AND teacher_id=?", [
      testId,
      req.session.teacherId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// GET SINGLE TEST WITH QUESTIONS

app.get("/api/test/:id", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const testId = req.params.id;

    const [test] = await db.execute(
      "SELECT subject,class FROM tests WHERE id=? AND teacher_id=?",
      [testId, req.session.teacherId]
    );

    const [questions] = await db.execute(
      "SELECT * FROM questions WHERE test_id=? ORDER BY id ASC",
      [testId]
    );

    res.json({
      success: true,
      test: test[0],
      questions,
    });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// UPDATE QUESTION FIELD

app.put("/api/update-question/:id", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const qid = req.params.id;
    const { field, value } = req.body;

    const allowed = [
      "question_text",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "correct_option",
    ];

    if (!allowed.includes(field)) {
      return res.json({ success: false });
    }

    await db.execute(
      `UPDATE questions q
       JOIN tests t ON q.test_id = t.id
       SET q.${field}=?
       WHERE q.id=? AND t.teacher_id=?`,
      [value, qid, req.session.teacherId]
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

app.put("/api/update-test/:id", async (req, res) => {
  try {
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const testId = req.params.id;
    const { subject, className } = req.body;

    await db.execute(
      "UPDATE tests SET subject=?,class=? WHERE id=? AND teacher_id=?",
      [subject, className, testId, req.session.teacherId]
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

//teacher side img edit or update root
app.put(
  "/api/update-question-image/:id",
  upload.single("image"),
  async (req, res) => {
    // ✅ session check
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    try {
      const qid = req.params.id;

      const [[old]] = await db.execute(
        "SELECT question_image FROM questions WHERE id=?",
        [qid]
      );

      // old image delete
      if (old.question_image) {
        const fs = require("fs");
        const oldPath = path.join(
          __dirname,
          old.question_image.replace("/", "")
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const newPath = "/assets/" + req.file.filename;

      await db.execute("UPDATE questions SET question_image=? WHERE id=?", [
        newPath,
        qid,
      ]);

      res.json({ success: true, newPath });
    } catch (err) {
      console.log(err);
      res.json({ success: false });
    }
  }
);

//start student attepmt root
app.post("/api/start-attempt", async (req, res) => {
  const { testId, name, roll, studentClass } = req.body;

  try {
    // 🔍 CHECK — same roll already attempted?
    const [exists] = await db.execute(
      "SELECT id FROM student_attempts WHERE test_id=? AND roll_no=?",
      [testId, roll]
    );

    if (exists.length > 0) {
      return res.json({
        success: false,
        message: "ALREADY_ATTEMPTED",
      });
    }

    // 🔹 test ka total exam duration nikalna
    const [qRows] = await db.execute(
      "SELECT SUM(time_minutes) AS totalMinutes FROM questions WHERE test_id=?",
      [testId]
    );

    const totalSeconds = (qRows[0].totalMinutes || 0) * 60;

    // ✅ New attempt with exam timing
    const [result] = await db.execute(
      `INSERT INTO student_attempts
   (test_id, student_name, roll_no, class, start_time, exam_duration_seconds)
   VALUES (?, ?, ?, ?, NOW(), ?)`,
      [testId, name, roll, studentClass, totalSeconds]
    );

    res.json({ success: true, attemptId: result.insertId });
  } catch (err) {
    res.json({ success: false });
  }
});

//live ans save root
app.post("/api/save-answer", async (req, res) => {
  const { attemptId, questionId, selectedOption } = req.body;

  try {
    const [[attempt]] = await db.execute(
      "SELECT start_time, exam_duration_seconds FROM student_attempts WHERE id=?",
      [attemptId]
    );

    const start = new Date(attempt.start_time).getTime();
    const duration = attempt.exam_duration_seconds * 1000;

    // ⛔ TIME OVER BLOCK
    if (Date.now() > start + duration) {
      return res.json({ expired: true });
    }

    // BEFORE INSERT
    const [exists] = await db.execute(
      "SELECT id FROM student_answers WHERE attempt_id=? AND question_id=?",
      [attemptId, questionId]
    );

    if (exists.length === 0) {
      await db.execute(
        `INSERT INTO student_answers
     (attempt_id, question_id, selected_option, question_start_time)
     VALUES (?, ?, ?, NOW())`,
        [attemptId, questionId, selectedOption]
      );
    } else {
      await db.execute(
        `UPDATE student_answers
     SET selected_option=?
     WHERE attempt_id=? AND question_id=?`,
        [selectedOption, attemptId, questionId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

//question ka time kitna he vo lene vali api

app.get("/api/question-timer/:attemptId/:questionId", async (req, res) => {
  const { attemptId, questionId } = req.params;

  const [[q]] = await db.execute(
    "SELECT time_minutes FROM questions WHERE id=?",
    [questionId]
  );

  const [[a]] = await db.execute(
    `SELECT question_start_time
     FROM student_answers
     WHERE attempt_id=? AND question_id=?`,
    [attemptId, questionId]
  );

  const totalSeconds = q.time_minutes * 60;

  // not started yet
  if (!a || !a.question_start_time) {
    return res.json({ remaining: totalSeconds });
  }

  const start = new Date(a.question_start_time).getTime();
  const now = Date.now();
  const passed = Math.floor((now - start) / 1000);
  const remaining = Math.max(totalSeconds - passed, 0);

  if (remaining <= 0) {
    return res.json({ expired: true });
  }

  res.json({ remaining });
});

//finish exam and marks calculate root
app.post("/api/finish-exam", async (req, res) => {
  const { attemptId } = req.body;

  try {
    // 1️⃣ Get all answers of student
    const [answers] = await db.execute(
      `SELECT sa.id, sa.question_id, sa.selected_option,
              q.correct_option, q.marks
       FROM student_answers sa
       JOIN questions q ON sa.question_id = q.id
       WHERE sa.attempt_id = ?`,
      [attemptId]
    );

    let total = 0;

    // 2️⃣ Check each answer
    for (let ans of answers) {
      let marksGot = 0;

      if (ans.selected_option === ans.correct_option) {
        marksGot = ans.marks;
        total += ans.marks;
      }

      // 3️⃣ Update marks_got per question
      await db.execute(`UPDATE student_answers SET marks_got=? WHERE id=?`, [
        marksGot,
        ans.id,
      ]);
    }

    // 4️⃣ Update total marks
    await db.execute(
      `UPDATE student_attempts
       SET total_marks=?, end_time=NOW()
       WHERE id=?`,
      [total, attemptId]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

//fetch qn and show exam page

app.get("/api/get-test/:id", async (req, res) => {
  const id = req.params.id;

  const [test] = await db.execute("SELECT * FROM tests WHERE id=?", [id]);
  const [questions] = await db.execute(
    `SELECT id, question_text, question_image,
     option_a, option_b, option_c, option_d,
     marks, time_minutes
     FROM questions WHERE test_id=?`,
    [id]
  );

  res.json({ success: true, test: test[0], questions });
});

//student result show in dashboard
app.get("/api/results/:testId", async (req, res) => {
  try {
    // ✅ STEP 1: session check (YAHI DALNA THA)
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const testId = req.params.testId;

    // ✅ STEP 2: secure query (teacher ka hi test aaye)
    const [rows] = await db.execute(
      `SELECT s.id, s.student_name, s.roll_no, s.total_marks
       FROM student_attempts s
       JOIN tests t ON s.test_id = t.id
       WHERE s.test_id = ? AND t.teacher_id = ?
       ORDER BY s.id DESC`,
      [testId, req.session.teacherId]
    );

    res.json({ success: true, results: rows });
  } catch (err) {
    res.json({ success: false });
  }
});

//student delete by result panel btn
app.delete("/api/delete-attempt/:id", async (req, res) => {
  try {
    // ✅ session check
    if (!req.session.teacherId) {
      return res.json({ success: false });
    }

    const attemptId = req.params.id;

    // ✅ secure delete (sirf apne test ka data delete hoga)
    await db.execute(
      `DELETE sa, s
       FROM student_attempts s
       JOIN tests t ON s.test_id = t.id
       LEFT JOIN student_answers sa ON sa.attempt_id = s.id
       WHERE s.id=? AND t.teacher_id=?`,
      [attemptId, req.session.teacherId]
    );

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

//new api student exam timer ki
app.get("/api/exam-timer/:attemptId", async (req, res) => {
  const { attemptId } = req.params;

  const [[row]] = await db.execute(
    `SELECT start_time, exam_duration_seconds
     FROM student_attempts
     WHERE id=?`,
    [attemptId]
  );

  const start = new Date(row.start_time).getTime();
  const now = Date.now();
  const passed = Math.floor((now - start) / 1000);

  const remaining = Math.max(row.exam_duration_seconds - passed, 0);

  if (remaining <= 0) {
    return res.json({ expired: true });
  }

  res.json({ remaining });
});

//new api
app.post("/api/question-start", async (req, res) => {
  const { attemptId, questionId } = req.body;

  const [exists] = await db.execute(
    "SELECT id FROM student_answers WHERE attempt_id=? AND question_id=?",
    [attemptId, questionId]
  );

  if (exists.length === 0) {
    await db.execute(
      `INSERT INTO student_answers
       (attempt_id, question_id, question_start_time)
       VALUES (?, ?, NOW())`,
      [attemptId, questionId]
    );
  }

  res.json({ success: true });
});

// student self result
app.get("/api/my-result/:attemptId", async (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    const [[row]] = await db.execute(
      `SELECT student_name, roll_no, class, total_marks, test_id
       FROM student_attempts
       WHERE id=?`,
      [attemptId]
    );

    // total test marks nikalne ke liye
    const [[tm]] = await db.execute(
      `SELECT SUM(marks) AS totalMarks
       FROM questions
       WHERE test_id=?`,
      [row.test_id]
    );

    res.json({
      success: true,
      info: row,
      totalTestMarks: tm.totalMarks || 0,
    });
  } catch (err) {
    res.json({ success: false });
  }
});

// GET TEST NAME FOR RESULT DOWNLOAD
app.get("/api/test-name/:id", async (req, res) => {
  try {
    const testId = req.params.id;

    const [[row]] = await db.execute("SELECT subject FROM tests WHERE id=?", [
      testId,
    ]);

    res.json({ success: true, name: row.subject });
  } catch (err) {
    res.json({ success: false });
  }
});

//============================================================
//ADMIN ROOT
//======================================================

//admin login api root

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.execute("SELECT * FROM admins WHERE email=?", [
    email,
  ]);

  if (rows.length === 0) {
    return res.json({ success: false });
  }

  const admin = rows[0];

  const match = await bcrypt.compare(password, admin.password);

  if (!match) {
    return res.json({ success: false });
  }

  req.session.adminId = admin.id; // session start

  res.json({ success: true });
});

//admin page protection
function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

//admin page safe root

app.get("/api/admin/check", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

//admin logout api

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET TOTAL TEACHERS COUNT
app.get("/api/admin/teachers/count", requireAdmin, async (req, res) => {
  try {
    const [[row]] = await db.execute("SELECT COUNT(*) AS total FROM teachers");
    res.json({ success: true, total: row.total });
  } catch (err) {
    res.json({ success: false });
  }
});

// GET ALL TEACHERS (with search)
app.get("/api/admin/teachers", requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";

    const [rows] = await db.execute(
      `SELECT id, name, email, created_at
       FROM teachers
       WHERE name LIKE ? OR email LIKE ?
       ORDER BY id DESC`,
      [`%${search}%`, `%${search}%`]
    );

    res.json({ success: true, teachers: rows });
  } catch (err) {
    res.json({ success: false });
  }
});

// GET TOTAL TESTS COUNT
app.get("/api/admin/tests/count", requireAdmin, async (req, res) => {
  try {
    const [[row]] = await db.execute("SELECT COUNT(*) AS total FROM tests");
    res.json({ success: true, total: row.total });
  } catch (err) {
    res.json({ success: false });
  }
});

// GET TESTS OVERVIEW
app.get("/api/admin/tests", requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";

    const [rows] = await db.execute(
      `SELECT
          t.teacher_id,
          teachers.name,
          COUNT(t.id) AS total_tests,
          MAX(t.created_at) AS last_created
       FROM tests t
       JOIN teachers ON teachers.id = t.teacher_id
       WHERE teachers.name LIKE ?
       GROUP BY t.teacher_id
       ORDER BY total_tests DESC`,
      [`%${search}%`]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

// GET UNIQUE STUDENTS COUNT
app.get("/api/admin/students/count", requireAdmin, async (req, res) => {
  try {
    const [[row]] = await db.execute(`
      SELECT COUNT(*) AS total FROM (
        SELECT student_name, roll_no, class
        FROM student_attempts
        GROUP BY student_name, roll_no, class
      ) AS unique_students
    `);

    res.json({ success: true, total: row.total });
  } catch (err) {
    res.json({ success: false });
  }
});

// GET UNIQUE STUDENTS LIST
app.get("/api/admin/students", requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";

    const [rows] = await db.execute(
      `
      SELECT
        student_name,
        roll_no,
        class,
        MAX(start_time) AS last_attempt
      FROM student_attempts
      WHERE student_name LIKE ?
         OR roll_no LIKE ?
         OR class LIKE ?
      GROUP BY student_name, roll_no, class
      ORDER BY last_attempt DESC
    `,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );

    res.json({ success: true, students: rows });
  } catch (err) {
    res.json({ success: false });
  }
});

//total revenue

app.get("/api/admin/revenue/total", requireAdmin, async (req, res) => {
  try {
    const [[row]] = await db.execute(
      "SELECT SUM(amount) AS total FROM payments WHERE status='SUCCESS'"
    );

    res.json({ success: true, total: row.total || 0 });
  } catch {
    res.json({ success: false });
  }
});

//revenue fetch data table
app.get("/api/admin/revenue", requireAdmin, async (req, res) => {
  try {
    const search = req.query.search || "";

    const [rows] = await db.execute(
      `
      SELECT
        p.order_id,
        p.amount,
        p.status,
        p.payment_time,
        t.name,
        t.email
      FROM payments p
      JOIN teachers t ON p.teacher_id = t.id
      WHERE t.name LIKE ? OR p.order_id LIKE ?
      ORDER BY p.id DESC
    `,
      [`%${search}%`, `%${search}%`]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});

//dowload revenue csv file

app.get("/api/admin/revenue/download", requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        t.name,
        t.email,
        p.order_id,
        p.amount,
        p.status,
        p.payment_time
      FROM payments p
      JOIN teachers t ON p.teacher_id = t.id
    `);

    let csv = "Name,Email,OrderID,Amount,Status,Time\n";

    rows.forEach((r) => {
      csv += `${r.name},${r.email},${r.order_id},${r.amount},${r.status},${r.payment_time}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=revenue.csv");

    res.send(csv);
  } catch {
    res.send("Error");
  }
});

// Testing server run route
app.get("/api/test", (req, res) => {
  res.json({ message: "ParikshaHub backend running 🚀" });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});
