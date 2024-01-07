// @ts-nocheck
const { verify } = require("jsonwebtoken");
const User = require("../models/User");
const pool = require("../start/db.start");

const authGuard = async (req, res, next) => {
  const token = (await req.cookies.token) || req.headers.cookie;

  // req.headers.cookie?.split(";")[0] ||

  if (token) {
    try {
      const { id } = verify(token, process.env.JWT_SECRET);

      const db = await pool();

      const q = "SELECT * FROM Users WHERE id = ?";

      db.query(q, [id], (err, data) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Database error", error: err.toString() });
        }
        if (data.length === 0) {
          return res.status(400).json({
            isError: true,
            message: "User not found!.",
          });
        }

        req.user = data[0];

        next();
      });
    } catch (error) {
      const err = new Error("Not authorized, token failed");
      err.statusCode = 401;
      next(err);
    }
  } else {
    const err = new Error("Not authorized, no token");
    err.statusCode = 401;
    next(err);
  }
};

const adminGuard = async (req, res, next) => {
  if (req.user && req.user.admin) {
    next();
  } else {
    const err = new Error("Not authorized as admin!");
    err.statusCode = 401;
    next(err);
  }
};

module.exports = {
  authGuard,
  adminGuard,
};
