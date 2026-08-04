(() => {
  const board = document.getElementById("board");
  const toolbar = document.getElementById("sandbox-toolbar");
  const controls = document.getElementById("sandbox-controls");
  const enter = document.getElementById("sandbox-enter");
  const exit = document.getElementById("sandbox-exit");
  const prev = document.getElementById("sandbox-prev");
  const next = document.getElementById("sandbox-next");
  const replaySandbox = document.getElementById("replay-sandbox");
  if (!board || !toolbar || !controls) return;

  let active = false;
  let cleanupTimer = 0;

  function restartClass(name, duration) {
    board.classList.remove(name);
    void board.offsetWidth;
    board.classList.add(name);
    window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(() => board.classList.remove(name), duration);
  }

  function setActive(value) {
    if (active === value) return;
    active = value;
    document.body.classList.toggle("sandbox-visual-active", value);
    toolbar.classList.toggle("sandbox-toolbar-active", value);
    restartClass(value ? "sandbox-enter-fx" : "sandbox-exit-fx", value ? 700 : 480);
  }

  function syncFromControls() {
    setActive(!controls.classList.contains("hidden"));
  }

  function stepEffect() {
    if (!active) return;
    window.requestAnimationFrame(() => restartClass("sandbox-step-fx", 480));
  }

  [prev, next].forEach((button) => button?.addEventListener("click", stepEffect));
  enter?.addEventListener("click", () => window.requestAnimationFrame(syncFromControls));
  replaySandbox?.addEventListener("click", () => window.requestAnimationFrame(syncFromControls));
  exit?.addEventListener("click", () => window.requestAnimationFrame(syncFromControls));

  new MutationObserver(syncFromControls).observe(controls, {
    attributes: true,
    attributeFilter: ["class"],
  });

  syncFromControls();
})();
