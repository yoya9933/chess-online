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
  if(data.color&&data.color!==myColor){myColor=data.color;selected=null}
  const playersKey = JSON.stringify(data.players || []);
  if (playersKey !== lastPlayers) {
    lastPlayers = playersKey;
    socketHandlers.players?.(data.players || []);
  }
  if (data.revision !== stateRevision) {
    stateRevision = data.revision;
    socketHandlers.moved?.(data);
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
          action: "join", roomId: payload.roomId, name: payload.name, preferredColor: payload.preferredColor, token: playerToken
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
        undoRequestedBy = null;
        renderUndo();
      } else if (event === "request-undo") {
        const data = await roomRequest("POST", { action: "request-undo", roomId, token: playerToken });
        stateRevision = data.revision;
        socketHandlers.moved?.(data);
      } else if (event === "respond-undo") {
        const data = await roomRequest("POST", { action: "respond-undo", roomId, token: playerToken, accept: payload.accept });
        stateRevision = data.revision;
        socketHandlers.moved?.(data);
      } else if (event === "change-color") {
        const data = await roomRequest("POST", { action: "change-color", roomId, token: playerToken, color: payload.color });
        applyRemote(data);renderPlayers();renderSideChoice();toast(`已切換為${data.color==="red"?"紅方":"黑方"}`);
      } else if (event === "restart") {
        const data = await roomRequest("POST", {
          action: "restart", roomId, token: playerToken
        });
        stateRevision = data.revision;
        lastMove = null;
        state = data.state;
        undoRequestedBy = null;
        selected = null;
        render();
        renderUndo();
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
let undoRequestedBy = null;
let sandboxActive = false, liveState = null, sandboxHistory = [], sandboxIndex = 0;
let replayActive = false, replayIndex = 0;
let localMode = false, aiThinking = false;
let soundEnabled = localStorage.getItem("xiangqi-sound") !== "off";
let audioContext = null;

function ensureAudio(){
  if(!soundEnabled)return null;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  if(!audioContext)audioContext=new AudioContextClass();
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  return audioContext;
}
function tone(ctx,frequency,start,duration,volume,type="triangle"){
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(gain).connect(ctx.destination);oscillator.start(start);oscillator.stop(start+duration);
}
function playMoveSound(capture=false){
  const ctx=ensureAudio();if(!ctx)return;const now=ctx.currentTime;
  if(capture){tone(ctx,210,now,.13,.13);tone(ctx,125,now+.065,.18,.11,"sine")}
  else{tone(ctx,360,now,.09,.1);tone(ctx,260,now+.025,.08,.055,"sine")}
}
function showMoveEffects(capture,winner,to,check=false){
  if(capture&&to){
    const effect=document.createElement("div"),blackView=myColor==="black";
    effect.className="capture-fx";effect.style.setProperty("--fx-x",blackView?8-to.x:to.x);effect.style.setProperty("--fx-y",blackView?9-to.y:to.y);
    boardEl.appendChild(effect);setTimeout(()=>effect.remove(),750);
  }
  if(winner){
    setTimeout(()=>{if(!state.winner)return;const effect=document.createElement("div");effect.className="mate-fx";effect.innerHTML="<span>將殺</span>";boardEl.appendChild(effect);setTimeout(()=>effect.remove(),1450)},capture?220:0);
  }else if(check){
    setTimeout(()=>{if(state.winner||!inCheck(state.turn,state.board))return;const effect=document.createElement("div");effect.className="check-fx";effect.innerHTML="<span>將軍</span>";boardEl.appendChild(effect);setTimeout(()=>effect.remove(),950)},capture?180:0);
  }
}
function updateSoundToggle(){
  const button=$("#sound-toggle");if(!button)return;
  button.textContent=`音效：${soundEnabled?"開":"關"}`;
  button.setAttribute("aria-pressed",String(soundEnabled));
}

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
  return {board:b,turn:"red",winner:null,history:[]};
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
function cloneState(value){return JSON.parse(JSON.stringify(value))}
function positionSnapshot(value){return {board:cloneBoard(value.board),turn:value.turn,winner:value.winner||null}}
function recordMove(from,to,moving,captured,beforePosition){
  if(!Array.isArray(state.history)||!state.history.length)state.history=[{label:"開局",position:beforePosition}];
  const side=moving.c==="red"?"紅":"黑",piece=names[moving.c][moving.t],verb=captured?"吃":"走至";
  state.history.push({label:`${side}${piece} ${from.x+1},${from.y+1} ${verb} ${to.x+1},${to.y+1}`,position:positionSnapshot(state)});
}
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
function hasAnyLegalMove(color){
  for(let y=0;y<10;y++)for(let x=0;x<9;x++){
    if(state.board[y][x]?.c!==color)continue;
    for(let ty=0;ty<10;ty++)for(let tx=0;tx<9;tx++)if(legal({y,x},{y:ty,x:tx}))return true;
  }
  return false;
}
function detectMove(previous,next){
  if(!previous?.board||!next?.board)return null;
  const from=[],to=[];
  for(let y=0;y<10;y++)for(let x=0;x<9;x++){
    const before=previous.board[y][x],after=next.board[y][x];
    if(before&&!after)from.push({y,x,piece:before});
    if(after&&(!before||before.c!==after.c||before.t!==after.t))to.push({y,x,piece:after,capture:Boolean(before)});
  }
  if(from.length!==1||to.length!==1)return null;
  if(from[0].piece.c!==to[0].piece.c||from[0].piece.t!==to[0].piece.t)return null;
  return {from:{y:from[0].y,x:from[0].x},to:{y:to[0].y,x:to[0].x},capture:to[0].capture};
}
function render(){
  const animatedMove=lastMove;lastMove=null;
  const blackView=myColor==="black",viewDirection=blackView?-1:1;
  boardEl.classList.toggle("black-view",blackView);
  boardEl.ariaLabel=`中國象棋棋盤，${blackView?"黑":"紅"}方視角`;
  boardEl.innerHTML="";
  const grid=document.createElement("div");grid.className="grid-lines";
  grid.innerHTML='<div class="river">楚 河　　　　漢 界</div><i class="palace top"></i><i class="palace bottom"></i>';
  boardEl.appendChild(grid);
  const targets=selected?movesFrom(selected):[];
  state.board.forEach((row,y)=>row.forEach((p,x)=>{
    const cell=document.createElement("div");cell.className="cell";cell.dataset.x=x;cell.dataset.y=y;
    cell.style.setProperty("--x",blackView?8-x:x);cell.style.setProperty("--y",blackView?9-y:y);
    const isTarget=targets.some(t=>t.x===x&&t.y===y);
    if(isTarget)cell.classList.add(p?"capture":"target");
    if(p){const el=document.createElement("button");el.className=`piece ${p.c}`+(selected?.x===x&&selected?.y===y?" selected":"");el.textContent=names[p.c][p.t];el.ariaLabel=`${p.c==="red"?"紅":"黑"}方${el.textContent}`;if(animatedMove?.to.x===x&&animatedMove?.to.y===y){el.classList.add("moving");el.style.setProperty("--move-x",`${(animatedMove.from.x-x)*125*viewDirection}%`);el.style.setProperty("--move-y",`${(animatedMove.from.y-y)*125*viewDirection}%`)}cell.appendChild(el)}
    cell.onclick=()=>clickCell(y,x,isTarget);boardEl.appendChild(cell);
  }));
  const colorName=state.turn==="red"?"紅方":"黑方";
  $("#status").textContent=replayActive?`棋譜回放 · 第 ${replayIndex}/${Math.max(0,(liveState?.history?.length||1)-1)} 手`:sandboxActive?`沙盤推演 · ${colorName}試走`:state.winner?`${state.winner==="red"?"紅方":"黑方"}勝出`:(aiThinking?"電腦思考中…":!localMode&&players.length<2?"等待棋友加入…":inCheck(state.turn,state.board)?`${colorName}被將軍`:`${colorName}行棋`);
  renderReplay();
}
function clickCell(y,x,isTarget){
  if(replayActive)return;
  const activeColor = sandboxActive ? state.turn : myColor === "local" ? state.turn : myColor;
  if(aiThinking||state.winner||activeColor!==state.turn||(!sandboxActive&&!localMode&&players.filter(p=>p.color!=="spectator").length<2))return;
  const p=state.board[y][x];
  if(selected&&isTarget){
    const from={...selected}, captured=state.board[y][x];
    const moving=state.board[from.y][from.x],beforePosition=positionSnapshot(state);
    lastMove={from,to:{y,x},capture:Boolean(captured)};
    state.board[y][x]=state.board[from.y][from.x];state.board[from.y][from.x]=null;
    if(captured?.t==="K")state.winner=activeColor;
    state.turn=activeColor==="red"?"black":"red";
    if(!state.winner&&!hasAnyLegalMove(state.turn))state.winner=activeColor;
    state.lastAction={from,to:{y,x},capture:Boolean(captured)};
    if(!sandboxActive)recordMove(from,{y,x},moving,captured,beforePosition);
    selected=null;playMoveSound(Boolean(captured));
    const givesCheck=!state.winner&&inCheck(state.turn,state.board);
    if(sandboxActive){sandboxHistory=sandboxHistory.slice(0,sandboxIndex+1);sandboxHistory.push(cloneState(state));sandboxIndex++;renderSandbox();render();showMoveEffects(Boolean(captured),state.winner,{y,x},givesCheck);return}
    render();showMoveEffects(Boolean(captured),state.winner,{y,x},givesCheck);
    if(localMode){scheduleAiMove();return}
    socket.emit("move",{from,to:{y,x},state});return;
  }
  selected=p?.c===activeColor?{y,x}:null;render();
}
function showGame(result){
  localMode=false;
  myColor=result.color;roomId=result.roomId;players=result.players||[];undoRequestedBy=result.undoRequestedBy||null;lastMove=null;if(result.state)state=result.state;
  $("#lobby").classList.add("hidden");$("#game").classList.remove("hidden");
  $("#room-label").textContent=`房間代碼 · ${roomId}`;
  history.replaceState(null,"",`?room=${roomId}`);renderPlayers();render();renderUndo();
}
function startLocal(color,name){
  localMode=true;myColor=color;roomId="單機";state=initialState();players=[{name,color},{name:"電腦棋手",color:color==="red"?"black":"red"}];undoRequestedBy=null;lastMove=null;
  $("#lobby").classList.add("hidden");$("#game").classList.remove("hidden");$("#room-label").textContent="單機人機對局";$("#copy-link").classList.add("hidden");$("#connection").classList.add("online");$("#connection").innerHTML="<i></i> 單機模式";history.replaceState(null,"",location.pathname);renderPlayers();renderUndo();renderSandbox();
  scheduleAiMove();
}
function scheduleAiMove(){
  if(!localMode||sandboxActive||replayActive||state.winner||state.turn===myColor)return;
  aiThinking=true;render();setTimeout(makeAiMove,500);
}
function makeAiMove(){
  if(!localMode||sandboxActive||replayActive||state.winner||state.turn===myColor){aiThinking=false;render();return}
  const values={K:10000,R:90,C:50,H:45,E:25,A:25,P:15},choices=[];
  for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(state.board[y][x]?.c===state.turn){
    for(let ty=0;ty<10;ty++)for(let tx=0;tx<9;tx++)if(legal({y,x},{y:ty,x:tx})){
      const target=state.board[ty][tx];choices.push({from:{y,x},to:{y:ty,x:tx},score:(target?values[target.t]:0)+Math.random()*8});
    }
  }
  choices.sort((a,b)=>b.score-a.score);const choice=choices[0];
  if(!choice){state.winner=myColor;aiThinking=false;render();return}
  const {from,to}=choice,moving=state.board[from.y][from.x],captured=state.board[to.y][to.x],beforePosition=positionSnapshot(state),aiColor=state.turn;
  state.board[to.y][to.x]=moving;state.board[from.y][from.x]=null;lastMove={from,to,capture:Boolean(captured)};
  if(captured?.t==="K")state.winner=aiColor;state.turn=aiColor==="red"?"black":"red";
  if(!state.winner&&!hasAnyLegalMove(state.turn))state.winner=aiColor;
  state.lastAction={from,to,capture:Boolean(captured)};recordMove(from,to,moving,captured,beforePosition);aiThinking=false;playMoveSound(Boolean(captured));const givesCheck=!state.winner&&inCheck(state.turn,state.board);render();showMoveEffects(Boolean(captured),state.winner,to,givesCheck);
}
function renderPlayers(){
  $("#players").innerHTML=players.map(p=>`<div class="player"><span>${escapeHtml(p.name)}</span><b class="${p.color}">${p.color==="red"?"紅方":p.color==="black"?"黑方":"觀戰"}</b></div>`).join("");
  render();renderSideChoice();
}
function renderSideChoice(){
  const red=$("#choose-red"),black=$("#choose-black");
  red.classList.toggle("active",myColor==="red");black.classList.toggle("active",myColor==="black");
  red.setAttribute("aria-pressed",String(myColor==="red"));black.setAttribute("aria-pressed",String(myColor==="black"));
  const redOccupied=players.some(p=>p.color==="red"),blackOccupied=players.some(p=>p.color==="black");
  red.disabled=myColor==="red"||(!localMode&&redOccupied);black.disabled=myColor==="black"||(!localMode&&blackOccupied);
}
function changeSide(color){
  if(color===myColor)return;
  if(!localMode){socket.emit("change-color",{color});return}
  const playerName=players.find(p=>p.color===myColor&&p.name!=="電腦棋手")?.name||"玩家";
  myColor=color;players=[{name:playerName,color},{name:"電腦棋手",color:color==="red"?"black":"red"}];selected=null;renderPlayers();renderSideChoice();scheduleAiMove();
}
function renderUndo(){
  const panel=$("#undo-panel"),response=$("#undo-response"),request=$("#undo-request");
  const isPlayer=!localMode&&(myColor==="red"||myColor==="black");
  request.classList.toggle("hidden",!isPlayer);
  request.disabled=sandboxActive||replayActive||!isPlayer||Boolean(undoRequestedBy)||state.turn===myColor||players.length<2;
  if(!undoRequestedBy){panel.classList.add("hidden");return}
  panel.classList.remove("hidden");
  const mine=undoRequestedBy===myColor;
  $("#undo-message").textContent=mine?"已送出悔棋請求，等待對方回覆…":"對方希望撤回剛才的棋步，是否同意？";
  response.classList.toggle("hidden",mine||!isPlayer);
}
function renderSandbox(){
  $("#sandbox-enter").classList.toggle("hidden",sandboxActive||replayActive);
  $("#sandbox-controls").classList.toggle("hidden",!sandboxActive);
  $("#sandbox-prev").disabled=!sandboxActive||sandboxIndex===0;
  $("#sandbox-next").disabled=!sandboxActive||sandboxIndex>=sandboxHistory.length-1;
  $("#restart").disabled=sandboxActive||replayActive;
}
function enterSandbox(){
  if(!replayActive)liveState=cloneState(state);
  replayActive=false;state=cloneState(state);sandboxHistory=[cloneState(state)];sandboxIndex=0;sandboxActive=true;selected=null;renderSandbox();render();renderUndo();
}
function stepSandbox(delta){
  const next=sandboxIndex+delta;if(next<0||next>=sandboxHistory.length)return;
  sandboxIndex=next;state=cloneState(sandboxHistory[sandboxIndex]);selected=null;lastMove=null;renderSandbox();render();
}
function exitSandbox(){
  sandboxActive=false;state=cloneState(liveState||state);liveState=null;sandboxHistory=[];sandboxIndex=0;selected=null;lastMove=null;renderSandbox();render();renderUndo();scheduleAiMove();
}
function officialState(){return (sandboxActive||replayActive)?liveState:state}
function renderReplay(){
  const official=officialState(),history=official?.history||[],available=Boolean(official?.winner&&history.length>1);
  $("#replay-panel").classList.toggle("hidden",!available);
  if(!available)return;
  $("#replay-label").textContent=replayActive?`${replayIndex===0?"開局":history[replayIndex].label}（${replayIndex}/${history.length-1}）`:`共 ${history.length-1} 手，對局已可回放`;
  $("#replay-start").classList.toggle("hidden",replayActive);
  ["#replay-prev","#replay-next","#replay-sandbox","#replay-exit"].forEach(id=>$(id).classList.toggle("hidden",!replayActive));
  $("#replay-prev").disabled=!replayActive||replayIndex===0;
  $("#replay-next").disabled=!replayActive||replayIndex>=history.length-1;
}
function startReplay(){
  liveState=cloneState(state);replayActive=true;replayIndex=0;selected=null;state={...cloneState(liveState.history[0].position),history:cloneState(liveState.history)};render();renderUndo();renderSandbox();
}
function stepReplay(delta){
  const history=liveState?.history||[],next=replayIndex+delta;if(next<0||next>=history.length)return;
  replayIndex=next;state={...cloneState(history[next].position),history:cloneState(history)};selected=null;lastMove=null;render();
}
function exitReplay(){replayActive=false;state=cloneState(liveState||state);liveState=null;replayIndex=0;selected=null;lastMove=null;render();renderUndo();renderSandbox();scheduleAiMove()}
function recordText(){
  const official=officialState(),moves=(official?.history||[]).slice(1).map((item,index)=>`${index+1}. ${item.label}`).join("\n");
  return `楚河棋局｜房間 ${roomId}\n${moves}\n結果：${official?.winner==="red"?"紅方勝":official?.winner==="black"?"黑方勝":"未完局"}`;
}
function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}
function toast(msg){$("#toast").textContent=msg;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),1800)}

socket.on("connect",()=>{$("#connection").classList.add("online");$("#connection").innerHTML="<i></i> 已連線"});
socket.on("disconnect",()=>{$("#connection").classList.remove("online");$("#connection").innerHTML="<i></i> 重新連線中"});
socket.on("players",p=>{players=p;renderPlayers()});
socket.on("moved",data=>{const priorRequest=undoRequestedBy,base=(sandboxActive||replayActive)?(liveState||state):state,changed=JSON.stringify(base)!==JSON.stringify(data.state);undoRequestedBy=data.undoRequestedBy||null;if(sandboxActive||replayActive){liveState=cloneState(data.state);renderUndo();renderReplay();return}const forward=(data.state.history?.length||0)>(state.history?.length||0),remoteMove=detectMove(state,data.state)||(forward?data.state.lastAction:null);lastMove=remoteMove;state=data.state;selected=null;if(remoteMove)playMoveSound(remoteMove.capture);if(priorRequest===myColor&&!undoRequestedBy)toast(changed?"對方同意悔棋":"對方拒絕悔棋");const givesCheck=Boolean(remoteMove&&!state.winner&&inCheck(state.turn,state.board));render();if(remoteMove)showMoveEffects(remoteMove.capture,state.winner,remoteMove.to,givesCheck);renderUndo()});
socket.on("restarted",()=>{sandboxActive=false;replayActive=false;liveState=null;lastMove=null;state=initialState();selected=null;render();renderSandbox()});
$("#join-form").onsubmit=e=>{
  e.preventDefault();ensureAudio();const id=$("#room").value.trim()||Math.random().toString(36).slice(2,8).toUpperCase();
  const preferredColor=document.querySelector('input[name="preferred-color"]:checked')?.value||"red";
  const mode=document.querySelector('input[name="game-mode"]:checked')?.value||"online";
  if(mode==="solo"){startLocal(preferredColor,$("#name").value);return}
  socket.emit("join-room",{roomId:id,name:$("#name").value,preferredColor},result=>result.error?toast(result.error):showGame(result));
};
$("#copy-link").onclick=async()=>{await navigator.clipboard.writeText(location.href);toast("邀請連結已複製")};
$("#restart").onclick=()=>{if(localMode){state=initialState();selected=null;lastMove=null;aiThinking=false;render();scheduleAiMove()}else socket.emit("restart")};
$("#undo-request").onclick=()=>socket.emit("request-undo",{});
$("#undo-accept").onclick=()=>socket.emit("respond-undo",{accept:true});
$("#undo-reject").onclick=()=>socket.emit("respond-undo",{accept:false});
$("#choose-red").onclick=()=>changeSide("red");
$("#choose-black").onclick=()=>changeSide("black");
$("#sandbox-enter").onclick=enterSandbox;
$("#sandbox-prev").onclick=()=>stepSandbox(-1);
$("#sandbox-next").onclick=()=>stepSandbox(1);
$("#sandbox-exit").onclick=exitSandbox;
$("#replay-start").onclick=startReplay;
$("#replay-prev").onclick=()=>stepReplay(-1);
$("#replay-next").onclick=()=>stepReplay(1);
$("#replay-exit").onclick=exitReplay;
$("#replay-sandbox").onclick=enterSandbox;
$("#record-copy").onclick=async()=>{await navigator.clipboard.writeText(recordText());toast("棋譜已複製")};
$("#record-share").onclick=async()=>{const text=recordText();if(navigator.share)await navigator.share({title:"楚河棋局棋譜",text,url:location.href});else{await navigator.clipboard.writeText(`${text}\n${location.href}`);toast("棋譜與連結已複製")}};
$("#sound-toggle").onclick=()=>{soundEnabled=!soundEnabled;localStorage.setItem("xiangqi-sound",soundEnabled?"on":"off");updateSoundToggle();if(soundEnabled)playMoveSound(false)};
updateSoundToggle();
renderSandbox();
document.querySelectorAll('input[name="game-mode"]').forEach(input=>input.onchange=()=>$("#room-field").classList.toggle("hidden",input.value==="solo"&&input.checked));
const queryRoom=new URLSearchParams(location.search).get("room");if(queryRoom)$("#room").value=queryRoom;
render();
