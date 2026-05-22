import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Get audit logs (Owner/Manager only)
router.get('/', protect, restrictTo('Owner', 'Manager'), async (req, res) => {
  const { search, actionType, entityName, startDate, endDate } = req.query;
  const filter = {};

  if (actionType) {
    filter.action = actionType;
  }
  if (entityName) {
    filter.entityName = entityName;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { username: searchRegex },
      { remarks: searchRegex },
    ];
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  try {
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200); // Limit to top 200 for performance
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving audit logs', error: error.message });
  }
});

export default router;
