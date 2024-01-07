const { PORT } = process.env;

module.exports = async (app) => {
  // connecting database
  await require("./db.start")()
    .then((pool) => {
      console.log("💽 Database is Connected Successfully.");
    })
    .catch((err) => {
      console.log(err);
    });
  require("./routes.start")(app);

  // Starting Server
  app.listen(PORT || 8000, () => {
    console.log(`🚀 Server is Running on => http://localhost:${PORT || 8000}`);
  });
};
