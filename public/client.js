const socket = io();
let playerName = "";
let roomCode = "";

// 1. Ekran - Oda seçimi
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const message = document.getElementById("message");

document.getElementById("createRoom").onclick = () => {
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
  step2.dataset.action = "create";
};

document.getElementById("joinRoom").onclick = () => {
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
  step2.dataset.action = "join";
};

document.getElementById("confirmName").onclick = () => {
  const name = document.getElementById("playerName").value.trim();
  if (!name) {
    message.textContent = "Lütfen bir isim gir.";
    return;
  }
  playerName = name;
  step2.classList.add("hidden");
  step3.classList.remove("hidden");

  if (step2.dataset.action === "create") {
    document.getElementById("roomCreate").classList.remove("hidden");
    socket.emit("createRoom", { playerName });
  } else {
    document.getElementById("roomJoin").classList.remove("hidden");
  }
};

document.getElementById("back1").onclick = () => {
  step2.classList.add("hidden");
  step1.classList.remove("hidden");
};

document.getElementById("back2").onclick = () => {
  step3.classList.add("hidden");
  step1.classList.remove("hidden");
};

// ODA OLUŞTURMA
document.getElementById("readyBtn").onclick = () => {
  document.getElementById("lobbyInfo").classList.remove("hidden");
  message.textContent = "Oda oluşturuldu, bekleniyor...";
};

document.getElementById("copyLink").onclick = () => {
  navigator.clipboard.writeText(window.location.href + "?room=" + roomCode);
  message.textContent = "Bağlantı kopyalandı!";
};

// ODAYA GİRİŞ
document.getElementById("joinBtn").onclick = () => {
  const code = document.getElementById("roomCodeInput").value.trim();
  if (!code) {
    message.textContent = "Oda kodunu gir.";
    return;
  }
  roomCode = code;
  socket.emit("joinRoom", { roomCode, playerName });
};

// SOCKET OLAYLARI
socket.on("roomCreated", (data) => {
  roomCode = data.roomCode;
  document.getElementById("roomCodeDisplay").textContent = roomCode;
});

socket.on("roomJoined", () => {
  message.textContent = "Odaya başarıyla katıldın!";
});

socket.on("errorMessage", (msg) => {
  message.textContent = msg;
});
