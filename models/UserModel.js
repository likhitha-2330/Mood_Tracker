const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema({
  mood: String,
  note: String,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  Username: String,
  Password: String,
  Age: Number,
  Email: String,
  entries: [entrySchema]
});

const User = mongoose.model("User", userSchema);

module.exports = { User };