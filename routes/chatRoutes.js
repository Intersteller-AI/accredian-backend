const express = require("express");
const { fetchChats, accessChat } = require("../controllers/chatController");
const { authGuard } = require("../middlewares/authUser");

const router = express.Router();

router.get("/", authGuard, fetchChats);
router.post("/", authGuard, accessChat);

module.exports = router;
