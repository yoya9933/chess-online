"use client";

import { useState } from "react";

const modes = {
  xiangqi: {
    href: "/index.html",
    seal: "弈",
    eyebrow: "ENTERING XIANGQI",
    title: "楚河漢界",
    subtitle: "棋盤已備，請入局。",
  },
  banqi: {
    href: "/banqi.html",
    seal: "暗",
    eyebrow: "ENTERING BANQI",
    title: "翻子定局",
    subtitle: "三十二子，勝負未明。",
  },
};

export default function Home() {
  const [transition, setTransition] = useState(null);

  function enterMode(event, modeKey) {
    event.preventDefault();
    if (transition) return;
    const mode = modes[modeKey];
    setTransition(modeKey);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      window.location.href = mode.href;
    }, reducedMotion ? 80 : 1150);
  }

  const activeMode = transition ? modes[transition] : null;

  return (
    <main className={`home-shell${transition ? " is-leaving" : ""}`}>
      <header className="home-header">
        <div className="brand">楚河<span>棋局</span></div>
        <p>ONLINE CHINESE BOARD GAMES</p>
      </header>
      <section className="hero">
        <p className="eyebrow">CHOOSE YOUR GAME</p>
        <h1>與老友，<br /><em>再下一局。</em></h1>
        <p className="lead">免註冊、開房即玩。選擇標準象棋、揭棋，或全新的台灣暗棋模式。</p>
        <div className="mode-grid">
          <a className="mode-card xiangqi" href="/index.html" onClick={(event) => enterMode(event, "xiangqi")}>
            <span className="seal">弈</span>
            <small>9 × 10 棋盤</small>
            <h2>象棋／揭棋</h2>
            <p>標準象棋、單機對電腦、揭棋、自訂棋局與棋譜回放。</p>
            <b>進入對局 →</b>
          </a>
          <a className="mode-card banqi" href="/banqi.html" onClick={(event) => enterMode(event, "banqi")}>
            <span className="seal">暗</span>
            <small>4 × 8 棋盤</small>
            <h2>台灣暗棋</h2>
            <p>32 子隨機覆蓋，首翻決定陣營，支援線上房間與悔棋。</p>
            <b>開始翻棋 →</b>
          </a>
        </div>
      </section>

      <div className={`page-transition${transition ? " active" : ""}`} aria-hidden={!transition}>
        <div className="transition-curtain curtain-left" />
        <div className="transition-curtain curtain-right" />
        <div className="transition-grid" />
        {activeMode && (
          <div className="transition-content">
            <p>{activeMode.eyebrow}</p>
            <div className="transition-seal">{activeMode.seal}</div>
            <h2>{activeMode.title}</h2>
            <span>{activeMode.subtitle}</span>
          </div>
        )}
      </div>

      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#050a0f;color:#f4ead7;font-family:Arial,"Noto Sans TC",sans-serif;overflow-x:hidden}.home-shell{min-height:100vh;padding:26px max(20px,calc((100vw - 1120px)/2));background:radial-gradient(circle at 20% 0,#1a2a34 0,#071017 42%,#03070a 100%);transition:filter .5s ease,transform .7s cubic-bezier(.22,1,.36,1)}.home-shell.is-leaving>header,.home-shell.is-leaving>.hero{filter:blur(7px);transform:scale(.97);opacity:.45}.home-header,.hero{transition:filter .45s ease,transform .65s cubic-bezier(.22,1,.36,1),opacity .45s ease}.home-header{display:flex;justify-content:space-between;align-items:center}.home-header p,.eyebrow{color:#d5ad68;font-size:12px;font-weight:700;letter-spacing:.2em}.brand{font-family:serif;font-size:28px;font-weight:900;letter-spacing:.08em}.brand span{color:#d5ad68}.hero{padding:9vh 0 5vh}.hero h1{margin:12px 0 18px;font-family:serif;font-size:clamp(48px,7vw,86px);line-height:1.05}.hero h1 em{color:#d5ad68;font-style:normal}.lead{max-width:650px;color:#aebbc3;font-size:17px;line-height:1.8}.mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:48px}.mode-card{position:relative;min-height:300px;padding:30px;border:1px solid #30434f;border-radius:22px;background:linear-gradient(145deg,rgba(19,33,42,.96),rgba(7,14,20,.96));color:#f4ead7;text-decoration:none;box-shadow:0 24px 70px rgba(0,0,0,.3);transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}.mode-card:hover{transform:translateY(-5px);border-color:#d5ad68;box-shadow:0 30px 80px rgba(0,0,0,.42)}.mode-card:active{transform:translateY(-1px) scale(.99)}.mode-card small{color:#d5ad68;letter-spacing:.12em}.mode-card h2{margin:24px 0 12px;font-family:serif;font-size:34px}.mode-card p{max-width:440px;color:#aebbc3;line-height:1.75}.mode-card b{position:absolute;left:30px;bottom:28px;color:#dfbd79}.seal{display:grid;place-items:center;width:54px;height:54px;float:right;border:2px solid #a75b43;border-radius:12px;color:#cf7155;font-family:serif;font-size:27px;font-weight:900;transform:rotate(-4deg)}.banqi{background:linear-gradient(145deg,rgba(55,39,23,.96),rgba(12,15,17,.97))}
        .page-transition{position:fixed;inset:0;z-index:999;pointer-events:none;display:grid;place-items:center;visibility:hidden}.page-transition.active{visibility:visible}.transition-curtain{position:absolute;top:0;width:52%;height:100%;background:linear-gradient(180deg,#071017,#020507);transition:transform .68s cubic-bezier(.77,0,.18,1)}.curtain-left{left:0;transform:translateX(-102%);border-right:1px solid rgba(213,173,104,.25)}.curtain-right{right:0;transform:translateX(102%);border-left:1px solid rgba(213,173,104,.25)}.page-transition.active .curtain-left,.page-transition.active .curtain-right{transform:translateX(0)}.transition-grid{position:absolute;inset:0;opacity:0;background-image:linear-gradient(rgba(213,173,104,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(213,173,104,.06) 1px,transparent 1px);background-size:34px 34px;transform:scale(1.15);transition:opacity .35s .38s ease,transform .75s .28s ease}.page-transition.active .transition-grid{opacity:1;transform:scale(1)}.transition-content{position:relative;z-index:2;text-align:center;opacity:0;transform:translateY(18px) scale(.92);transition:opacity .35s .48s ease,transform .6s .42s cubic-bezier(.22,1,.36,1)}.page-transition.active .transition-content{opacity:1;transform:translateY(0) scale(1)}.transition-content p{margin:0 0 18px;color:#d5ad68;font-size:11px;font-weight:700;letter-spacing:.28em}.transition-content h2{margin:18px 0 8px;font-family:serif;font-size:clamp(38px,7vw,70px);letter-spacing:.12em}.transition-content span{color:#9baab3;letter-spacing:.08em}.transition-seal{display:grid;place-items:center;width:82px;height:82px;margin:auto;border:2px solid #bd694f;border-radius:18px;color:#dc8164;font-family:serif;font-size:42px;font-weight:900;box-shadow:0 0 45px rgba(189,105,79,.18);animation:sealPulse 1s ease-in-out infinite alternate}@keyframes sealPulse{from{transform:rotate(-5deg) scale(.96)}to{transform:rotate(3deg) scale(1.04)}}
        @media(max-width:700px){.home-header p{display:none}.hero{padding-top:7vh}.mode-grid{grid-template-columns:1fr}.mode-card{min-height:270px}.hero h1{font-size:50px}.transition-content h2{font-size:42px}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.home-shell.is-leaving>header,.home-shell.is-leaving>.hero{filter:none}}
      `}</style>
    </main>
  );
}
