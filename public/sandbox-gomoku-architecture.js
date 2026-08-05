(() => {
  const board = document.querySelector("#board");
  const connection = document.querySelector("#connection");
  const status = document.querySelector("#status");
  const enterButton = document.querySelector("#sandbox-enter");
  const previousButton = document.querySelector("#sandbox-prev");
  const nextButton = document.querySelector("#sandbox-next");
  const exitButton = document.querySelector("#sandbox-exit");

  if (!board || !status || !enterButton || !previousButton || !nextButton || !exitButton) return;

  const originalPollRoom = pollRoom;
  const originalRender = render;
  const originalRenderSandbox = renderSandbox;

  function sandboxStatusText() {
    const winner = state?.winner;
    if (winner) return `推演結果：${winner === "red" ? "紅方" : "黑方"}獲勝`;
    const side = state?.turn === "red" ? "紅方" : "黑方";
    return `沙盤推演 · 第 ${sandboxIndex} 步 · 輪到${side}`;
  }

  function applySandboxPresentation() {
    board.classList.toggle("sandbox-frame", sandboxActive);
    if (!sandboxActive) return;
    status.textContent = sandboxStatusText();
    if (connection) connection.innerHTML = "<i></i> SANDBOX";
  }

  pollRoom = async function patchedPollRoom() {
    if (sandboxActive) return;
    return originalPollRoom();
  };

  render = function patchedRender() {
    originalRender();
    applySandboxPresentation();
  };

  renderSandbox = function patchedRenderSandbox() {
    originalRenderSandbox();
    board.classList.toggle("sandbox-frame", sandboxActive);
  };

  enterSandbox = function gomokuStyleEnterSandbox() {
    if (!replayActive) liveState = cloneState(state);
    replayActive = false;
    const initialSnapshot = cloneState(state);
    sandboxHistory = [initialSnapshot];
    sandboxIndex = 0;
    sandboxActive = true;
    state = cloneState(initialSnapshot);
    selected = null;
    lastMove = null;
    renderSandbox();
    render();
    renderUndo();
  };

  stepSandbox = function gomokuStyleStepSandbox(delta) {
    const nextIndex = sandboxIndex + delta;
    if (nextIndex < 0 || nextIndex >= sandboxHistory.length) return;
    sandboxIndex = nextIndex;
    state = cloneState(sandboxHistory[sandboxIndex]);
    selected = null;
    lastMove = null;
    renderSandbox();
    render();
  };

  exitSandbox = function gomokuStyleExitSandbox() {
    sandboxActive = false;
    state = cloneState(liveState || state);
    liveState = null;
    sandboxHistory = [];
    sandboxIndex = 0;
    selected = null;
    lastMove = null;
    board.classList.remove("sandbox-frame");
    renderSandbox();
    render();
    renderUndo();

    if (localMode) {
      scheduleAiMove();
      return;
    }

    if (connection) connection.innerHTML = "<i></i> 重新同步中";
    void originalPollRoom();
  };

  enterButton.onclick = enterSandbox;
  previousButton.onclick = () => stepSandbox(-1);
  nextButton.onclick = () => stepSandbox(1);
  exitButton.onclick = exitSandbox;
})();
