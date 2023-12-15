const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
    },
    reciever: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    messageStatus: {
      type: String,
    },
    messageType: {
      type: String,
      default: "text",
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
  },
  { timestamps: true }
);

module.exports = model("Message", messageSchema);
