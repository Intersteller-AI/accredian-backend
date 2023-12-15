// @ts-nocheck
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/user.routes.js");
const meetingRoutes = require("./routes/meeting.routes.js");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

const {
  errorResponerHandler,
  invalidPathHandler,
} = require("./middlewares/errorHandler.js");

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://accredian-frontend-ecru.vercel.app",
    ],
    credentials: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// routes
app.use("/api/users", userRoutes);
app.use("/api/meetings", meetingRoutes);

// custom error handlers
app.use(invalidPathHandler);
app.use(errorResponerHandler);

const PORT = 8000 || process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`your server is available on port http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("a user is connected");
  socket.on("add-user", (userId) => {
    socket.join(userId);
  });

  socket.on("join chat", (data) => {
    const room = data.roomdId;
    socket.join(room);
  });

  socket.on("offline", (data) => {
    // console.log("a user is disconnected");
    socket.leave(data);
    onlineUsers.delete(data);
  });
});
