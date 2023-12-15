const express = require("express");
const {
  addMessage,
  getMessage,
  uploadPic,
  getInitialContactsMessages,
  sendMessage,
  allMessages,
} = require("../controllers/messageController");
const { authGuard } = require("../middlewares/authUser");

const router = express.Router();

router.post("/add-message", authGuard, addMessage);
router.post("/send-message", authGuard, sendMessage);
router.get("/all-messages/:chatId/:userId", authGuard, allMessages);
router.get("/get-messages/:from/:to", authGuard, getMessage);
router.get(
  "/get-initial-contacts",
  authGuard,
  getInitialContactsMessages
);
router.post("/upload/:from/:to", authGuard, uploadPic);

module.exports = router;
