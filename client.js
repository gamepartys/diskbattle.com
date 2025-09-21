const socket = io();
const menu = document.getElementById("menu");
const lobby = document.getElementById("lobby");
const game = document.getElementById("game");

const roomInput = document.getElementById("roomInput");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const roomCodeSpan = document.getElementById("roomCode");
const teamInfo = document.getElementById("teamInfo");
const readyBtn = document.getElementById("readyBtn");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blueScoreEl = document.getElementById("blueScore");
const redScoreEl = document.getElementById("redScore");

let myTeam = null;
let roomCode = null;
let gameRunning = false;

menu.style.display = "flex";

// --- Menü Eventleri ---
createBtn.onclick = () => {
  const room = roomInput.value.trim();
  socket.emit("createRoom",{ room, team:"blue", target:5 });
};
joinBtn.onclick = () => {
  const room = roomInput.value.trim();
  socket.emit("joinRoom",{ room });
};

// --- Lobby ---
readyBtn.onclick = () => {
  socket.emit("ready");
};

// --- Socket Eventleri ---
socket.on("roomCreated",({room,team})=>{
  roomCode=room; myTeam=team;
  menu.style.display="none";
  lobby.style.display="flex";
  roomCodeSpan.textContent=room;
  teamInfo.textContent=`Takımınız: ${team}`;
});

socket.on("roomJoined",({room,team})=>{
  roomCode=room; myTeam=team;
  menu.style.display="none";
  lobby.style.display="flex";
  roomCodeSpan.textContent=room;
  teamInfo.textContent=`Takımınız: ${team}`;
});

socket.on("lobbyState",(state)=>{
  console.log("Lobby güncellendi", state);
});

socket.on("startRound",()=>{
  lobby.style.display="none";
  game.style.display="flex";
  startGame();
});

socket.on("scoreUpdate",(scores)=>{
  blueScoreEl.textContent=`Mavi: ${scores.blue}`;
  redScoreEl.textContent=`Kırmızı: ${scores.red}`;
});

socket.on("gameOver",(winner)=>{
  alert(`${winner} kazandı!`);
  gameRunning=false;
});

// --- Basit Oyun ---
let discs=[];

function startGame(){
  discs=[];
  for(let i=0;i<5;i++){
    discs.push({x:400,y:250,r:15,color:i%2?"red":"blue",vx:0,vy:0});
  }
  gameRunning=true;
  requestAnimationFrame(loop);
}

canvas.addEventListener("click",(e)=>{
  if(!gameRunning) return;
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  // Küçük test atışı
  if(myTeam==="blue"){
    discs.push({x, y, r:10, color:"blue", vx:2, vy:0});
  }else{
    discs.push({x, y, r:10, color:"red", vx:-2, vy:0});
  }
});

function loop(){
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  discs.forEach(d=>{
    d.x+=d.vx; d.y+=d.vy;
    ctx.beginPath();
    ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
    ctx.fillStyle=d.color;
    ctx.fill();
  });
  requestAnimationFrame(loop);
}
