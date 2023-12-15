const sendToken = async (user, statusCode, res) => {
  const token = await user.getJwtToken();

  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    sameSite: "none",
    secure: true,
    httpOnly: true,
  };

  const responseUser = {
    _id: user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };

  res.status(statusCode).cookie("token", token, options).json({
    user: responseUser,
  });
};

module.exports = sendToken;
