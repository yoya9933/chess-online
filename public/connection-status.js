(() => {
  const connection = document.querySelector("#connection");
  if (!connection) return;

  let consecutiveFailures = 0;

  function setConnectionState(stateName) {
    const labels = {
      online: "已連線",
      reconnecting: "重新連線中…",
      offline: "連線中斷",
    };
    const palette = {
      online: "#6b9d69",
      reconnecting: "#d6aa55",
      offline: "#d2645b",
    };
    connection.dataset.state = stateName;
    connection.classList.toggle("online", stateName === "online");
    connection.innerHTML = `<i></i> ${labels[stateName] || labels.reconnecting}`;
    const dot = connection.querySelector("i");
    if (dot) {
      const color = palette[stateName] || palette.reconnecting;
      dot.style.background = color;
      dot.style.boxShadow = `0 0 8px ${color}`;
    }
  }

  pollRoom = async function resilientPollRoom() {
    if (!roomId || localMode) return;
    if (!navigator.onLine) {
      consecutiveFailures = Math.max(consecutiveFailures, 3);
      setConnectionState("offline");
      return;
    }

    try {
      const response = await fetch(`/api/rooms?room=${encodeURIComponent(roomId)}`, {
        headers: { "X-Player-Token": playerToken },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "同步失敗");
      consecutiveFailures = 0;
      setConnectionState("online");
      applyRemote(data);
    } catch {
      consecutiveFailures += 1;
      setConnectionState(consecutiveFailures >= 3 ? "offline" : "reconnecting");
    }
  };

  window.addEventListener("offline", () => {
    consecutiveFailures = Math.max(consecutiveFailures, 3);
    setConnectionState("offline");
  });

  window.addEventListener("online", () => {
    if (!roomId || localMode) return;
    setConnectionState("reconnecting");
    pollRoom();
  });
})();
