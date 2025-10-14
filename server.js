const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Room data
const rooms = {};

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("joinRoom", ({ roomCode, nick }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: {}, scores: { blue: 0, red: 0 } };
    }
    const room = rooms[roomCode];

    const team = Object.keys(room.players).length === 0 ? "blue" : "red";
    room.players[socket.id] = { nick, team };
    socket.join(roomCode);

    socket.emit("joined", { team, scores: room.scores });
    io.to(roomCode).emit("roomUpdate", room);
  });

  socket.on("scoreUpdate", ({ roomCode, team }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.scores[team]++;
    if (room.scores[team] >= 5) {
      io.to(roomCode).emit("gameOver", { winner: team });
      room.scores.blue = 0;
      room.scores.red = 0;
    }
    io.to(roomCode).emit("roomUpdate", room);
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      delete room.players[socket.id];
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
