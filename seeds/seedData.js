const mongoose = require("mongoose");
const { User } = require("../models/UserModel");
const bcrypt = require("bcrypt");

async function seed() {
  await mongoose.connect("mongodb://127.0.0.1:27017/MoodDB");
  await User.deleteMany({});
  const pass="123"
  const passwordHash = await bcrypt.hash(pass, 10);

  const today = new Date();
  function daysAgo(n) {
    const d = new Date(today);
    d.setDate(today.getDate() - n);
    return d;
  }

  const moods = [
    { mood: "Happy", note: "Had a great day with friends!", createdAt: daysAgo(0) },
    { mood: "Sad", note: "Missed my family today.", createdAt: daysAgo(1) },
    { mood: "Angry", note: "Got stuck in traffic.", createdAt: daysAgo(2) },
    { mood: "Loved", note: "Received a surprise gift!", createdAt: daysAgo(3) },
    { mood: "Played", note: "Played football in the park.", createdAt: daysAgo(4) },
    { mood: "Playful", note: "Had fun playing games online.", createdAt: daysAgo(5) },
    { mood: "Happy", note: "Watched a funny movie.", createdAt: daysAgo(6) },
    { mood: "Loved", note: "Talked to my best friend.", createdAt: daysAgo(0) },
    { mood: "Sad", note: "Lost my keys.", createdAt: daysAgo(2) },
  ];

  await User.create({
    Username: "isha",
    Password: passwordHash,
    Age: 25,
    Email: "testuser@example.com",
    entries: moods
  });

  console.log("Seed data inserted!");
  mongoose.disconnect();
}

seed();