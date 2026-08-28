(() => {
  const game = document.querySelector("#game");
  const gameInfo = document.querySelector(".game-info");
  const headingBlock = gameInfo?.firstElementChild;
  const modeEyebrow = headingBlock?.querySelector(".eyebrow");
  const gameTitle = document.querySelector("#game-title");
  const roomLabel = document.querySelector("#room-label");
  const copyLink = document.querySelector("#copy-link");
  const toolGrid = document.querySelector(".side-tool-grid");
  const actions = document.querySelector(".actions");
  const restartButton = document.querySelector("#restart");
  const leaveLink = actions?.querySelector('a[href="/"]');

  if (!game || !gameInfo) return;

  const previousRender = render;
  const previousRenderPlayers = renderPlayers;
  const previousStartLocal = startLocal;
  const previousShowGame = showGame;

  function hasStarted() {
    return Boolean(state?.lastAction) || (Array.isArray(state?.history) && state.history.length > 1);
  }

  function canChangeSide() {
    const isPlayer = myColor === "red" || myColor === "black";
    return isPlayer && !hasStarted() && !sandboxActive && !replayActive;
  }

  function restoreRestartButton() {
    if (!restartButton || !actions) return;
    restartButton.classList.remove("secondary", "solo-restart-tool");
    restartButton.classList.add("text-button");
    if (leaveLink) actions.insertBefore(restartButton, leaveLink);
    else actions.appendChild(restartButton);
  }

  function applySoloPanel() {
    game.classList.toggle("solo-mode", localMode);

    if (localMode) {
      if (modeEyebrow) modeEyebrow.textContent = "SOLO MATCH";
      if (gameTitle) gameTitle.textContent = "人機對戰";
      if (roomLabel) roomLabel.textContent = `單機模式 · ${state.variant === "jieqi" ? "揭棋" : "標準象棋"}`;
      copyLink?.classList.add("hidden");
      if (restartButton && toolGrid) {
        restartButton.classList.remove("text-button");
        restartButton.classList.add("secondary", "solo-restart-tool");
        const setupButton = document.querySelector("#setup-enter");
        if (setupButton) toolGrid.insertBefore(restartButton, setupButton);
        else toolGrid.appendChild(restartButton);
      }
      return;
    }

    if (modeEyebrow) modeEyebrow.textContent = "PRIVATE MATCH";
    if (gameTitle) gameTitle.textContent = state.variant === "jieqi" ? "揭棋對局" : "好友對局";
    if (roomLabel && roomId) roomLabel.textContent = `房間代碼 · ${roomId}`;
    copyLink?.classList.remove("hidden");
    restoreRestartButton();
  }

  renderCaptured = function redesignedCapturedRecord() {
    const panel = document.querySelector("#captured-panel");
    const list = document.querySelector("#captured-list");
    const visible = state.variant === "jieqi" && (myColor === "red" || myColor === "black");
    panel?.classList.toggle("hidden", !visible);
    if (!visible || !panel || !list) return;

    const chip = (item, ownerSide) => {
      const hidden = item.hidden !== false;
      const isMine = ownerSide === myColor;
      if (hidden && !isMine) {
        const hint = "對方吃到暗子，真實棋種不可見";
        return `<span class="captured-token opponent-hidden" title="${hint}" aria-label="${hint}"><span class="captured-chip covered-capture">暗</span></span>`;
      }

      const kind = names[item.c]?.[item.t] || "暗";
      const hint = hidden ? `${kind}，吃掉時為暗子` : `${kind}，吃掉時為明子`;
      return `<span class="captured-token${hidden ? " known-hidden" : ""}" title="${hint}" aria-label="${hint}"><span class="captured-chip ${item.c}">${kind}</span>${hidden ? '<i class="capture-state-badge">暗</i>' : ""}</span>`;
    };

    const group = (side, label) => {
      const items = state.captures?.[side] || [];
      const chips = items.map((item) => chip(item, side)).join("");
      return `<div class="captured-group"><b>${label}</b><div class="captured-row">${chips || "<em>尚無吃子</em>"}</div></div>`;
    };

    const opponent = myColor === "red" ? "black" : "red";
    list.innerHTML = group(myColor, "我方吃子") + group(opponent, "對方吃子");
    const note = panel.querySelector("small");
    if (note) note.textContent = "我方暗吃顯示棋種與暗標記；對方暗吃只顯示暗";
  };

  renderSideChoice = function redesignedSideChoice() {
    const red = document.querySelector("#choose-red");
    const black = document.querySelector("#choose-black");
    const wrapper = document.querySelector(".in-game-color");
    if (!red || !black) return;

    const unlocked = canChangeSide();
    red.classList.toggle("active", myColor === "red");
    black.classList.toggle("active", myColor === "black");
    red.setAttribute("aria-pressed", String(myColor === "red"));
    black.setAttribute("aria-pressed", String(myColor === "black"));
    red.disabled = myColor === "red" || !unlocked;
    black.disabled = myColor === "black" || !unlocked;
    wrapper?.classList.toggle("side-choice-locked", !unlocked);

    const reason = hasStarted() ? "第一手落下後不可換邊；重新開局後會再次開放" : "開局前可切換陣營";
    red.title = reason;
    black.title = reason;
  };

  changeSide = async function changeSideBeforeFirstMove(color) {
    if (color === myColor) return;
    if (!canChangeSide()) {
      toast("第一手落下後不可換邊；請先重新開局");
      renderSideChoice();
      return;
    }

    if (localMode) {
      const playerName = players.find((player) => player.name !== "電腦棋手")?.name || "玩家";
      aiThinking = false;
      myColor = color;
      players = [
        { name: playerName, color },
        { name: "電腦棋手", color: color === "red" ? "black" : "red" },
      ];
      selected = null;
      renderPlayers();
      toast(`已切換為${color === "red" ? "紅方" : "黑方"}`);
      scheduleAiMove();
      return;
    }

    try {
      const response = await fetch("/api/change-side", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Player-Token": playerToken,
        },
        body: JSON.stringify({ roomId, color }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "換邊失敗");
      myColor = data.color;
      players = data.players || players;
      stateRevision = Number.isFinite(data.revision) ? data.revision : stateRevision;
      lastPlayers = JSON.stringify(players);
      selected = null;
      renderPlayers();
      toast(data.swapped ? "雙方已交換陣營" : `已切換為${myColor === "red" ? "紅方" : "黑方"}`);
    } catch (error) {
      toast(error.message || "換邊失敗");
      await pollRoom();
    }
  };

  render = function featureRender() {
    previousRender();
    applySoloPanel();
    renderSideChoice();
  };

  renderPlayers = function featureRenderPlayers() {
    previousRenderPlayers();
    applySoloPanel();
    renderSideChoice();
  };

  startLocal = function featureStartLocal(color, name, variant = "standard") {
    previousStartLocal(color, name, variant);
    applySoloPanel();
    renderSideChoice();
  };

  showGame = function featureShowGame(result) {
    previousShowGame(result);
    applySoloPanel();
    renderSideChoice();
  };

  document.querySelector("#choose-red").onclick = () => changeSide("red");
  document.querySelector("#choose-black").onclick = () => changeSide("black");

  applySoloPanel();
  renderSideChoice();
})();

(() => {
  const header = document.querySelector("header");
  const connection = document.querySelector("#connection");
  if (!header || !connection) return;

  const versionLink = document.createElement("a");
  versionLink.id = "app-version";
  versionLink.href = "https://github.com/yoya9933/chess-online";
  versionLink.target = "_blank";
  versionLink.rel = "noreferrer";
  versionLink.textContent = "v1.0.0";
  versionLink.setAttribute("aria-label", "查看目前網站版本");
  Object.assign(versionLink.style, {
    marginLeft: "auto",
    marginRight: "18px",
    color: "#9e9588",
    textDecoration: "none",
    fontFamily: "monospace",
    fontSize: "11px",
    letterSpacing: ".06em",
    whiteSpace: "nowrap",
  });
  header.insertBefore(versionLink, connection);

  fetch("/version.json", { cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("version metadata unavailable")))
    .then((metadata) => {
      const version = String(metadata.version || "1.0.0");
      const commit = String(metadata.commit || "");
      const isCommit = /^[0-9a-f]{7,40}$/i.test(commit);
      const shortCommit = isCommit ? commit.slice(0, 7) : "";
      versionLink.textContent = `v${version}${shortCommit ? ` · ${shortCommit}` : ""}`;
      if (isCommit) versionLink.href = `https://github.com/yoya9933/chess-online/commit/${commit}`;
      const deployedAt = metadata.deployedAt ? new Date(metadata.deployedAt) : null;
      versionLink.title = deployedAt && !Number.isNaN(deployedAt.getTime())
        ? `版本 v${version} · 部署 ${deployedAt.toLocaleString("zh-TW", { hour12: false })}`
        : `版本 v${version}`;
    })
    .catch(() => {});
})();

(() => {
  roomRequest = async function secureRoomRequest(method, payload) {
    const safePayload = payload ? { ...payload } : {};
    delete safePayload.token;
    const response = await fetch("/api/rooms", {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Player-Token": playerToken,
      },
      body: method === "POST" ? JSON.stringify(safePayload) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "連線失敗");
    return data;
  };

  pollRoom = async function securePollRoom() {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/rooms?room=${encodeURIComponent(roomId)}`, {
        headers: { "X-Player-Token": playerToken },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok) {
        $("#connection").classList.add("online");
        $("#connection").innerHTML = "<i></i> 已連線";
        applyRemote(data);
      }
    } catch {}
  };
})();
