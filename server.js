const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Oda yapısı:
 * {
 *   code,
 *   target: 5|10|20,
 *   scores: { blue, red },              // GENEL SKOR (set boyunca)
 *   players: { blue:{id,nick,avatar}|null, red:{...}|null },
 *   ready: { blue, red },
 *   state: { width,height, discs:[{x,y,vx,vy,color}], running }
 * }
 */
const rooms = Object.create(null);
const cleanCode = s => String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6) || makeCode();
const cleanNick = s => String(s||"").trim().slice(0,16) || "Player";
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const rnd   = (a,b)=>a+Math.random()*(b-a);

function makeCode(){
  const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s=""; for(let i=0;i<5;i++) s+=abc[Math.floor(Math.random()*abc.length)];
  return s;
}
function defaultState(){
  const width = 900, height = 540;
  const discs = [];
  for(let i=0;i<5;i++){
    discs.push({x:120+(i%3)*35, y:140+Math.floor(i/3)*35, vx:0,vy:0, color:"blue"});
  }
  for(let i=0;i<5;i++){
    discs.push({x: width-120-(i%3)*35, y: height-140-Math.floor(i/3)*35, vx:0,vy:0, color:"red"});
  }
  return {width,height,discs,running:false};
}
function makeRoom(code, target=5){
  const c = cleanCode(code);
  rooms[c] = {
    code:c,
    target:[5,10,20].includes(+target)?+target:5,
    scores:{blue:0,red:0},
    players:{blue:null, red:null},
    ready:{blue:false, red:false},
    state: defaultState(),
    loop:null
  };
  return rooms[c];
}
function resetRound(r){
  r.state = defaultState();
  r.state.running = false;
  r.ready.blue = r.ready.red = false;
  io.to(r.code).emit("roundReset", {scores:r.scores, target:r.target});
}
function startLoop(r){
  if(r.loop) return;
  r.state.running = true;
  const dt = 1/60, FRICTION=0.992, R=14, W=r.state.width, H=r.state.height;

  r.loop = setInterval(()=>{
    const d=r.state.discs;

    // hareket + duvar
    for(const a of d){
      a.x+=a.vx; a.y+=a.vy;
      a.vx*=FRICTION; a.vy*=FRICTION;
      if(Math.hypot(a.vx,a.vy)<0.02){ a.vx=a.vy=0; }
      if(a.x<R){a.x=R;a.vx=-a.vx*0.9;}
      if(a.x>W-R){a.x=W-R;a.vx=-a.vx*0.9;}
      if(a.y<R){a.y=R;a.vy=-a.vy*0.9;}
      if(a.y>H-R){a.y=H-R;a.vy=-a.vy*0.9;}
    }
    // çarpışma
    for(let i=0;i<d.length;i++){
      for(let j=i+1;j<d.length;j++){
        const a=d[i], b=d[j], dx=b.x-a.x, dy=b.y-a.y;
        const dist=Math.hypot(dx,dy);
        if(dist>0 && dist<R*2){
          const nx=dx/dist, ny=dy/dist;
          const p=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
          if(p>0){
            const imp=p*0.9; a.vx-=imp*nx; a.vy-=imp*ny; b.vx+=imp*nx; b.vy+=imp*ny;
          }
          const push=(R*2-dist)/2; a.x-=nx*push; a.y-=ny*push; b.x+=nx*push; b.y+=ny*push;
        }
      }
    }

    // skor kuralı
    const allBlueRight = d.filter(x=>x.color==="blue").every(x=>x.x>W/2);
    const allRedLeft  = d.filter(x=>x.color==="red").every(x=>x.x<W/2);

    if(allBlueRight || allRedLeft){
      if(allBlueRight) r.scores.red++;
      if(allRedLeft)  r.scores.blue++;
      io.to(r.code).emit("score", r.scores);

      if(r.scores.blue>=r.target || r.scores.red>=r.target){
        io.to(r.code).emit("matchEnd", {
          winner: r.scores.blue>r.scores.red ? "blue" : "red",
          scores: r.scores
        });
        r.scores.blue=0; r.scores.red=0;
      }
      resetRound(r);
    }

    io.to(r.code).emit("state", r.state); // anlık durum
  }, dt*1000);
}
function stopLoop(r){ if(r.loop){clearInterval(r.loop); r.loop=null;} r.state.running=false; }
function sendLobby(r){
  io.to(r.code).emit("lobby", {
    code:r.code, target:r.target, scores:r.scores, players:r.players, ready:r.ready
  });
}

io.on("connection",(sock)=>{
  let myRoom=null, myTeam=null;
  function leaveRoom(){
    if(!myRoom || !rooms[myRoom]) return;
    const r=rooms[myRoom];
    if(myTeam) r.players[myTeam]=null;
    r.ready.blue=r.ready.red=false;
    sendLobby(r);
    if(!r.players.blue && !r.players.red){ stopLoop(r); delete rooms[myRoom]; }
    myRoom=null; myTeam=null;
  }

  sock.on("create", ({nick,team,target,avatar})=>{
    leaveRoom();
    const r=makeRoom();
    myRoom=r.code;
    myTeam=team==="red"?"red":"blue";
    r.players[myTeam]={id:sock.id,nick:cleanNick(nick),avatar:avatar||""};
    sock.join(r.code); sendLobby(r);
    sock.emit("joined",{code:r.code,team:myTeam,target:r.target});
  });

  sock.on("join", ({code,nick,team,avatar})=>{
    leaveRoom();
    const c=cleanCode(code); let r=rooms[c]||makeRoom(c);
    const want=team==="red"?"red":"blue";
    myTeam = r.players[want]? (want==="red"?"blue":"red") : want;
    myRoom=r.code;
    r.players[myTeam]={id:sock.id,nick:cleanNick(nick),avatar:avatar||""};
    sock.join(r.code); sendLobby(r);
    sock.emit("joined",{code:r.code,team:myTeam,target:r.target});
  });

  sock.on("setTarget",(t)=>{ if(!myRoom) return; const r=rooms[myRoom]; r.target=[5,10,20].includes(+t)?+t:5; sendLobby(r); });

  sock.on("ready",(v)=>{
    if(!myRoom||!myTeam) return; const r=rooms[myRoom];
    r.ready[myTeam]=!!v; sendLobby(r);
    if(r.players.blue&&r.players.red&&r.ready.blue&&r.ready.red){ resetRound(r); r.ready.blue=r.ready.red=true; startLoop(r); sendLobby(r); }
  });

  sock.on("shoot",({idx,vx,vy})=>{
    if(!myRoom||!myTeam) return; const r=rooms[myRoom]; if(!r||!r.state.running) return;
    const d=r.state.discs; const group = myTeam==="blue" ? d.filter(x=>x.color==="blue") : d.filter(x=>x.color==="red");
    const disc=group[idx|0]; if(!disc) return;
    if(Math.hypot(disc.vx,disc.vy)<0.2){ const maxV=8; disc.vx=clamp(vx,-maxV,maxV); disc.vy=clamp(vy,-maxV,maxV); }
  });

  sock.on("leave", leaveRoom);
  sock.on("disconnect", leaveRoom);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Server http://localhost:${PORT}`));
