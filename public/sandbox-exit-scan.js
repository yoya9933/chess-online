(() => {
  const exitButton = document.querySelector("#sandbox-exit");
  if (!exitButton || typeof exitButton.onclick !== "function") return;

  const exitSandbox = exitButton.onclick;
  let exiting = false;

  exitButton.onclick = null;
  exitButton.addEventListener("click", () => {
    if (exiting) return;
    exiting = true;
    exitButton.disabled = true;
    document.body.classList.add("sandbox-exiting");

    const finishExit = () => {
      exitSandbox.call(exitButton);
      document.body.classList.remove("sandbox-exiting");
      exitButton.disabled = false;
      exiting = false;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishExit();
      return;
    }

    window.setTimeout(finishExit, 1150);
  });
})();
