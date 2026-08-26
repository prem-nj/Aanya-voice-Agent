import User from "../models/usermodel.js";

export const getCurrentUSer = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Failed to get current user",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log("getCurrentUSer error:", error);

    return res.status(500).json({
      message: `getCurrentUSer error: ${error.message}`,
    });
  }
};