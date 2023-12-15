const Meeting = require("../models/Meeting");

const createMeeting = async (req, res, next) => {
  try {
    const {
      topic,
      time,
      durationHours,
      durationMinutes,
      timeZone,
      attendees,
      passcode,
      isWaiting,
    } = req.body;

    if (!topic && !time && !passcode && !durationHours && !durationMinutes) {
      next(new Error("Required all fields!"));
    }
    const durationInMinutes = durationHours * 60 + durationMinutes;
    // to get the total hours
    // let totalHours = Math.floor(totalDuration / 60);
    // let remainingMinutes = totalDuration % 60;

    const meeting = await Meeting.create({
      topic,
      zone: timeZone.value ? timeZone.value : "",
      isWaiting: isWaiting,
      attendees: attendees,
      duration: durationInMinutes,
      time: time,
      passcode,
    });

    return res.json(meeting);
  } catch (error) {
    next(error);
  }
};

const allMeetings = async (req, res, next) => {
  try {
    const meetings = await Meeting.find();

    return res.json(meetings);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMeeting,
  allMeetings,
};
