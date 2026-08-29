(() => {
  if (!globalThis.ChuheAI) return;
  const KEY='xiangqi-ai-difficulty';
  let difficulty=localStorage.getItem(KEY)||'normal';

  function installControl(){
    const form=document.querySelector('#join-form');if(!form||document.querySelector('#ai-difficulty-wrap'))return;
    const field=document.createElement('label');field.id='ai-difficulty-wrap';field.className='ai-difficulty-wrap hidden';field.innerHTML=`AI 難度<select id="ai-difficulty"><option value="easy">簡單</option><option value="normal">普通</option><option value="hard">困難</option></select>`;
    const roomField=document.querySelector('#room-field');roomField?.insertAdjacentElement('afterend',field);
    const select=field.querySelector('select');select.value=difficulty;select.addEventListener('change',()=>{difficulty=select.value;localStorage.setItem(KEY,difficulty)});
    const sync=()=>{const solo=document.querySelector('input[name="game-mode"]:checked')?.value==='solo';field.classList.toggle('hidden',!solo)};
    document.querySelectorAll('input[name="game-mode"]').forEach(input=>input.addEventListener('change',sync));sync();
  }

  makeAiMove=function makeAiMoveV2(){
    if(!localMode||sandboxActive||replayActive||setupActive||state.winner||state.turn===myColor){aiThinking=false;render();return}
    const aiColor=state.turn;
    const choice=globalThis.ChuheAI.chooseMove(state.board,aiColor,state.variant||'standard',difficulty);
    if(!choice){state.winner=myColor;aiThinking=false;render();return}
    const {from,to}=choice,moving=state.board[from.y][from.x],captured=state.board[to.y][to.x],beforePosition=positionSnapshot(state),wasHidden=Boolean(moving.h),notationMoving={...moving,t:moving.h?moving.o:moving.t};
    state.board[to.y][to.x]=moving;state.board[from.y][from.x]=null;if(state.board[to.y][to.x]?.h)state.board[to.y][to.x].h=false;lastMove={from,to,capture:Boolean(captured),reveal:wasHidden};
    if(captured){state.captures=state.captures||{red:[],black:[]};state.captures[aiColor].push({t:captured.t,c:captured.c,hidden:Boolean(captured.h)})}
    if(captured?.t==='K')state.winner=aiColor;state.turn=aiColor==='red'?'black':'red';if(!state.winner&&!hasAnyLegalMove(state.turn))state.winner=aiColor;
    state.lastAction={from,to,capture:Boolean(captured),reveal:wasHidden};recordMove(from,to,notationMoving,captured,beforePosition);aiThinking=false;playMoveSound(Boolean(captured));const givesCheck=!state.winner&&inCheck(state.turn,state.board);render();showMoveEffects(Boolean(captured),state.winner,to,givesCheck);
  };

  window.ChuhePlatform=window.ChuhePlatform||{};window.ChuhePlatform.ai={get difficulty(){return difficulty},setDifficulty(value){if(['easy','normal','hard'].includes(value)){difficulty=value;localStorage.setItem(KEY,value)}}};
  installControl();
})();
