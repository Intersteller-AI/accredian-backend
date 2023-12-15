const express = require("express");
const { createMeeting, allMeetings } = require("../controllers/meeting.controllers");
const { authGuard } = require("../middlewares/authUser");

const router = express.Router();

router.post("/", authGuard, createMeeting);
router.get("/", authGuard, allMeetings);


module.exports = router;
