// @ts-nocheck
const User = require("../models/User");
const Chat = require("../models/Chat");
const Messages = require("../models/Messages");

const fetchChatsAll = async (req, res, next) => {
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

const accessChat = async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    next(new Error("User not found!"));
  }

  const isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  }).populate([
    {
      path: "users",
    },
    {
      path: "latestMessage",
      populate: {
        path: "sender",
        select: "name avatar email",
      },
    },
  ]);

  if (isChat.length > 0) {
    return res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users"
      );
      return res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
};

const fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
      latestMessage: { $exists: true },
    })
      .populate([
        {
          path: "users",
        },
        {
          path: "latestMessage",
          populate: [
            {
              path: "sender",
              select: "name avatar email",
            },
            {
              path: "reciever",
              select: "name avatar email",
            },
          ],
        },
      ])
      .sort({ updatedAt: -1 });

    return res.status(200).send({
      allChats: chats,
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
};

module.exports = {
  accessChat,
  fetchChats,
  fetchChatsAll,
};
