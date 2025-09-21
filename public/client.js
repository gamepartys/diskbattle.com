const $ = s => document.querySelector(s);
const ioClient = io();

const el = {
  lobby: $('#lobby'),
  avatarPick: $('#avatarPick'),
  nick: $('#nick'),
  team: $('#team'),
  target: $('#target'),
  code: $('#code'),
  createBtn: $('#createBtn'),
  joinBtn: $('#joinBtn'),
  copyLinkBtn: $('#copyLinkBtn'),
  readyBtn: $('#readyBtn'),
  who: $('#who'),
  lobbyState: $('#lobbyState'),
  stage: $('#stage'),
  cv: $('#cv'),
  hudTop: $('#hudTop'),
  blueScore: $('#blueScore'),
  redScore: $('#redScore'),
  leftRound: $('#leftRound'),
  rightRound: $('#rightRound'),
  leftAvatar: $('#leftAvatar'),
  rightAvatar: $('#rightAvatar'),
  leftNick: $('#leftNick'),
  rightNick: $('#rightNick'),
  post: $('#postGame'),
  postText: $('#postText'),
  rematchBtn: $('#rematchBtn'),
  hint: $('#hint'),
};

let my = { code:"", team:"blue", target:5, avatar:"😀", ready:false, joined:false };
let state = null;
let discsLocal = [];
const canvas = el.cv, ctx = canvas.getContext('2d');
let dragging=false, dragStart=null, dragDiscIndex=-1;

// ---- Avatar seçimi
el.avatarPick.addEventListener('click',(e)=>{
  const t = e.target.closest('.pick');
  if(!t) return;
  [...el.avatarPick.children].forEach(x=>x.classList.remove('sel'));
  t.classList.add('sel');
  my.avatar = t.dataset.a;
});

// ---- UI helpers
function updateWho(){
  if(!my.code) el.who.textContent = '';
  else el.who.textContent = `Oda: ${my.code} • Takımın: ${my.team.toUpperCase()}`;
}
function setLobbyInfo(t){
  el.lobbyState.innerHTML =
    `Oda: <b>${t.code}</b> • Hedef: <b>${t.target}</b> • `+
    `Mavi: ${(t.players.blue?t.players.blue.nick:'-')} ${t.ready.blue?'✅':'⏳'} | `+
    `Kırmızı: ${(t.players.red?t.players.red.nick:'-')} ${t.ready.red?'✅':'⏳'}`;
  el.blueScore.textContent = `Mavi: ${t.scores.blue}`;
  el.redScore.textContent  = `Kırmızı: ${t.scores.red}`;

  // panellerde nick & avatar
  el.leftNick.textContent  = t.players.red ? t.players.red.nick : '-';
  el.rightNick.textContent = t.players.blue? t.players.blue.nick: '-';
  el.leftAvatar.textContent  = t.players.red ? (t.players.red.avatar||'😶')  : '😶';
  el.rightAvatar.textContent = t.players.blue? (t.players.blue.avatar||'😶') : '😶';
}
function showGame(yes){
  el.lobby.style.display = yes ? "none" : "";
  el.hudTop.style.display = yes ? "flex" : "none";
  el.stage.style.display  = yes ? "grid" : "none";
  el.post.style.display   = "none";
}

// ---- Buttons
el.createBtn.onclick = ()=>{
  ioClient.emit("create", {
    nick: el.nick.value || "Player",
    team: el.team.value,
    target: +el.target.value,
    avatar: my.avatar
  });
};
el.joinBtn.onclick = ()=>{
  ioClient.emit("join", {
    code: el.code.value,
    nick: el.nick.value || "Player",
    team: el.team.value,
    avatar: my.avatar
  });
};
el.copyLinkBtn.onclick = ()=>{
  if(!my.code){ alert("Önce odaya gir/kuralım."); return; }
  const link = location.origin + "/?room=" + my.code;
  navigator.clipboard.writeText(link);
  el.copyLinkBtn.textContent = "Kopyalandı!";
  setTimeout(()=> el.copyLinkBtn.textContent="Linki Kopyala", 1300);
};
el.readyBtn.onclick = ()=>{
  my.ready=!my.ready;
  ioClient.emit("ready", my.ready);
  el.readyBtn.textContent = my.ready ? "Hazır (iptal)" : "Hazırım";
};
el.rematchBtn.onclick = ()=>{ my.ready=false; ioClient.emit("ready", false); el.post.style.display="none"; };

// ---- Sockets
ioClient.on("joined", ({code,team,target})=>{
  my.code=code; my.team=team; my.target=target; my.joined=true;
  updateWho(); el.readyBtn.disabled=false; el.code.value=code;
});
ioClient.on("lobby", t=>{
  setLobbyInfo(t);
  el.target.value = t.target;
});
ioClient.on("roundReset", ({scores})=>{
  el.post.style.display="none";
  el.blueScore.textContent = `Mavi: ${scores.blue}`;
  el.redScore.textContent  = `Kırmızı: ${scores.red}`;
  showGame(true);
});
ioClient.on("state", s=>{
  state=s; discsLocal=s.discs; drawAndUpdateRoundBars();
});
ioClient.on("score", sc=>{
  el.blueScore.textContent=`Mavi: ${sc.blue}`;
  el.redScore.textContent =`Kırmızı: ${sc.red}`;
});
ioClient.on("matchEnd", ({winner,scores})=>{
  el.postText.innerHTML = `${winner.toUpperCase()} kazandı!<br>Skor: Mavi ${scores.blue} – Kırmızı ${scores.red}`;
  el.post.style.display="block";
});

// ---- Canvas input
function getMouse(e){
  const r=canvas.getBoundingClientRect();
  const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
  const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
  return {x:x*(canvas.width/r.width), y:y*(canvas.height/r.height)};
}
canvas.addEventListener('mousedown',(e)=>{
  if(!state) return;
  const p=getMouse(e);
  const myDiscs=discsLocal.filter(d=>d.color===my.team);
  let best=-1,bestDist=999;
  myDiscs.forEach((d,i)=>{
    const dist=Math.hypot(p.x-d.x,p.y-d.y);
    const sp=Math.hypot(d.vx,d.vy);
    if(dist<20 && sp<0.3 && dist<bestDist){ best=i; bestDist=dist; }
  });
  if(best>=0){ dragging=true; dragDiscIndex=best; dragStart=p; }
});
canvas.addEventListener('mousemove',(e)=>{ if(dragging){ drawGhost(getMouse(e)); }});
canvas.addEventListener('mouseup',(e)=>{
  if(!dragging) return;
  const p=getMouse(e);
  const vx=(dragStart.x-p.x)*0.12, vy=(dragStart.y-p.y)*0.12;
  ioClient.emit("shoot",{idx:dragDiscIndex,vx,vy});
  dragging=false; dragDiscIndex=-1; dragStart=null;
});
canvas.addEventListener('mouseleave',()=>{ dragging=false; dragDiscIndex=-1; dragStart=null; });

canvas.addEventListener('touchstart', (e)=>{ e.preventDefault();
  const m=new MouseEvent('mousedown',{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY}); canvas.dispatchEvent(m);
},{passive:false});
canvas.addEventListener('touchmove', (e)=>{ e.preventDefault();
  const m=new MouseEvent('mousemove',{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY}); canvas.dispatchEvent(m);
},{passive:false});
canvas.addEventListener('touchend', (e)=>{ e.preventDefault();
  const t=e.changedTouches[0]; const m=new MouseEvent('mouseup',{clientX:t.clientX,clientY:t.clientY}); canvas.dispatchEvent(m);
},{passive:false});

// ---- Draw
function clear(){ ctx.fillStyle="#0b1220"; ctx.fillRect(0,0,canvas.width,canvas.height); }
function drawField(){
  const pad=24;
  ctx.fillStyle="#0f172a"; ctx.strokeStyle="#1e293b"; ctx.lineWidth=2;
  ctx.fillRect(pad,pad, state.width-2*pad, state.height-2*pad);
  ctx.strokeRect(pad,pad, state.width-2*pad, state.height-2*pad);
  ctx.strokeStyle="#334155"; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(state.width/2,pad); ctx.lineTo(state.width/2,state.height-pad); ctx.stroke();
}
function drawDiscs(){
  for(const d of discsLocal){
    ctx.beginPath();
    ctx.fillStyle = d.color==="blue"?"#3b82f6":"#ef4444";
    ctx.arc(d.x,d.y,14,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.15)"; ctx.lineWidth=1.5; ctx.stroke();
  }
}
function draw(){
  if(!state){ clear(); return; }
  clear(); drawField(); drawDiscs();
}
function drawGhost(p){
  draw();
  if(!dragStart) return;
  ctx.strokeStyle="#eab308"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(dragStart.x,dragStart.y); ctx.lineTo(p.x,p.y); ctx.stroke();
}

// anlık round göstergeleri (X/5)
function updateRoundBars(){
  if(!state){ el.leftRound.textContent="Kırmızı anlık: 0 / 5"; el.rightRound.textContent="Mavi anlık: 0 / 5"; return; }
  const W=state.width;
  const blueRight = discsLocal.filter(d=>d.color==="blue" && d.x>W/2).length;
  const redLeft   = discsLocal.filter(d=>d.color==="red"  && d.x<W/2).length;
  el.rightRound.textContent = `Mavi anlık: ${blueRight} / 5`;
  el.leftRound .textContent = `Kırmızı anlık: ${redLeft} / 5`;
}
function drawAndUpdateRoundBars(){ draw(); updateRoundBars(); }

// odalı direkt link
(function qJoin(){
  const u=new URL(location.href);
  const room=u.searchParams.get("room");
  if(room){
    el.code.value=room;
    ioClient.emit("join",{code:room,nick:el.nick.value||"Player",team:el.team.value,avatar:my.avatar});
  }
})();

// başlangıç
(function init(){
  // default avatar “😀” işaretli
})();
showGame(false);
updateWho();
