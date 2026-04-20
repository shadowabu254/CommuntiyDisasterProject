import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Allows Admin (role 1) AND Coordinator (role 2)
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if (req.user.role !== 1 && req.user.role !== 2) {
    return res.status(403).json({ message: "Access denied. Admin or Coordinator only." });
  }
  next();
};