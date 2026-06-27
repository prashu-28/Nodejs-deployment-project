CREATE DATABASE todo_app;

USE todo_app;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('High','Medium','Low') DEFAULT 'Medium',
    due_date DATE,
    status ENUM('Pending','Completed') DEFAULT 'Pending',
    reminder_hours INT DEFAULT 5,
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

DESC users;
DESC tasks;

SELECT * FROM users;
SELECT * FROM tasks;

SELECT id,title,status,due_date,priority
FROM tasks;

SELECT id,full_name,email,username
FROM users;