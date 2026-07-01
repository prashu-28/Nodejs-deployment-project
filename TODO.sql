-- ============================================================
--  Smart To-Do Manager — Full Database Schema
--  Run this on a fresh database, OR run only the ALTER TABLE
--  block at the bottom if you already have the old schema.
-- ============================================================

CREATE DATABASE IF NOT EXISTS todo_app;
USE todo_app;

DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    full_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(100) UNIQUE NOT NULL,
    username            VARCHAR(50) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,       -- now stores a bcrypt hash, not plaintext
    profile_image       VARCHAR(255),

    -- ── Forgot / Reset Password (OTP) ──────────────────────
    reset_otp           VARCHAR(6)   NULL,           -- 6-digit OTP sent to email
    reset_otp_expires    DATETIME     NULL,           -- OTP validity (10 min)
    reset_otp_attempts  INT          DEFAULT 0,       -- failed attempt counter (lockout)
    reset_token         VARCHAR(64)  NULL,            -- one-time token issued after OTP is verified
    reset_token_expires DATETIME     NULL,            -- token validity (10 min)

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login           TIMESTAMP NULL
);

CREATE TABLE tasks (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    priority        ENUM('High','Medium','Low') DEFAULT 'Medium',
    due_date        DATE,
    status          ENUM('Pending','Completed') DEFAULT 'Pending',
    reminder_hours  INT DEFAULT 5,
    reminder_sent   BOOLEAN DEFAULT FALSE,
    completed_at    DATETIME,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  If you already have an existing todo_app database and don't
--  want to drop it, run ONLY this block instead of the above:
-- ============================================================
-- ALTER TABLE users
--   ADD COLUMN reset_otp VARCHAR(6) NULL,
--   ADD COLUMN reset_otp_expires DATETIME NULL,
--   ADD COLUMN reset_otp_attempts INT DEFAULT 0,
--   ADD COLUMN reset_token VARCHAR(64) NULL,
--   ADD COLUMN reset_token_expires DATETIME NULL;
--
-- -- IMPORTANT: existing plaintext passwords will NOT work with the
-- -- new bcrypt-based login. Either ask users to re-register, or
-- -- run a one-off migration script that bcrypt-hashes each existing
-- -- password value before switching the backend over.