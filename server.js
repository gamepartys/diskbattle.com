const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı.");

  socket.on("createRoom", ({ playerName }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = { players: [{ id: socket.id, name: playerName }] };
    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode });
  });

  socket.on("joinRoom", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "Böyle bir oda yok.");
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("errorMessage", "Oda dolu.");
      return;
    }

    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    socket.emit("roomJoined");
    io.to(roomCode).emit("message", `${playerName} odaya katıldı!`);
  });

  socket.on("disconnect", () => {
    console.log("Bir kullanıcı ayrıldı.");
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Server çalışıyor: " + PORT));
