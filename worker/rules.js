export function inside(point) {
  return Number.isInteger(point?.x) && Number.isInteger(point?.y) && point.x >= 0 && point.x < 9 && point.y >= 0 && point.y < 10;
}

function pathCount(from, to, board) {
  let count = 0;
  if (from.y === to.y) {
    for (let x = Math.min(from.x, to.x) + 1; x < Math.max(from.x, to.x); x++) if (board[from.y][x]) count++;
  } else {
    for (let y = Math.min(from.y, to.y) + 1; y < Math.max(from.y, to.y); y++) if (board[y][from.x]) count++;
  }
  return count;
}

export function pseudoLegal(from, to, board, variant = "standard") {
  if (!inside(from) || !inside(to)) return false;
  const piece = board[from.y]?.[from.x], destination = board[to.y]?.[to.x];
  if (!piece || (destination && destination.c === piece.c)) return false;
  const dx = to.x - from.x, dy = to.y - from.y, ax = Math.abs(dx), ay = Math.abs(dy);
  const red = piece.c === "red", type = piece.h ? piece.o : piece.t;
  const unrestricted = variant === "jieqi" && !piece.h;
  if (type === "R") return (dx === 0 || dy === 0) && pathCount(from, to, board) === 0;
  if (type === "C") return (dx === 0 || dy === 0) && pathCount(from, to, board) === (destination ? 1 : 0);
  if (type === "H") return (ax === 2 && ay === 1 && !board[from.y][from.x + dx / 2]) || (ax === 1 && ay === 2 && !board[from.y + dy / 2][from.x]);
  if (type === "E") return ax === 2 && ay === 2 && !board[from.y + dy / 2][from.x + dx / 2] && (unrestricted || (red ? to.y >= 5 : to.y <= 4));
  if (type === "A") return ax === 1 && ay === 1 && (unrestricted || (to.x >= 3 && to.x <= 5 && (red ? to.y >= 7 : to.y <= 2)));
  if (type === "K") {
    if (destination?.t === "K" && dx === 0 && pathCount(from, to, board) === 0) return true;
    return ax + ay === 1 && to.x >= 3 && to.x <= 5 && (red ? to.y >= 7 : to.y <= 2);
  }
  if (type === "P") return (dy === (red ? -1 : 1) && dx === 0) || ((red ? from.y <= 4 : from.y >= 5) && dy === 0 && ax === 1);
  return false;
}

export function cloneBoard(board) {
  return board.map((row) => row.map((piece) => piece ? { ...piece } : null));
}

export function inCheck(color, board, variant = "standard") {
  let king;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) if (board[y]?.[x]?.t === "K" && board[y][x].c === color) king = { y, x };
  if (!king) return true;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y]?.[x] && board[y][x].c !== color && pseudoLegal({ y, x }, king, board, variant)) return true;
  }
  return false;
}

export function legalMove(color, from, to, board, variant = "standard") {
  if (board[from?.y]?.[from?.x]?.c !== color || !pseudoLegal(from, to, board, variant)) return false;
  const next = cloneBoard(board);
  next[to.y][to.x] = { ...next[from.y][from.x], h: false };
  next[from.y][from.x] = null;
  return !inCheck(color, next, variant);
}

export function hasLegalMove(color, board, variant = "standard") {
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    if (board[y]?.[x]?.c !== color) continue;
    for (let ty = 0; ty < 10; ty++) for (let tx = 0; tx < 9; tx++) if (legalMove(color, { y, x }, { y: ty, x: tx }, board, variant)) return true;
  }
  return false;
}
