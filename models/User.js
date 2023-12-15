// @ts-nocheck
const { sign } = require("jsonwebtoken");
const { Schema, model } = require("mongoose");
const { hash, compare } = require("bcryptjs");

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please Enter Your Password"],
      minLength: [6, "Password should have atleast 6 chars"],
      select: false,
    },
    avatar: {
      type: String,
      default: "",
      required: false,
    },
    provider: {
      type: String,
      default: "email",
      enum: ["email", "facebook", "google", "github"],
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (this.isModified()) {
    this.password = await hash(this.password, 16);
    next();
  }
  next();
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await compare(enteredPassword, this.password);
};

UserSchema.methods.getJwtToken = async function () {
  return await sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

module.exports = model("User", UserSchema);
