const mysql = require("mysql2");

// Create MySQL Connection
const db = mysql.createConnection({
    host: "todo-rds.c2tc4su62lt4.us-east-1.rds.amazonaws.com",
    user: "admin",
    password: "123456789ASd",
    database: "todo_app",
    port: 3306
});

// Connect to Database
db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Failed");
        console.error(err);
        return;
    }
    console.log("✅ Connected to AWS RDS MySQL Database");
});

// Export Connection
module.exports = db;