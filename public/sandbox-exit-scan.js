(() => {
  const exitButton = document.querySelector("#sandbox-exit");
  const board = document.querySelector("#board");
  if (!exitButton || !board || typeof exitButton.onclick !== "function") return;

  const exitSandbox = exitButton.onclick;
  let exiting = false;

  exitButton.onclick = null;
  exitButton.addEventListener("click", async () => {
    if (exiting) return;
    exiting = true;
    exitButton.disabled = true;
    document.body.classList.add("sandbox-exiting");

    const finishExit = () => {
      board.querySelector(".sandbox-exit-scan-layer")?.remove();
      exitSandbox.call(exitButton);
      document.body.classList.remove("sandbox-exiting");
      exitButton.disabled = false;
      exiting = false;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishExit();
      return;
    }

    const scan = document.createElement("div");
    scan.className = "sandbox-exit-scan-layer";
    Object.assign(scan.style, {
      position: "absolute",
      left: "0",
      right: "0",
      top: "0",
      height: "20%",
      zIndex: "1000",
      pointerEvents: "none",
      opacity: "0",
      transform: "translateY(500%)",
      background: "linear-gradient(to bottom, transparent 0%, rgba(255,120,189,.28) 22%, rgba(255,245,251,1) 50%, rgba(255,120,189,.58) 68%, transparent 100%)",
      boxShadow: "0 0 34px rgba(255,120,189,1), 0 0 70px rgba(255,120,189,.75)"
    });
    board.appendChild(scan);

    try {
      const animation = scan.animate(
        [
          { transform: "translateY(500%)", opacity: 0 },
          { transform: "translateY(390%)", opacity: 1, offset: 0.12 },
          { transform: "translateY(-80%)", opacity: 1, offset: 0.82 },
          { transform: "translateY(-110%)", opacity: 0 }
        ],
        { duration: 1150, easing: "cubic-bezier(.22,.7,.2,1)", fill: "forwards" }
      );
      await animation.finished;
    } catch {}

    finishExit();
  });
})();
