const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_, res) => res.json({ ok: true }));

function cleanRoomId(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, name }, reply) => {
    roomId = cleanRoomId(roomId);
    name = String(name || "棋友").trim().slice(0, 16);
    if (!roomId) return reply({ error: "房間代碼無效" });

    let room = rooms.get(roomId);
    if (!room) {
      room = { players: [], state: null };
      rooms.set(roomId, room);
    }
    const used = new Set(room.players.map((p) => p.color));
    const color = !used.has("red") ? "red" : !used.has("black") ? "black" : "spectator";
    const player = { id: socket.id, name, color };
    room.players.push(player);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.color = color;

    reply({ roomId, color, state: room.state, players: room.players });
    io.to(roomId).emit("players", room.players);
  });

  socket.on("move", ({ from, to, state }) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room || socket.data.color === "spectator") return;
    if (!state || state.turn === socket.data.color) return;
    room.state = state;
    socket.to(roomId).emit("moved", { from, to, state });
  });

  socket.on("restart", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    room.state = null;
    io.to(socket.data.roomId).emit("restarted");
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== socket.id);
    if (!room.players.length) rooms.delete(roomId);
    else io.to(roomId).emit("players", room.players);
  });
});

const port = process.env.PORT || 3210;
server.listen(port, () => console.log(`象棋對戰已啟動：http://localhost:${port}`));
