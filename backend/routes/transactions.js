const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, (req, res) => {
  const { month, year } = req.query;
  let q = 'SELECT * FROM transactions WHERE user_id=?';
  const params = [req.user.id];
  if (month && year) {
    q += " AND strftime('%m',date)=? AND strftime('%Y',date)=?";
    params.push(String(month).padStart(2,'0'), String(year));
  }
  q += ' ORDER BY date DESC, created_at DESC';
  db.all(q, params, (err, rows) => res.json(rows || []));
});

router.post('/', auth, (req, res) => {
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !date) return res.status(400).json({ message: 'type, amount, date required' });
  db.run('INSERT INTO transactions (user_id,type,amount,category,description,date) VALUES (?,?,?,?,?,?)',
    [req.user.id, type, amount, category || 'Other', description || '', date],
    function(err) {
      if (err) return res.status(500).json({ message: 'Failed' });
      db.get('SELECT * FROM transactions WHERE id=?', [this.lastID], (e, row) => res.json(row));
    });
});

router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM transactions WHERE id=? AND user_id=?', [req.params.id, req.user.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  });
});

router.get('/summary', auth, (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  db.all(
    `SELECT type, SUM(amount) as total FROM transactions
     WHERE user_id=? AND strftime('%m',date)=? AND strftime('%Y',date)=? GROUP BY type`,
    [req.user.id, String(m).padStart(2,'0'), String(y)],
    (err, rows) => {
      const s = { income: 0, expense: 0 };
      (rows||[]).forEach(r => { s[r.type] = r.total; });
      s.balance = s.income - s.expense;
      res.json(s);
    }
  );
});

module.exports = router;
