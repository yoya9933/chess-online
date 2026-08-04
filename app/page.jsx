export default function Home() {
  return (
    <main className="home-shell">
      <header className="home-header">
        <div className="brand">楚河<span>棋局</span></div>
        <p>ONLINE CHINESE BOARD GAMES</p>
      </header>
      <section className="hero">
        <p className="eyebrow">CHOOSE YOUR GAME</p>
        <h1>與老友，<br /><em>再下一局。</em></h1>
        <p className="lead">免註冊、開房即玩。選擇標準象棋、揭棋，或全新的台灣暗棋模式。</p>
        <div className="mode-grid">
          <a className="mode-card xiangqi" href="/index.html">
            <span className="seal">弈</span>
            <small>9 × 10 棋盤</small>
            <h2>象棋／揭棋</h2>
            <p>標準象棋、單機對電腦、揭棋、自訂棋局與棋譜回放。</p>
            <b>進入對局 →</b>
          </a>
          <a className="mode-card banqi" href="/banqi.html">
            <span className="seal">暗</span>
            <small>4 × 8 棋盤</small>
            <h2>台灣暗棋</h2>
            <p>32 子隨機覆蓋，首翻決定陣營，支援線上房間與悔棋。</p>
            <b>開始翻棋 →</b>
          </a>
        </div>
      </section>
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#050a0f;color:#f4ead7;font-family:Arial,"Noto Sans TC",sans-serif}.home-shell{min-height:100vh;padding:26px max(20px,calc((100vw - 1120px)/2));background:radial-gradient(circle at 20% 0,#1a2a34 0,#071017 42%,#03070a 100%)}.home-header{display:flex;justify-content:space-between;align-items:center}.home-header p,.eyebrow{color:#d5ad68;font-size:12px;font-weight:700;letter-spacing:.2em}.brand{font-family:serif;font-size:28px;font-weight:900;letter-spacing:.08em}.brand span{color:#d5ad68}.hero{padding:9vh 0 5vh}.hero h1{margin:12px 0 18px;font-family:serif;font-size:clamp(48px,7vw,86px);line-height:1.05}.hero h1 em{color:#d5ad68;font-style:normal}.lead{max-width:650px;color:#aebbc3;font-size:17px;line-height:1.8}.mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:48px}.mode-card{position:relative;min-height:300px;padding:30px;border:1px solid #30434f;border-radius:22px;background:linear-gradient(145deg,rgba(19,33,42,.96),rgba(7,14,20,.96));color:#f4ead7;text-decoration:none;box-shadow:0 24px 70px rgba(0,0,0,.3);transition:.2s}.mode-card:hover{transform:translateY(-5px);border-color:#d5ad68}.mode-card small{color:#d5ad68;letter-spacing:.12em}.mode-card h2{margin:24px 0 12px;font-family:serif;font-size:34px}.mode-card p{max-width:440px;color:#aebbc3;line-height:1.75}.mode-card b{position:absolute;left:30px;bottom:28px;color:#dfbd79}.seal{display:grid;place-items:center;width:54px;height:54px;float:right;border:2px solid #a75b43;border-radius:12px;color:#cf7155;font-family:serif;font-size:27px;font-weight:900;transform:rotate(-4deg)}.banqi{background:linear-gradient(145deg,rgba(55,39,23,.96),rgba(12,15,17,.97))}@media(max-width:700px){.home-header p{display:none}.hero{padding-top:7vh}.mode-grid{grid-template-columns:1fr}.mode-card{min-height:270px}.hero h1{font-size:50px}}
      `}</style>
    </main>
  );
}
