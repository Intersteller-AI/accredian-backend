const { Schema, model } = require("mongoose");

const meetingSchema = new Schema(
  {
    topic: {
      type: String,
      required: true,
    },
    time: {
      type: Date,
      required: true,
    },
    zone: {
      type: String,
    },
    duration: {
      type: Date,
      required: true,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    passcode: {
      type: String,
      required: true,
    },
    isWaiting: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("Meeting", meetingSchema);
