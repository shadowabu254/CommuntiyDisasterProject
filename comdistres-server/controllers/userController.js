import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  const users = await User.findAll();
  res.json(users);
};

export const updateRole = async (req, res) => {
  const { role } = req.body;

  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = role;
  await user.save();

  res.json({ message: "Role updated", user });
};
