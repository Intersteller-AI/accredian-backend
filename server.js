const express = require("express");
require("dotenv").config();

const app = express();

require("./start/index.start")(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//   },
// });

// io.on("connection", (socket) => {
//   console.log("a user is connected");
//   socket.on("add-user", (userId) => {
//     socket.join(userId);
//   });

//   socket.on("join chat", (data) => {
//     const room = data.roomdId;
//     socket.join(room);
//   });

//   socket.on("offline", (data) => {
//     // console.log("a user is disconnected");
//     socket.leave(data);
//     onlineUsers.delete(data);
//   });
// });
