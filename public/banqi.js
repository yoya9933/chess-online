const $ = (selector) => document.querySelector(selector);
const boardEl = $("#board");
const names = {
  red: { K: "帥", A: "仕", E: "相", R: "俥", H: "傌", C: "炮", P: "兵" },
  black: { K: "將", A: "士", E: "象", R: "車", H: "馬", C: "砲", P: "卒" },
};
const ranks = { K: 7, A: 6, E: 5, R: 4, H: 3, C: 2, P: 1 };
let playerToken = localStorage.getItem("banqi-player-token");
if (!playerToken) {
  playerToken = crypto.randomUUID();
  localStorage.setItem("banqi-player-token", playerToken);
}
let roomId = "", seat = "spectator", players = [], state = null, revision = 0;
let selected = null, pollTimer = null, undoRequestedBy = null, lastRenderedAction = "";
let soundEnabled = localStorage.getItem("banqi-sound") !== "off", audioContext = null;

function randomRoom() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}
function ensureAudio() {
  if (!soundEnabled) return null;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!audioContext) audioContext = new Audio();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}
function tone(frequency, duration = .1) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const oscillator = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.11, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}
function playSound(kind) {
  if (kind === "capture") { tone(190, .14); setTimeout(() => tone(125, .16), 55); }
  else if (kind === "flip") { tone(430, .09); setTimeout(() => tone(520, .08), 45); }
  else tone(320, .09);
}
async function request(method, payload) {
  const response = await fetch(method === "GET" ? payload : "/api/banqi", {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "連線失敗");
  return data;
}
function applyRemote(data, animate = false) {
  seat = data.seat;
  players = data.players || [];
  revision = Number(data.revision || 0);
  undoRequestedBy = data.undoRequestedBy || null;
  const incomingAction = JSON.stringify(data.state?.lastAction || null);
  if (animate && incomingAction !== lastRenderedAction && data.state?.lastAction) {
    playSound(data.state.lastAction.capture ? "capture" : data.state.lastAction.kind);
  }
  state = data.state;
  lastRenderedAction = incomingAction;
  render();
}
async function poll() {
  if (!roomId) return;
  try {
    const data = await request("GET", `/api/banqi?room=${encodeURIComponent(roomId)}&token=${encodeURIComponent(playerToken)}`);
    $("#connection").classList.add("online");
    $("#connection").innerHTML = "<i></i> 已連線";
    if (Number(data.revision) !== revision) applyRemote(data, true);
    else renderPlayers();
  } catch {}
}
async function send(action, extra = {}) {
  try {
    const data = await request("POST", { action, roomId, token: playerToken, revision, ...extra });
    applyRemote(data, false);
    return true;
  } catch (error) {
    toast(error.message);
    await poll();
    return false;
  }
}
function inside(point) {
  return point && point.x >= 0 && point.x < 8 && point.y >= 0 && point.y < 4;
}
function adjacent(from, to) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) === 1;
}
function betweenCount(from, to) {
  if (from.x !== to.x && from.y !== to.y) return -1;
  let count = 0;
  if (from.x === to.x) {
    for (let y = Math.min(from.y, to.y) + 1; y < Math.max(from.y, to.y); y++) if (state.board[y][from.x]) count++;
  } else {
    for (let x = Math.min(from.x, to.x) + 1; x < Math.max(from.x, to.x); x++) if (state.board[from.y][x]) count++;
  }
  return count;
}
function canCapture(attacker, target) {
  if (!attacker || !target || !attacker.faceUp || !target.faceUp || attacker.c === target.c) return false;
  if (attacker.t === "C") return true;
  if (attacker.t === "P" && target.t === "K") return true;
  if (attacker.t === "K" && target.t === "P") return false;
  return ranks[attacker.t] >= ranks[target.t];
}
function legalTarget(from, to) {
  if (!inside(to) || !state) return false;
  const moving = state.board[from.y][from.x], target = state.board[to.y][to.x];
  if (!moving || !moving.faceUp || moving.c !== state.assignments[seat]) return false;
  if (target?.c === moving.c) return false;
  if (moving.t === "C" && target) return target.faceUp && betweenCount(from, to) === 1;
  if (!adjacent(from, to)) return false;
  return !target || canCapture(moving, target);
}
function targetsFrom(from) {
  const targets = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) if (legalTarget(from, { x, y })) targets.push({ x, y });
  return targets;
}
function seatLabel(value) { return value === "a" ? "先手" : value === "b" ? "後手" : "觀戰"; }
function colorLabel(color) { return color === "red" ? "紅方" : color === "black" ? "黑方" : "尚未決定"; }
function playerName(value) { return players.find((player) => player.seat === value)?.name || (value === "a" ? "等待玩家" : "等待棋友加入"); }
function renderPlayers() {
  if (!state) return;
  $("#players").innerHTML = ["a", "b"].map((value) => {
    const assignment = state.assignments[value];
    return `<div class="player-card ${state.turnSeat === value && !state.winnerSeat ? "active" : ""}"><b>${playerName(value)}${seat === value ? "（你）" : ""}</b><small>${seatLabel(value)} · ${colorLabel(assignment)}</small></div>`;
  }).join("");
}
function renderCaptures() {
  const groups = ["a", "b"].map((value) => {
    const items = state.captures?.[value] || [];
    const chips = items.map((piece) => `<span class="capture-chip ${piece.c}" title="${colorLabel(piece.c)}${names[piece.c][piece.t]}">${names[piece.c][piece.t]}</span>`).join("");
    return `<div><small>${playerName(value)}</small><div class="capture-row">${chips || "<em>尚無吃子</em>"}</div></div>`;
  });
  $("#captures").innerHTML = groups.join("");
}
function renderUndo() {
  const panel = $("#undo-panel"), actions = $("#undo-actions");
  panel.classList.toggle("hidden", !undoRequestedBy);
  if (!undoRequestedBy) return;
  const mine = undoRequestedBy === seat;
  $("#undo-message").textContent = mine ? "已提出悔棋，等待對方回覆。" : `${playerName(undoRequestedBy)}請求悔棋。`;
  actions.classList.toggle("hidden", mine || seat === "spectator");
}
function renderStatus() {
  const assignment = state.assignments[seat];
  if (state.winnerSeat) {
    $("#status").textContent = `${playerName(state.winnerSeat)}勝出`;
  } else if (players.length < 2) {
    $("#status").textContent = "等待棋友加入…";
  } else if (seat === "spectator") {
    $("#status").textContent = `${playerName(state.turnSeat)}行棋`;
  } else {
    $("#status").textContent = state.turnSeat === seat ? "輪到你行棋" : "等待對方行棋";
  }
  $("#assignment").textContent = assignment ? `你的陣營：${colorLabel(assignment)}` : "翻開第一枚棋子後決定陣營";
}
function renderBoard() {
  boardEl.innerHTML = "";
  const targets = selected ? targetsFrom(selected) : [];
  state.board.forEach((row, y) => row.forEach((piece, x) => {
    const cell = document.createElement("div");
    const isTarget = targets.some((target) => target.x === x && target.y === y);
    cell.className = `cell${isTarget ? piece ? " capture" : " target" : ""}`;
    if (piece) {
      const button = document.createElement("button");
      const selectedHere = selected?.x === x && selected?.y === y;
      button.className = `piece ${piece.c}${piece.faceUp ? "" : " covered"}${selectedHere ? " selected" : ""}`;
      button.textContent = piece.faceUp ? names[piece.c][piece.t] : "";
      button.setAttribute("aria-label", piece.faceUp ? `${colorLabel(piece.c)}${names[piece.c][piece.t]}` : "覆蓋的暗棋");
      if (JSON.stringify(state.lastAction?.at) === JSON.stringify({ x, y })) button.classList.add("reveal");
      cell.appendChild(button);
    }
    cell.addEventListener("click", () => clickCell(x, y, isTarget));
    boardEl.appendChild(cell);
  }));
}
function render() {
  if (!state) return;
  renderStatus();
  renderPlayers();
  renderCaptures();
  renderUndo();
  renderBoard();
  $("#room-label").textContent = `房間 ${roomId}`;
}
async function clickCell(x, y, isTarget) {
  if (!state || seat === "spectator" || state.winnerSeat || state.turnSeat !== seat || players.length < 2) return;
  const piece = state.board[y][x];
  if (selected && isTarget) {
    const from = { ...selected };
    selected = null;
    renderBoard();
    await send("play", { play: { kind: "move", from, to: { x, y } } });
    return;
  }
  if (piece && !piece.faceUp) {
    selected = null;
    await send("play", { play: { kind: "flip", at: { x, y } } });
    return;
  }
  if (piece?.faceUp && piece.c === state.assignments[seat]) {
    selected = selected?.x === x && selected?.y === y ? null : { x, y };
    renderBoard();
    return;
  }
  selected = null;
  renderBoard();
}
function showGame(data) {
  applyRemote(data, false);
  $("#lobby").classList.add("hidden");
  $("#game").classList.remove("hidden");
  const url = new URL(location.href);
  url.searchParams.set("room", roomId);
  history.replaceState(null, "", url);
  clearInterval(pollTimer);
  pollTimer = setInterval(poll, 1200);
}

$("#join-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  roomId = $("#room").value.trim().toUpperCase() || randomRoom();
  try {
    const data = await request("POST", { action: "join", roomId, token: playerToken, name: $("#name").value.trim() });
    showGame(data);
  } catch (error) { toast(error.message); }
});
$("#copy-link").addEventListener("click", async () => {
  await navigator.clipboard.writeText(location.href);
  toast("邀請連結已複製");
});
$("#sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("banqi-sound", soundEnabled ? "on" : "off");
  $("#sound-toggle").textContent = `音效：${soundEnabled ? "開" : "關"}`;
  $("#sound-toggle").setAttribute("aria-pressed", String(soundEnabled));
});
$("#undo-request").addEventListener("click", () => send("request-undo"));
$("#undo-accept").addEventListener("click", () => send("respond-undo", { accept: true }));
$("#undo-reject").addEventListener("click", () => send("respond-undo", { accept: false }));
$("#restart").addEventListener("click", () => send("restart"));

const presetRoom = new URLSearchParams(location.search).get("room");
if (presetRoom) $("#room").value = presetRoom.toUpperCase().slice(0, 6);
$("#name").value = localStorage.getItem("banqi-player-name") || "";
$("#name").addEventListener("change", () => localStorage.setItem("banqi-player-name", $("#name").value.trim()));
$("#connection").classList.add("online");
$("#connection").innerHTML = "<i></i> 已連線";
