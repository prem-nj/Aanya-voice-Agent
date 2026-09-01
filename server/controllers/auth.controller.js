import { genToken } from "../config/token.js";
import User from "../models/usermodel.js";

// Local origins (localhost) are same-site with a local API and cannot use
// `SameSite=None; Secure` cookies over plain HTTP, so relax the cookie
// attributes for them while keeping the strict cross-site config in prod.
const isLocalOrigin = (req) =>
  (req.headers.origin || "").includes("localhost") ||
  (req.headers.origin || "").includes("127.0.0.1")

const cookieOptions = (req) => ({
  httpOnly: false,
  secure: !isLocalOrigin(req),
  sameSite: isLocalOrigin(req) ? "lax" : "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
})

const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, cookieOptions(req));

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      message: `Google auth error: ${error.message}`,
    });
  }
};

export default googleAuth;

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: false,
      secure: !isLocalOrigin(req),
      sameSite: isLocalOrigin(req) ? "lax" : "none",
    });

    return res.status(200).json({
      message: "Logout successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: `Logout auth error: ${error.message}`,
    });
  }
};
