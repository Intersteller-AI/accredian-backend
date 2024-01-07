const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const {
  errorResponerHandler,
  invalidPathHandler,
} = require("../middlewares/errorHandler");
const userRoutes = require("../routes/user.routes");

module.exports = (app) => {
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
      ],
      credentials: true,
    })
  );

  app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
  //adding additional apis
  app.get("/", (req, res) =>
    res.send({
      message: "USERS SERVER IS LIVE!",
    })
  );

  //start of routes
  app.use("/api/users", userRoutes);
  //end of routes

  //handling async errors in apis
  app.use(invalidPathHandler);
  app.use(errorResponerHandler);
};

console.log("🛣️  Routes setup completed");
