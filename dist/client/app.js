const hostedWithoutRealtime = false;
const socketHandlers = {};
let playerToken = localStorage.getItem("xiangqi-player-token");
if (!playerToken) {
  playerToken = crypto.randomUUID();
  localStorage.setItem("xiangqi-player-token", playerToken);
}
let pollTimer = null, stateRevision = 0, lastPlayers = "";

async function roomRequest(method, payload) {
  const response = await fetch("/api/rooms", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "連線失敗");
  return data;
}

function applyRemote(data) {
  const playersKey = JSON.stringify(data.players || []);
  if (playersKey !== lastPlayers) {
    lastPlayers = playersKey;
    socketHandlers.players?.(data.players || []);
  }
  if (data.revision !== stateRevision) {
    stateRevision = data.revision;
    socketHandlers.moved?.({ state: data.state });
  }
}

async function pollRoom() {
  if (!roomId) return;
  try {
    const response = await fetch(`/api/rooms?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(playerToken)}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      $("#connection").classList.add("online");
      $("#connection").innerHTML = "<i></i> 已連線";
      applyRemote(data);
    }
  } catch {}
}

const socket = {
  on(event, callback) {
    socketHandlers[event] = callback;
    if (event === "connect") setTimeout(callback, 0);
  },
  async emit(event, payload, callback) {
    try {
      if (event === "join-room") {
        const data = await roomRequest("POST", {
          action: "join", roomId: payload.roomId, name: payload.name, token: playerToken
        });
        stateRevision = data.revision;
        lastPlayers = JSON.stringify(data.players || []);
        callback(data);
        clearInterval(pollTimer);
        pollTimer = setInterval(pollRoom, 1200);
      } else if (event === "move") {
        const data = await roomRequest("POST", {
          action: "move", roomId, token: playerToken, revision: stateRevision, state: payload.state
        });
        stateRevision = data.revision;
      } else if (event === "restart") {
        const data = await roomRequest("POST", {
          action: "restart", roomId, token: playerToken
        });
        stateRevision = data.revision;
        lastMove = null;
        state = data.state;
        selected = null;
        render();
      }
    } catch (error) {
      toast(error.message);
      if (event === "move") stateRevision = -1;
      await pollRoom();
      if (callback) callback({ error: error.message });
    }
  }
};
const $ = (s) => document.querySelector(s);
const boardEl = $("#board");
let myColor = "spectator", roomId = "", selected = null, players = [];
let state = initialState();
let lastMove = null;

const names = {
  red: { K:"帥", A:"仕", E:"相", H:"傌", R:"俥", C:"炮", P:"兵" },
  black:{ K:"將", A:"士", E:"象", H:"馬", R:"車", C:"砲", P:"卒" }
};

function initialState(){
  const b = Array.from({length:10},()=>Array(9).fill(null));
  const row = ["R","H","E","A","K","A","E","H","R"];
  row.forEach((t,x)=>{b[0][x]={t,c:"black"};b[9][x]={t,c:"red"}});
  [1,7].forEach(x=>b[2][x]={t:"C",c:"black"});[1,7].forEach(x=>b[7][x]={t:"C",c:"red"});
  [0,2,4,6,8].forEach(x=>{b[3][x]={t:"P",c:"black"};b[6][x]={t:"P",c:"red"}});
  return {board:b,turn:"red",winner:null};
}
function inside(y,x){return y>=0&&y<10&&x>=0&&x<9}
function pathCount(f,t,b){
  let n=0;
  if(f.y===t.y) {
    for(let x=Math.min(f.x,t.x)+1;x<Math.max(f.x,t.x);x++) if(b[f.y][x])n++;
  } else {
    for(let y=Math.min(f.y,t.y)+1;y<Math.max(f.y,t.y);y++) if(b[y][f.x])n++;
  }
  return n;
}
function pseudoLegal(f,t,b){
  const p=b[f.y][f.x], dest=b[t.y][t.x]; if(!p||!inside(t.y,t.x)||(dest&&dest.c===p.c))return false;
  const dx=t.x-f.x,dy=t.y-f.y,ax=Math.abs(dx),ay=Math.abs(dy), red=p.c==="red";
  if(p.t==="R") return (dx===0||dy===0)&&pathCount(f,t,b)===0;
  if(p.t==="C") return (dx===0||dy===0)&&pathCount(f,t,b)===(dest?1:0);
  if(p.t==="H") return ((ax===2&&ay===1&&!b[f.y][f.x+dx/2])||(ax===1&&ay===2&&!b[f.y+dy/2][f.x]));
  if(p.t==="E") return ax===2&&ay===2&&!b[f.y+dy/2][f.x+dx/2]&&(red?t.y>=5:t.y<=4);
  if(p.t==="A") return ax===1&&ay===1&&t.x>=3&&t.x<=5&&(red?t.y>=7:t.y<=2);
  if(p.t==="K"){
    if(dest?.t==="K"&&dx===0&&pathCount(f,t,b)===0)return true;
    return ax+ay===1&&t.x>=3&&t.x<=5&&(red?t.y>=7:t.y<=2);
  }
  if(p.t==="P"){
    const forward=red?-1:1;
    return (dy===forward&&dx===0)||((red?f.y<=4:f.y>=5)&&dy===0&&ax===1);
  }
  return false;
}
function cloneBoard(b){return b.map(r=>r.map(p=>p?{...p}:null))}
function inCheck(color,b){
  let king;
  for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(b[y][x]?.t==="K"&&b[y][x].c===color)king={y,x};
  if(!king)return true;
  for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(b[y][x]&&b[y][x].c!==color&&pseudoLegal({y,x},king,b))return true;
  return false;
}
function legal(f,t){
  if(!pseudoLegal(f,t,state.board))return false;
  const b=cloneBoard(state.board);b[t.y][t.x]=b[f.y][f.x];b[f.y][f.x]=null;
  return !inCheck(state.turn,b);
}
function movesFrom(f){
  const out=[];for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(legal(f,{y,x}))out.push({y,x});return out;
}
function detectMove(previous,next){
  if(!previous?.board||!next?.board)return null;
  const from=[],to=[];
  for(let y=0;y<10;y++)for(let x=0;x<9;x++){
    const before=previous.board[y][x],after=next.board[y][x];
    if(before&&!after)from.push({y,x,piece:before});
    if(after&&(!before||before.c!==after.c||before.t!==after.t))to.push({y,x,piece:after});
  }
  if(from.length!==1||to.length!==1)return null;
  if(from[0].piece.c!==to[0].piece.c||from[0].piece.t!==to[0].piece.t)return null;
  return {from:{y:from[0].y,x:from[0].x},to:{y:to[0].y,x:to[0].x}};
}
function render(){
  const animatedMove=lastMove;lastMove=null;
  boardEl.innerHTML="";
  const grid=document.createElement("div");grid.className="grid-lines";
  grid.innerHTML='<div class="river">楚 河　　　　漢 界</div><i class="palace top"></i><i class="palace bottom"></i>';
  boardEl.appendChild(grid);
  const targets=selected?movesFrom(selected):[];
  state.board.forEach((row,y)=>row.forEach((p,x)=>{
    const cell=document.createElement("div");cell.className="cell";cell.dataset.x=x;cell.dataset.y=y;
    cell.style.setProperty("--x",x);cell.style.setProperty("--y",y);
    const isTarget=targets.some(t=>t.x===x&&t.y===y);
    if(isTarget)cell.classList.add(p?"capture":"target");
    if(p){const el=document.createElement("button");el.className=`piece ${p.c}`+(selected?.x===x&&selected?.y===y?" selected":"");el.textContent=names[p.c][p.t];el.ariaLabel=`${p.c==="red"?"紅":"黑"}方${el.textContent}`;if(animatedMove?.to.x===x&&animatedMove?.to.y===y){el.classList.add("moving");el.style.setProperty("--move-x",`${(animatedMove.from.x-x)*125}%`);el.style.setProperty("--move-y",`${(animatedMove.from.y-y)*125}%`)}cell.appendChild(el)}
    cell.onclick=()=>clickCell(y,x,isTarget);boardEl.appendChild(cell);
  }));
  const colorName=state.turn==="red"?"紅方":"黑方";
  $("#status").textContent=state.winner?`${state.winner==="red"?"紅方":"黑方"}勝出`:(players.length<2?"等待棋友加入…":`${colorName}行棋`);
}
function clickCell(y,x,isTarget){
  const activeColor = myColor === "local" ? state.turn : myColor;
  if(state.winner||activeColor!==state.turn||players.filter(p=>p.color!=="spectator").length<2)return;
  const p=state.board[y][x];
  if(selected&&isTarget){
    const from={...selected}, captured=state.board[y][x];
    lastMove={from,to:{y,x}};
    state.board[y][x]=state.board[from.y][from.x];state.board[from.y][from.x]=null;
    if(captured?.t==="K")state.winner=activeColor;
    state.turn=activeColor==="red"?"black":"red";selected=null;render();
    socket.emit("move",{from,to:{y,x},state});return;
  }
  selected=p?.c===activeColor?{y,x}:null;render();
}
function showGame(result){
  myColor=result.color;roomId=result.roomId;players=result.players||[];lastMove=null;if(result.state)state=result.state;
  $("#lobby").classList.add("hidden");$("#game").classList.remove("hidden");
  $("#room-label").textContent=`房間代碼 · ${roomId}`;
  history.replaceState(null,"",`?room=${roomId}`);renderPlayers();render();
}
function renderPlayers(){
  $("#players").innerHTML=players.map(p=>`<div class="player"><span>${escapeHtml(p.name)}</span><b class="${p.color}">${p.color==="red"?"紅方":p.color==="black"?"黑方":"觀戰"}</b></div>`).join("");
  render();
}
function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}
function toast(msg){$("#toast").textContent=msg;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),1800)}

socket.on("connect",()=>{$("#connection").classList.add("online");$("#connection").innerHTML="<i></i> 已連線"});
socket.on("disconnect",()=>{$("#connection").classList.remove("online");$("#connection").innerHTML="<i></i> 重新連線中"});
socket.on("players",p=>{players=p;renderPlayers()});
socket.on("moved",data=>{lastMove=detectMove(state,data.state);state=data.state;selected=null;render()});
socket.on("restarted",()=>{lastMove=null;state=initialState();selected=null;render()});
$("#join-form").onsubmit=e=>{
  e.preventDefault();const id=$("#room").value.trim()||Math.random().toString(36).slice(2,8).toUpperCase();
  socket.emit("join-room",{roomId:id,name:$("#name").value},result=>result.error?toast(result.error):showGame(result));
};
$("#copy-link").onclick=async()=>{await navigator.clipboard.writeText(location.href);toast("邀請連結已複製")};
$("#restart").onclick=()=>socket.emit("restart");
const queryRoom=new URLSearchParams(location.search).get("room");if(queryRoom)$("#room").value=queryRoom;
render();
