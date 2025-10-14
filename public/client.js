const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

let roomCode = "";
let team = "";
let discs = [];
let dragDisc = null;
let mousePos = { x: 0, y: 0 };

// Odaya katıl
document.getElementById("joinBtn").onclick = () => {
  const nick = document.getElementById("nick").value.trim();
  roomCode = document.getElementById("room").value.trim().toUpperCase();
  if (!nick || !roomCode) return alert("Nick ve oda kodu girin!");
  socket.emit("joinRoom", { roomCode, nick });
};

socket.on("joined", (data) => {
  team = data.team;
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  setupDiscs();
});

socket.on("roomUpdate", (room) => {
  document.getElementById("blueScore").textContent = room.scores.blue;
  document.getElementById("redScore").textContent = room.scores.red;
});

socket.on("gameOver", ({ winner }) => {
  document.getElementById("msg").textContent = 
    winner === "blue" ? "💙 Mavi kazandı!" : "❤️ Kırmızı kazandı!";
  setTimeout(() => {
    document.getElementById("msg").textContent = "";
    setupDiscs();
  }, 3000);
});

// Diskleri oluştur
function setupDiscs() {
  discs = [];
  const baseX = team === "blue" ? 150 : 650;
  const color = team === "blue" ? "#33aaff" : "#ff5555";
  for (let i = 0; i < 5; i++) {
    discs.push({
      x: baseX + (i % 3) * 30,
      y: 150 + Math.floor(i / 3) * 30,
      vx: 0,
      vy: 0,
      color,
    });
  }
}

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  dragDisc = discs.find((d) => Math.hypot(d.x - x, d.y - y) < 20);
  mousePos = { x, y };
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

canvas.addEventListener("mouseup", () => {
  if (dragDisc) {
    dragDisc.vx = (dragDisc.x - mousePos.x) * 0.25;
    dragDisc.vy = (dragDisc.y - mousePos.y) * 0.25;
    dragDisc = null;
  }
});

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Orta çizgi (görsel, geçilebilir)
  ctx.strokeStyle = "#444";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  // Disk fiziği
  for (let d of discs) {
    if (dragDisc === d) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = "#aaa";
      ctx.stroke();
    }

    d.x += d.vx;
    d.y += d.vy;
    d.vx *= 0.98;
    d.vy *= 0.98;

    if (d.y < 20 || d.y > canvas.height - 20) d.vy *= -1;
    if (d.x < 20) d.vx *= -1;
    if (d.x > canvas.width - 20) d.vx *= -1;

    // Skor kontrolü
    if (team === "blue" && d.x > canvas.width / 2 + 30) {
      socket.emit("scoreUpdate", { roomCode, team: "blue" });
      setupDiscs();
      break;
    } else if (team === "red" && d.x < canvas.width / 2 - 30) {
      socket.emit("scoreUpdate", { roomCode, team: "red" });
      setupDiscs();
      break;
    }

    // Disk çiz
    ctx.beginPath();
    ctx.arc(d.x, d.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
  }

  requestAnimationFrame(update);
}
update();
