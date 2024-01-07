const mysql = require("mysql");

module.exports = () => {
  return new Promise((resolve, reject) => {
    const pool = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "priyanshu23",
      database: "accredian",
    });

    pool.connect(function (err) {
      if (err) {
        console.error("Error connecting to the database: ", err);
        reject(err);
      } else {
        resolve(pool);
      }
    });
  });
};
