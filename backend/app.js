const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

/* ===========================
   HOME ROUTE
=========================== */

app.use(express.static("../frontend"));

/* ===========================
   REGISTER
=========================== */

app.post("/register", (req, res) => {

    const {
        full_name,
        email,
        username,
        password
    } = req.body;

    if (!full_name || !email || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    db.query(
        "SELECT id FROM users WHERE email=? OR username=?",
        [email, username],
        (err, result) => {

            if (err) {
                console.error("Register check error:", err);
                return res.status(500).json({ message: "Registration Failed", error: err.message });
            }

            if (result.length > 0) {
                return res.status(409).json({ message: "Email or username already exists" });
            }

            const sql = `
            INSERT INTO users (full_name, email, username, password)
            VALUES (?, ?, ?, ?)
            `;

            db.query(sql, [full_name, email, username, password], (err, result) => {

                if (err) {
                    console.error("Register insert error:", err);
                    return res.status(500).json({ message: "Registration Failed", error: err.message });
                }

                res.status(201).json({ message: "Registration Successful" });

            });
        }
    );

});


/* ===========================
   LOGIN
=========================== */

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const sql = `
    SELECT *
    FROM users
    WHERE email=? AND password=?
    `;

    db.query(sql, [email, password], (err, result) => {

        if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login Failed" });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        // Update last login timestamp
        db.query(
            "UPDATE users SET last_login=NOW() WHERE id=?",
            [result[0].id]
        );

        // Return user without password
        const { password: _pw, ...safeUser } = result[0];

        res.json({
            message: "Login Successful",
            user: safeUser
        });

    });

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
   DELETE SINGLE TASK
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
   DELETE ALL TASKS (for a user)
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

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});