import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fuelledger_secret_key_12345';

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username and password' });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Invalid credentials or user is inactive' });
    }

    if (user.role !== 'Owner') {
      return res.status(403).json({ message: 'Access denied: Only Owner accounts can log in.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Google Auth Login
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID token is required' });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const ownerEmail = process.env.OWNER_EMAIL;

    if (!clientId || !ownerEmail) {
      return res.status(500).json({
        message: 'Google Auth (GOOGLE_CLIENT_ID) or Owner Email (OWNER_EMAIL) environment variables are not configured.'
      });
    }

    const verificationClient = new OAuth2Client(clientId);
    const ticket = await verificationClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google ID token does not contain email.' });
    }

    if (email.toLowerCase() !== ownerEmail.toLowerCase()) {
      return res.status(403).json({ message: `Access denied: ${email} is not authorized as the Owner.` });
    }

    // Find or create Owner user in database
    let user = await User.findOne({ role: 'Owner' });
    if (!user) {
      user = new User({
        name: name || 'Owner',
        username: email.toLowerCase(),
        password: Math.random().toString(36).substring(2) + Date.now().toString(36), // Random password placeholder
        role: 'Owner',
        active: true,
      });
      await user.save();
    } else {
      // Update name and email if they changed
      user.name = name || user.name;
      user.username = email.toLowerCase();
      if (!user.active) {
        user.active = true;
      }
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid Google token', error: error.message });
  }
});

// Register user (Owner only)
router.post('/register', protect, restrictTo('Owner'), async (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const userExists = await User.findOne({ username: username.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const user = await User.create({
      name,
      username,
      password,
      role,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

// Get all users (Owner and Manager only)
router.get('/users', protect, restrictTo('Owner', 'Manager'), async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users', error: error.message });
  }
});

// Toggle user active status (Owner only)
router.put('/users/:id/toggle', protect, restrictTo('Owner'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.username === req.user.username) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }
    user.active = !user.active;
    await user.save();
    res.json({ message: `User status changed to ${user.active ? 'Active' : 'Inactive'}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling user status', error: error.message });
  }
});

export default router;
