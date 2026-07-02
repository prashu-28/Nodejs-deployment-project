# 📖 About the Project

Smart To-Do Manager is a cloud-based full-stack task management application developed to help users organize and manage their daily activities efficiently.

The application allows users to securely register, log in, manage personal tasks, update their profiles, and recover forgotten passwords using Email OTP verification.

The project demonstrates complete full-stack web development along with real-world cloud deployment using Amazon Web Services (AWS), automated CI/CD with GitHub Actions, HTTPS security using Let's Encrypt, and production hosting with Nginx and PM2.

---

# 🎯 Project Objectives

✅ Build a secure full-stack web application

✅ Deploy the application on AWS Cloud

✅ Implement secure user authentication

✅ Store data using Amazon RDS MySQL

✅ Automate deployment using GitHub Actions

✅ Secure the application using HTTPS

✅ Demonstrate real-world DevOps practices

---

# ✨ Key Features

### 👤 User Management

- User Registration
- User Login
- Secure Password Hashing
- User Profile
- Update Profile

### 🔐 Authentication

- Forgot Password
- Email OTP Verification
- Reset Password
- Secure Authentication

### ✅ Task Management

- Add Tasks
- Edit Tasks
- Delete Tasks
- Set Priority
- Due Date
- Task Status
- Task Completion Tracking

### ☁️ Cloud Features

- AWS EC2 Hosting
- Amazon RDS Database
- HTTPS Enabled
- Nginx Reverse Proxy
- GitHub Actions CI/CD
- PM2 Process Management

---

# 🏗 Project Directory Structure

```
Nodejs-deployment-project
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── backend/
│   ├── app.js
│   ├── db.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
│
├── TODO.sql
│
├── README.md
│
└── .gitignore
```

---

# ⚙️ Installation Guide

## Step 1 — Clone Repository

```bash
git clone https://github.com/prashu-28/Nodejs-deployment-project.git
```

---

## Step 2 — Open Project

```bash
cd Nodejs-deployment-project
```

---

## Step 3 — Install Backend Packages

```bash
cd backend
npm install
```

---

## Step 4 — Configure Environment Variables

Create a `.env` file inside the `backend` folder.

```env
PORT=3000

DB_HOST=your-rds-endpoint
DB_USER=admin
DB_PASSWORD=your-password
DB_NAME=todo_app

EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-google-app-password
```

---

## Step 5 — Import Database

Import the provided SQL file.

```
TODO.sql
```

into your MySQL database.

---

## Step 6 — Start the Application

```bash
node app.js
```

or

```bash
pm2 start app.js --name todo-app
```

---

# 🚀 Deployment Workflow

```
Developer
     │
     ▼
Git Commit
     │
     ▼
GitHub Repository
     │
     ▼
GitHub Actions
     │
     ▼
Amazon EC2
     │
     ▼
PM2 Restart
     │
     ▼
Nginx
     │
     ▼
HTTPS
     │
     ▼
Live Website
```

---

# ☁️ AWS Services Used

- 🖥 Amazon EC2
- 🛢 Amazon RDS (MySQL)
- 🌐 Amazon VPC
- 📍 Elastic IP
- 🔐 IAM
- 🔒 HTTPS (Let's Encrypt)
- 🌍 DuckDNS
- ⚡ Nginx
- 🚀 PM2

---

# 👥 Team Responsibilities

## 🎨 Frontend Development

### 👤 Sreenadhithunga (@Sreenadhithunga2005)

- HTML5
- CSS3
- JavaScript
- Responsive UI
- User Interface Design
- Frontend Integration

⬇️

## ⚙️ Backend Development

### 👤 Subhadayani (@Subhadayani03)

- Node.js
- Express.js
- Authentication APIs
- Task CRUD APIs
- Forgot Password APIs
- Email OTP Integration

⬇️

## 🗄 Database Development

### 👤 Keerthi Perla (@keerthiperla4567)

- MySQL Database
- Table Design
- SQL Queries
- Database Connectivity
- Data Management

⬇️

## ☁️ AWS Cloud & Deployment

### 👤 Shashank (@shashanktechi)

- Amazon EC2
- Amazon RDS
- Amazon VPC
- Elastic IP
- IAM Configuration
- DuckDNS
- Nginx Reverse Proxy
- HTTPS SSL
- PM2
- Production Deployment
- GitHub Actions Integration

⬇️

## 🔄 Git & Documentation

### 👤 Prasanth (@prashu-28)

- Git Repository Management
- Branch Management
- Merge Management
- GitHub Repository
- Project Documentation
- Team Coordination

---

# 🌐 Live Website

https://smarttodo.duckdns.org

---

# 🎉 Final Output

✔ Secure Authentication

✔ Email OTP Verification

✔ Cloud Deployment

✔ HTTPS Enabled

✔ Responsive User Interface

✔ GitHub Actions CI/CD

✔ AWS Infrastructure

✔ Production Ready Application