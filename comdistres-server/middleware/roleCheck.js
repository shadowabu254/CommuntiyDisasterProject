export function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Convert role names to role IDs
    const roleMap = {
      'administrator': 1,
      'coordinator': 2,
      'volunteer': 3,
      'citizen': 4
    };

    const allowedRoleIds = allowedRoles.map(role => 
      typeof role === 'string' ? roleMap[role] : role
    );

    if (!allowedRoleIds.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
}