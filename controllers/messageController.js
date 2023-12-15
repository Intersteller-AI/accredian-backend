// @ts-nocheck
const mongoose = require("mongoose");
const Messages = require("../models/Messages");
const cloudinary = require("cloudinary").v2;
const formidable = require("formidable");
const User = require("../models/User");
const Chat = require("../models/Chat");

const addMessage = async (req, res, next) => {
  try {
    const { message, from, to } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      next(new Error("User not found!"));
    }

    const recieverUser = await User.findById(to);

    if (!recieverUser) {
      next(new Error("Reciever user not found!"));
    }

    const getUser = onlineUsers.get(to);
    if (message && from && to) {
      const newMessage = await Messages.create({
        content: message,
        sender: from,
        reciever: to,
        messageStatus: getUser ? "delivered" : "sent",
      });
      user.sentMessages.push(newMessage._id);
      await user.save();
      recieverUser.recievedMessages.push(newMessage._id);
      await recieverUser.save();
      return res.status(201).json(newMessage);
    }
    return res.status(400).json({
      message: "Message, From and To Required",
    });
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { message, chatId, to } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      next(new Error("User not found!"));
    }

    const recieverUser = await User.findById(to);

    if (!recieverUser) {
      next(new Error("Reciever user not found!"));
    }

    const getUser = onlineUsers.get(to);
    const isUserSeeing = roomUsers[chatId].includes(to);
    if (message && chatId) {
      const newMessage = await Messages.create({
        content: message,
        sender: user._id,
        reciever: to,
        chat: chatId,
        messageStatus: isUserSeeing ? "read" : getUser ? "delivered" : "sent",
      });

      const chat = await Chat.findById(chatId);
      chat.latestMessage = newMessage._id;
      if (newMessage.messageStatus !== "read") {
        chat.totalUnreadMessages.push(newMessage._id);
      }
      await chat.save();

      const messagePopulate = await newMessage.populate("chat");

      return res.json(messagePopulate);
    }
    return res.status(400).json({
      message: "Message, chatId and To Required",
    });
  } catch (error) {
    next(error);
  }
};

const allMessages = async (req, res, next) => {
  try {
    const { chatId, userId } = req.params;

    if (!chatId || !userId) {
      next(new Error("Must need to provide chat id and another user's id"));
    }

    const anotherUserMessages = await Messages.find({
      chat: chatId,
      sender: userId,
      reciever: req.user._id,
    });

    const unreadMessages = [];
    const chat = await Chat.findById(chatId);

    anotherUserMessages.forEach((message, index) => {
      if (message.messageStatus !== "read") {
        anotherUserMessages[index].messageStatus = "read";
        unreadMessages.push(message._id);
        chat.totalUnreadMessages = [];
      }
    });    
    await chat.save();

    await Messages.updateMany(
      { _id: { $in: unreadMessages } },
      { $set: { messageStatus: "read" } }
    );

    const messages = await Messages.find({ chat: chatId });

    if (!messages) {
      next(new Error("Not found error"));
    }

    return res.json(messages);
  } catch (error) {
    next(error);
  }
};

const getMessage = async (req, res, next) => {
  try {
    const { from, to } = req.params;

    const obj_to = new mongoose.Types.ObjectId(to);

    const messages = await Messages.find({
      $or: [
        { sender: from, reciever: to },
        { sender: to, reciever: from },
      ],
    }).sort({ createdAt: 1 });

    const unreadMessages = [];

    messages.forEach((message, index) => {
      if (
        message.messageStatus !== "read" &&
        message.sender.toString() === obj_to.toString()
      ) {
        messages[index].messageStatus = "read";
        unreadMessages.push(message._id);
      }
    });

    await Messages.updateMany(
      { _id: { $in: unreadMessages } },
      { $set: { messageStatus: "read" } }
    );

    return res.status(201).json({
      messages,
    });
  } catch (error) {
    next(error);
  }
};

const uploadPic = async (req, res, next) => {
  try {
    const { from, to } = req.params;

    const form = formidable();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        next(err);
      }
      if (files) {
        const { secure_url } = await cloudinary.uploader.upload(
          files.file.filepath,
          {
            width: 1920,
            crop: "scale",
          }
        );
        const getUser = onlineUsers.get(to);
        const newMessage = await Messages.create({
          content: secure_url,
          sender: from,
          reciever: to,
          messageStatus: getUser ? "delivered" : "sent",
          messageType: "image",
        });

        return res.status(201).json(newMessage);
      }
    });
  } catch (err) {
    res.send(err);
  }
};

const getInitialContactsMessages = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate([
      {
        path: "sentMessages",
        populate: [
          {
            path: "reciever",
          },
          {
            path: "sender",
          },
        ],
        options: {
          sort: { createdAt: -1 },
        },
      },
      {
        path: "recievedMessages",
        populate: [
          {
            path: "reciever",
          },
          {
            path: "sender",
          },
        ],
        options: {
          sort: { createdAt: -1 },
        },
      },
    ]);

    if (!user) {
      next(new Error("User not found!"));
    }

    const messages = [...user.sentMessages, ...user.recievedMessages];
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const users = new Map();
    const messageStatusChange = [];

    messages.forEach((msg) => {
      const isSender = msg.sender._id.toString() === req.user._id.toString();
      const calculatedId = isSender
        ? msg.reciever._id.toString()
        : msg.sender._id.toString();

      if (msg.messageStatus === "sent") {
        messageStatusChange.push(msg._id);
      }

      const {
        _id,
        sender,
        reciever,
        messageStatus,
        messageType,
        createdAt,
        content,
      } = msg;
      if (!users.get(calculatedId)) {
        let user = {
          messageId: _id,
          messageType,
          content,
          sender: sender._id,
          reciever: reciever._id,
          createdAt,
          messageStatus,
        };
        if (isSender) {
          user = {
            ...user,
            _id: msg.reciever._id,
            name: msg.reciever.name,
            avatar: msg.reciever.avatar,
            email: msg.reciever.email,
            about: msg.reciever.about,
            sentMessages: msg.reciever.sentMessages,
            recievedMessages: msg.reciever.recievedMessages,
            totalUnreadMessages: 0,
          };
        } else {
          user = {
            ...user,
            _id: msg.sender._id,
            name: msg.sender.name,
            avatar: msg.sender.avatar,
            email: msg.sender.email,
            about: msg.sender.about,
            sentMessages: msg.sender.sentMessages,
            recievedMessages: msg.sender.recievedMessages,
            totalUnreadMessages: messageStatus !== "read" ? 1 : 0,
          };
        }
        users.set(calculatedId, { ...user });
      } else if (messageStatus !== "read" && !isSender) {
        const user = users.get(calculatedId);
        users.set(calculatedId, {
          ...user,
          totalUnreadMessages: user.totalUnreadMessages + 1,
        });
      }
    });

    if (messageStatusChange.length) {
      await Messages.updateMany(
        { _id: { $in: messageStatusChange } },
        { $set: { messageStatus: "delivered" } }
      );
    }

    return res.status(201).json({
      users: Array.from(users.values()),
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addMessage,
  sendMessage,
  allMessages,
  getMessage,
  uploadPic,
  getInitialContactsMessages,
};
