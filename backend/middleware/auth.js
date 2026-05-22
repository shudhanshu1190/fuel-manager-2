import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shift from '../models/Shift.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fuelledger_secret_key_12345';

// Protect routes
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.active) {
      return res.status(401).json({ message: 'User is inactive or not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Restrict to roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role (${req.user.role}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Ensure there is an active open shift
export const requireOpenShift = async (req, res, next) => {
  try {
    const activeShift = await Shift.findOne({ status: 'Open' });
    if (!activeShift) {
      return res.status(400).json({
        message: 'No active shift is open. Please open a shift before performing transactions.',
      });
    }
    req.activeShift = activeShift;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking shift status', error: error.message });
  }
};

// Check if shift is closed for editing and enforce Owner-only access
export const checkShiftLock = (getShiftIdFromRequest) => {
  return async (req, res, next) => {
    try {
      const shiftId = await getShiftIdFromRequest(req);
      if (!shiftId) {
        return res.status(400).json({ message: 'Associated shift ID not found' });
      }

      const shift = await Shift.findById(shiftId);
      if (!shift) {
        return res.status(404).json({ message: 'Shift not found' });
      }

      if (shift.status === 'Closed' && req.user.role !== 'Owner') {
        return res.status(403).json({
          message: 'This shift is closed. Only the Owner can perform operations on closed shifts.',
        });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: 'Shift lock validation failed', error: error.message });
    }
  };
};
