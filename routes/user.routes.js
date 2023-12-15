const express = require("express");
const {
  userProfile,
  logoutUser,
  getLoginUrl,
  userFromGoogle,
  uploadProfilePic,
  removeProfilePic,
  updateProfile,
  getGithubAuthUrl,
  userFromGithub,
  signup,
  signin,
} = require("../controllers/user.controller");
const { authGuard } = require("../middlewares/authUser");

const router = express.Router();

// google auth
router.get("/auth/google/url", getLoginUrl);
router.get("/auth/google", userFromGoogle);

// github auth
router.get("/auth/github/url", getGithubAuthUrl);
router.get("/auth/github", userFromGithub);

// credentials auth
router.post("/signup", signup);
router.post("/signin", signin);

// profile
router.get("/profile", authGuard, userProfile);
router.post("/profile/update", authGuard, updateProfile);

router.post("/logout", authGuard, logoutUser);

// profile picture
router.post("/upload", authGuard, uploadProfilePic);
router.delete("/upload/:id", authGuard, removeProfilePic);

module.exports = router;
