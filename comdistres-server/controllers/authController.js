import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sequelize } from '../db.js';
import UserModel from '../models/User.js';
const User = UserModel(sequelize);

import dotenv from 'dotenv';
dotenv.config();

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

// Cookie options — must use secure+sameSite=none for cross-origin (Render frontend + Render backend)
const cookieOptions = {
  httpOnly: true,
  secure: true,          // required for sameSite: 'none'
  sameSite: 'none',      // required for cross-origin cookies (frontend & backend on different domains)
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      name, 
      email, 
      passwordHash, 
      role:     role || 4,
      phone:    phone || null,
      address:  address || null,
      isactive: true,   // always active on signup
    });

    const token = signToken(user);
    res.cookie('token', token, cookieOptions);

    res.json({ 
      id:       user.id, 
      name:     user.name, 
      email:    user.email, 
      role:     user.role,
      phone:    user.phone,
      address:  user.address,
      isactive: user.isactive
    });
  } catch (err) { 
    console.error('Signup error:', err); 
    res.status(500).json({ message: 'Server error', error: err.message }); 
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isactive) {
      return res.status(403).json({ message: "Account is deactivated. Contact administrator." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    res.cookie('token', token, cookieOptions);

    res.json({ 
      id:       user.id, 
      name:     user.name, 
      email:    user.email, 
      role:     user.role,
      phone:    user.phone,
      address:  user.address,
      isactive: user.isactive
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token', { ...cookieOptions });
  res.json({ ok: true, message: 'Logged out successfully' });
};

export const me = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.id, { 
      attributes: ['id', 'name', 'email', 'role', 'phone', 'address', 'isactive'] 
    });

    if (!user)          return res.status(401).json({ message: 'User not found' });
    if (!user.isactive) return res.status(403).json({ message: 'Account is deactivated' });

    res.json(user);
  } catch (err) { 
    res.status(401).json({ message: 'Unauthorized' }); 
  }
};
/* import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sequelize } from '../db.js';
import UserModel from '../models/User.js';
const User = UserModel(sequelize);

import dotenv from 'dotenv';
dotenv.config();

const signToken = (user) => {
  console.log("Signing token with SECRET: ", process.env.JWT_SECRET ? 'EXISTS' : 'MISSING');
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
}

export const signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      name, 
      email, 
      passwordHash, 
      role: role || 4,
      phone: phone || null,
      address: address || null,
      isactive: true
    });

    const token = signToken(user);
    
    res.cookie('token', token, { 
      httpOnly: true, 
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      phone: user.phone,
      address: user.address,
      isactive: user.isactive
    });
  } catch (err) { 
    console.error('Signup error:', err); 
    res.status(500).json({ message: 'Server error', error: err.message }); 
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isactive) {
      return res.status(403).json({ message: "Account is deactivated. Contact administrator." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = signToken(user);
    console.log("Token created: ", token.substring(0, 50) + '...');

    // Send cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data with role for frontend routing
    res.json({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      phone: user.phone,
      address: user.address,
      isactive: user.isactive
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true, message: 'Logged out successfully' });
};

export const me = async (req, res) => {
  try {
    console.log('Cookies received:', req.cookies);
    const token = req.cookies?.token;
    
    if (!token) {
      console.log("No Token Found");
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log("Token found, verifying...");
    console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified, payload:", payload);

    const user = await User.findByPk(payload.id, { 
      attributes: ['id', 'name', 'email', 'role', 'phone', 'address', 'isActive'] 
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isactive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    res.json(user);
  } catch (err) { 
    console.error('Auth error:', err.message);
    console.log("Full error:", err);
    res.status(401).json({ message: 'Unauthorized' }); 
  }
};
 */