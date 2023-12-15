// @ts-nocheck
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(process.env.DATABASE_URL);
    console.log(connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;
