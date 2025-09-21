const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

/** rooms[CODE] yapısı:
 *  {
 *    target: 5|10|20,
 *    hostId: socket.id,
 *    scores: { blue:0, red:0 },
 *    players: {
 *      blue: { id, nick, avatar, ready },
 *      red:  { id, nick, avatar, ready }
 *    },
 *    rematch: { blue:false, red:false }
 *  }
 */
const rooms = Object.create(null);

const cleanCode = s => String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
const cleanNick = s => String(s||"").trim().slice(0,12).replace(/[^\p{L}\p{N}\s_.-]/gu,"");

function sendLobby(code){
  const r = rooms[code]; if(!r) return;
  io.to(code).emit("lobbyState", {
    players: r.players,
    scores: r.scores,
    target: r.target
  });
}

io.on("connection",(sock)=>{
  let myRoom=null, myTeam=null;

  sock.on("createRoom",({room,team,target})=>{
    const code = cleanCode(room);
    const t = team==="red" ? "red" : "blue";
    const tgt = [5,10,20].includes(Number(target)) ? Number(target) : 5;

    rooms[code] = {
      target: tgt,
      hostId: sock.id,
      scores: { blue:0, red:0 },
      players: { blue:null, red:null },
      rematch: { blue:false, red:false }
    };
    rooms[code].players[t] = { id:sock.id, nick:"PLAYER1", avatar:0, ready:false };

    myRoom=code; myTeam=t;
    sock.join(code);
    sock.emit("roomCreated",{ room:code, team:t, target:tgt, isHost:true });
    sendLobby(code);
  });

  sock.on("joinRoom",({room})=>{
    const code = cleanCode(room);
    const r = rooms[code];
    if(!r){ sock.emit("errorMsg","Oda bulunamadı."); return; }

    const t = !r.players.blue ? "blue" : (!r.players.red ? "red" : null);
    if(!t){ sock.emit("errorMsg","Oda dolu."); return; }

    r.players[t] = { id:sock.id, nick:"PLAYER2", avatar:1, ready:false };

    myRoom=code; myTeam=t;
    sock.join(code);
    sock.emit("roomJoined",{ room:code, team:t, target:r.target, isHost:r.hostId===sock.id });
    sendLobby(code);
  });

  sock.on("setProfile",({nick,avatar})=>{
    if(!myRoom||!myTeam) return;
    const r=rooms[myRoom]; if(!r||!r.players[myTeam]) return;
    r.players[myTeam].nick = cleanNick(nick);
    r.players[myTeam].avatar = Number.isInteger(avatar) ? Math.max(0,Math.min(5,avatar)) : 0;
    sendLobby(myRoom);
  });

  // HAZIR → iki taraf hazırsa startRound yayınla
  sock.on("ready",()=>{
    if(!myRoom||!myTeam) return;
    const r=rooms[myRoom]; if(!r||!r.players[myTeam]) return;
    r.players[myTeam].ready = true;
    sendLobby(myRoom);

    const bothReady = r.players.blue?.ready && r.players.red?.ready;
    if(bothReady){
      io.to(myRoom).emit("startRound");   // overlay kapat, round başlat
      io.to(myRoom).emit("bothReady");    // bilgi amaçlı
      r.players.blue.ready=false;
      r.players.red.ready=false;
    }
  });

  // Fizik senkronu / atış
  sock.on("hostState",(payload)=>{ if(myRoom) sock.to(myRoom).emit("state",payload); });
  sock.on("game:launch",(e)=>{ if(myRoom) io.to(myRoom).emit("game:launch",e); });

  // Round kazanımı
  sock.on("roundWin",(winner)=>{
    if(!myRoom) return;
    const r=rooms[myRoom]; if(!r) return;
    if(winner==="blue"||winner==="red"){
      r.scores[winner] += 1;
      io.to(myRoom).emit("scoreUpdate", r.scores);
      if(r.scores[winner] >= r.target){
        io.to(myRoom).emit("gameOver", winner);
      }else{
        io.to(myRoom).emit("nextRound");
      }
    }
  });

  // Rematch
  sock.on("rematchReady",()=>{
    if(!myRoom||!myTeam) return;
    const r=rooms[myRoom]; if(!r) return;
    r.rematch[myTeam]=true;
    io.to(myRoom).emit("rematchState", r.rematch);
    if(r.rematch.blue && r.rematch.red){
      r.scores = {blue:0, red:0};
      r.rematch = {blue:false, red:false};
      io.to(myRoom).emit("resetMatch", {scores:r.scores});
      io.to(myRoom).emit("nextRound");
      sendLobby(myRoom);
    }
  });

  sock.on("disconnect",()=>{
    if(!myRoom||!myTeam) return;
    const r=rooms[myRoom];
    if(r){
      r.players[myTeam] = null;
      sendLobby(myRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Server http://localhost:${PORT}`));
