(() => {
  const platform=window.ChuhePlatform=window.ChuhePlatform||{};
  platform.spectating=false;

  function watchUrl(id=roomId){const url=new URL(location.href);url.searchParams.set('room',id);url.searchParams.set('watch','1');return url.toString()}
  async function fetchWatch(id){
    const response=await fetch(`/api/watch?room=${encodeURIComponent(id)}`,{headers:{'X-Player-Token':playerToken},cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'無法進入觀戰');return data;
  }
  async function watchRoom(id){
    const room=String(id||document.querySelector('#room')?.value||'').trim().toUpperCase();if(!room){toast('請先輸入房間代碼');return}
    try{
      const data=await fetchWatch(room);platform.spectating=true;stateRevision=data.revision;lastPlayers=JSON.stringify(data.players||[]);showGame(data);history.replaceState(null,'',`?room=${encodeURIComponent(room)}&watch=1`);document.querySelector('#game-title').textContent=state.variant==='jieqi'?'觀戰 · 揭棋對局':'觀戰 · 好友對局';document.querySelector('.in-game-color')?.classList.add('hidden');
      clearInterval(pollTimer);pollTimer=setInterval(pollRoom,30000);renderSpectators(data.spectators);toast('已進入觀戰模式');
    }catch(error){toast(error.message)}
  }
  function renderSpectators(count=window.ChuhePlatform?.realtime?.spectators||0){
    let badge=document.querySelector('#spectator-count');const playersEl=document.querySelector('#players');if(!playersEl)return;
    if(!badge){badge=document.createElement('div');badge.id='spectator-count';badge.className='platform-badge spectator-count';playersEl.parentNode.insertBefore(badge,playersEl.nextSibling)}
    badge.textContent=`觀戰 ${Number(count||0)} 人`;
  }
  const basePollRoom=pollRoom;
  pollRoom=async function spectatorAwarePoll(){
    if(!platform.spectating)return basePollRoom();if(!roomId)return;
    try{const data=await fetchWatch(roomId);applyRemote(data);renderSpectators(data.spectators)}catch{}
  };

  const form=document.querySelector('#join-form');
  if(form){
    const button=document.createElement('button');button.type='button';button.id='watch-room';button.className='secondary watch-room';button.textContent='觀戰房間';button.addEventListener('click',()=>watchRoom());
    const submit=form.querySelector('button[type="submit"]');submit?.insertAdjacentElement('afterend',button);
  }
  const tools=document.querySelector('.side-tool-grid');
  if(tools){const button=document.createElement('button');button.id='copy-watch-link';button.type='button';button.className='secondary';button.textContent='複製觀戰連結';button.addEventListener('click',async()=>{if(!roomId)return;await navigator.clipboard.writeText(watchUrl());toast('觀戰連結已複製')});tools.appendChild(button)}
  window.addEventListener('chuhe-presence',(event)=>renderSpectators(event.detail?.spectators));
  platform.watch={enter:watchRoom,url:watchUrl};
  const query=new URLSearchParams(location.search);if(query.get('watch')==='1'&&query.get('room'))setTimeout(()=>watchRoom(query.get('room')),0);
})();
