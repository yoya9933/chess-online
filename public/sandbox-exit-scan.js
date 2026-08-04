(() => {
  const exitButton = document.querySelector("#sandbox-exit");
  const board = document.querySelector("#board");
  if (!exitButton || !board || typeof exitButton.onclick !== "function") return;

  const exitSandbox = exitButton.onclick;
  let exiting = false;

  exitButton.onclick = null;
  exitButton.addEventListener("click", () => {
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
    board.appendChild(scan);

    let finished = false;
    const completeOnce = () => {
      if (finished) return;
      finished = true;
      finishExit();
    };

    scan.addEventListener("animationend", completeOnce, { once: true });
    window.setTimeout(completeOnce, 1350);
  });
})();
