import express from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../models/index.js';

const router = express.Router();
router.use(authenticate);

// GET /api/notifications — get user's notifications
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.sequelize.query(
      `SELECT * FROM notifications WHERE userId = :uid ORDER BY createdAt DESC LIMIT 50`,
      { replacements: { uid: req.user.id } }
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const [rows] = await db.sequelize.query(
      `SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN type = 'emergency' AND isRead = 0 THEN 1 ELSE 0 END) as emergency
       FROM notifications WHERE userId = :uid AND isRead = 0`,
      { replacements: { uid: req.user.id } }
    );
    res.json({ count: Number(rows[0].count), emergency: Number(rows[0].emergency) });
  } catch {
    res.json({ count: 0, emergency: 0 });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await db.sequelize.query(
      `UPDATE notifications SET isRead = 1 WHERE id = :id AND userId = :uid`,
      { replacements: { id: req.params.id, uid: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await db.sequelize.query(
      `UPDATE notifications SET isRead = 1 WHERE userId = :uid`,
      { replacements: { uid: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.sequelize.query(
      `DELETE FROM notifications WHERE id = :id AND userId = :uid`,
      { replacements: { id: req.params.id, uid: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;