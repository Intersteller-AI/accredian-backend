// @ts-nocheck
const { sign } = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES } = process.env;

const sendToken = async (user, statusCode, res) => {

  const getJwtToken = async function () {
    return await sign({ id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });
  };

  const token = await getJwtToken();

  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    sameSite: "none",
    secure: true,
    httpOnly: true,
  };

  const responseUser = {
    id: user.id,
    email: user.email,
    name: user.user_name,
    avatar: user.avatar,
  };

  res.status(statusCode).cookie("token", token, options).json({
    user: responseUser,
    isError: false,
  });
};

module.exports = sendToken;
