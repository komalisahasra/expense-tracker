require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
