require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");
const nodemailer = require("nodemailer");
const db       = require("./db");
const app = express();

app.use(cors());
app.use(express.json());

/* ===========================
   CONFIG
=========================== */
const SALT_ROUNDS   = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
const OTP_EXPIRY_MIN = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
const TOKEN_EXPIRY_MIN = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES, 10) || 10;
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS, 10) || 5;

/* ===========================
   MAIL TRANSPORTER (Gmail)
=========================== */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
         user: process.env.EMAIL_USER,
         pass: process.env.EMAIL_PASS
    }
});

transporter.verify((err) => {
    if (err) {
        console.error("⚠️  Gmail transporter failed to initialize:", err.message);
        console.error("    Check GMAIL_USER / GMAIL_APP_PASSWORD in your .env file.");
    } else {
        console.log("✅ Gmail transporter ready to send OTP emails.");
    }
});

async function sendOtpEmail(to, name, otp) {
    const mailOptions = {
        from: `"ToDoPro Support" <${process.env.GMAIL_USER}>`,
        to,
        subject: "Your ToDoPro Password Reset Code",
        html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
                <h2 style="color:#2563eb;margin-top:0;">Password Reset Request</h2>
                <p>Hi ${name || "there"},</p>
                <p>We received a request to reset your ToDoPro password. Use the code below to continue:</p>
                <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                            background:#f1f5f9;padding:16px;border-radius:8px;margin:20px 0;color:#1e293b;">
                    ${otp}
                </div>
                <p>This code expires in <strong>${OTP_EXPIRY_MIN} minutes</strong>.</p>
                <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

function generateOtp() {
    // 6-digit numeric OTP, e.g. "042817"
    return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function generateResetToken() {
    return crypto.randomBytes(32).toString("hex");
}

/* ===========================
   HOME ROUTE
=========================== */

app.use(express.static("../frontend"));

/* ===========================
   REGISTER
=========================== */

app.post("/register", async (req, res) => {

    const {
        full_name,
        email,
        username,
        password
    } = req.body;

    if (!full_name || !email || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
        const [existing] = await db.promise().query(
            "SELECT id FROM users WHERE email=? OR username=?",
            [email, username]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Email or username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const sql = `
        INSERT INTO users (full_name, email, username, password)
        VALUES (?, ?, ?, ?)
        `;

        await db.promise().query(sql, [full_name, email, username, hashedPassword]);

        res.status(201).json({ message: "Registration Successful" });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Registration Failed", error: err.message });
    }

});


/* ===========================
   LOGIN
=========================== */

app.post("/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const [result] = await db.promise().query(
            "SELECT * FROM users WHERE email=?",
            [email]
        );

        if (result.length === 0) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        // Update last login timestamp
        await db.promise().query(
            "UPDATE users SET last_login=NOW() WHERE id=?",
            [user.id]
        );

        // Return user without password / reset fields
        const {
            password: _pw,
            reset_otp, reset_otp_expires, reset_otp_attempts,
            reset_token, reset_token_expires,
            ...safeUser
        } = user;

        res.json({
            message: "Login Successful",
            user: safeUser
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login Failed" });
    }

});


/* ===========================
   FORGOT PASSWORD — STEP 1
   Request an OTP be emailed
=========================== */

app.post("/forgot-password", async (req, res) => {

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const [result] = await db.promise().query(
            "SELECT id, full_name, email FROM users WHERE email=?",
            [email]
        );

        // Always respond with a generic success message so we don't leak
        // which emails are registered.
        const genericMsg = { message: "If that email is registered, an OTP has been sent." };

        if (result.length === 0) {
            return res.json(genericMsg);
        }

        const user = result[0];
        const otp = generateOtp();
        const expires = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

        await db.promise().query(
            `UPDATE users
             SET reset_otp=?, reset_otp_expires=?, reset_otp_attempts=0,
                 reset_token=NULL, reset_token_expires=NULL
             WHERE id=?`,
            [otp, expires, user.id]
        );

        try {
            await sendOtpEmail(user.email, user.full_name, otp);
        } catch (mailErr) {
            console.error("Failed to send OTP email:", mailErr);
            return res.status(500).json({ message: "Failed to send OTP email. Please try again later." });
        }

        res.json(genericMsg);

    } catch (err) {
        console.error("Forgot-password error:", err);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }

});


/* ===========================
   FORGOT PASSWORD — STEP 2
   Verify the OTP, issue a reset token
=========================== */

app.post("/verify-otp", async (req, res) => {

    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
        const [result] = await db.promise().query(
            "SELECT id, reset_otp, reset_otp_expires, reset_otp_attempts FROM users WHERE email=?",
            [email]
        );

        if (result.length === 0) {
            return res.status(400).json({ message: "Invalid email or OTP" });
        }

        const user = result[0];

        if (!user.reset_otp || !user.reset_otp_expires) {
            return res.status(400).json({ message: "No OTP request found. Please request a new code." });
        }

        if (user.reset_otp_attempts >= MAX_OTP_ATTEMPTS) {
            return res.status(429).json({ message: "Too many attempts. Please request a new code." });
        }

        if (new Date(user.reset_otp_expires) < new Date()) {
            return res.status(400).json({ message: "OTP has expired. Please request a new code." });
        }

        if (user.reset_otp !== String(otp).trim()) {
            await db.promise().query(
                "UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id=?",
                [user.id]
            );
            return res.status(400).json({ message: "Incorrect OTP" });
        }

        // OTP correct — issue a short-lived reset token, clear the OTP
        const resetToken = generateResetToken();
        const tokenExpires = new Date(Date.now() + TOKEN_EXPIRY_MIN * 60 * 1000);

        await db.promise().query(
            `UPDATE users
             SET reset_otp=NULL, reset_otp_expires=NULL, reset_otp_attempts=0,
                 reset_token=?, reset_token_expires=?
             WHERE id=?`,
            [resetToken, tokenExpires, user.id]
        );

        res.json({ message: "OTP verified", resetToken });

    } catch (err) {
        console.error("Verify-otp error:", err);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }

});


/* ===========================
   FORGOT PASSWORD — STEP 3
   Reset the password using the token from step 2
=========================== */

app.post("/reset-password", async (req, res) => {

    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ message: "Email, reset token, and new password are required" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
        const [result] = await db.promise().query(
            "SELECT id, reset_token, reset_token_expires FROM users WHERE email=?",
            [email]
        );

        if (result.length === 0) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const user = result[0];

        if (!user.reset_token || user.reset_token !== resetToken) {
            return res.status(400).json({ message: "Invalid or expired reset session. Please start over." });
        }

        if (new Date(user.reset_token_expires) < new Date()) {
            return res.status(400).json({ message: "Reset session expired. Please start over." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await db.promise().query(
            `UPDATE users
             SET password=?, reset_token=NULL, reset_token_expires=NULL
             WHERE id=?`,
            [hashedPassword, user.id]
        );

        res.json({ message: "Password reset successful. You can now log in." });

    } catch (err) {
        console.error("Reset-password error:", err);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }

});


/* ===========================
   GET PROFILE
=========================== */

app.get("/profile/:id", (req, res) => {

    const id = req.params.id;

    db.query(
        "SELECT id, full_name, email, username, last_login FROM users WHERE id=?",
        [id],
        (err, result) => {

            if (err) {
                console.error("Get profile error:", err);
                return res.status(500).json({ message: "Error fetching profile" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json(result[0]);

        }
    );

});


/* ===========================
   UPDATE PROFILE
=========================== */

app.put("/profile/:id", (req, res) => {

    const id = req.params.id;

    const { full_name, email } = req.body;

    if (!full_name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
    }

    const sql = `
    UPDATE users
    SET full_name=?, email=?
    WHERE id=?
    `;

    db.query(sql, [full_name, email, id], (err, result) => {

        if (err) {
            console.error("Update profile error:", err);
            return res.status(500).json({ message: "Profile Update Failed" });
        }

        res.json({ message: "Profile Updated" });

    });

});


/* ===========================
   ADD TASK
=========================== */

app.post("/tasks", (req, res) => {

    const {
        user_id,
        title,
        description,
        priority,
        due_date
    } = req.body;

    if (!user_id || !title) {
        return res.status(400).json({ message: "user_id and title are required" });
    }

    const sql = `
    INSERT INTO tasks (user_id, title, description, priority, due_date)
    VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [user_id, title, description || null, priority || "Medium", due_date || null],
        (err, result) => {

            if (err) {
                console.error("Add task error:", err);
                return res.status(500).json({ message: "Task Not Added", error: err.message });
            }

            res.status(201).json({ message: "Task Added Successfully", task_id: result.insertId });

        }
    );

});


/* ===========================
   GET ALL TASKS (for a user)
=========================== */

app.get("/tasks/:user_id", (req, res) => {

    const user_id = req.params.user_id;

    db.query(
        "SELECT * FROM tasks WHERE user_id=? ORDER BY id DESC",
        [user_id],
        (err, result) => {

            if (err) {
                console.error("Get tasks error:", err);
                return res.status(500).json({ message: "Error Loading Tasks" });
            }

            res.json(result);

        }
    );

});


/* ===========================
   UPDATE TASK STATUS
=========================== */

app.put("/tasks/:id", (req, res) => {

    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: "Status is required" });
    }

    let sql = "";

    if (status === "Completed") {
        sql = `
        UPDATE tasks
        SET status='Completed', completed_at=NOW()
        WHERE id=?
        `;
    } else {
        sql = `
        UPDATE tasks
        SET status='Pending', completed_at=NULL
        WHERE id=?
        `;
    }

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.error("Update task error:", err);
            return res.status(500).json({ message: "Task Update Failed" });
        }

        res.json({ message: "Task Updated" });

    });

});


/* ===========================
   DELETE ALL TASKS (for a user)
=========================== */

app.delete("/tasks/user/:user_id", (req, res) => {

    const user_id = req.params.user_id;

    db.query(
        "DELETE FROM tasks WHERE user_id=?",
        [user_id],
        (err, result) => {

            if (err) {
                console.error("Clear tasks error:", err);
                return res.status(500).json({ message: "Failed to clear tasks" });
            }

            res.json({ message: "All Tasks Deleted" });

        }
    );

});


/* ===========================
   DELETE SINGLE TASK
=========================== */

app.delete("/tasks/:id", (req, res) => {

    const id = req.params.id;

    db.query(
        "DELETE FROM tasks WHERE id=?",
        [id],
        (err, result) => {

            if (err) {
                console.error("Delete task error:", err);
                return res.status(500).json({ message: "Delete Failed" });
            }

            res.json({ message: "Task Deleted" });

        }
    );

});


/* ===========================
   DEBUG: CHECK DB TABLES
=========================== */

app.get("/check-db", (req, res) => {
    db.query("SHOW TABLES", (err, result) => {
        if (err) return res.json(err);
        res.json(result);
    });
});


/* ===========================
   SERVER
=========================== */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});