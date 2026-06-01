# 💰 Smart Expense Tracker

A clean expense tracker with React frontend + Node/Express backend + SQLite database.

---

## 🚀 Setup (2 terminals)

### Terminal 1 — Backend
```
cd backend
npm install
npm run dev
```
Backend runs on: http://localhost:5000 (configurable in `backend/.env`)

### Terminal 2 — Frontend
```
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:3000 (configurable in `frontend/.env`)

---

## ✅ Features
- Register / Login (JWT auth)
- Add income & expense transactions
- Filter by month/year and type
- Dashboard with monthly summary (income, expense, balance)
- Transactions list with delete
- Monthly summary with category breakdown + progress bars
- Data stored in SQLite (no setup needed)

## 📁 Structure
```
expense-tracker/
├── backend/
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── routes/transactions.js
│   ├── db.js
│   ├── server.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx       ← all pages in one file
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```
