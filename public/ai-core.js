(() => {
  const VALUES={K:100000,R:900,C:450,H:400,E:220,A:220,P:120};
  const opposite=(c)=>c==='red'?'black':'red';
  const clone=(b)=>b.map(r=>r.map(p=>p?{...p}:null));
  const inside=(p)=>p&&p.x>=0&&p.x<9&&p.y>=0&&p.y<10;
  function pathCount(f,t,b){let n=0;if(f.y===t.y){for(let x=Math.min(f.x,t.x)+1;x<Math.max(f.x,t.x);x++)if(b[f.y][x])n++}else{for(let y=Math.min(f.y,t.y)+1;y<Math.max(f.y,t.y);y++)if(b[y][f.x])n++}return n}
  function pseudo(f,t,b,variant='standard'){
    if(!inside(f)||!inside(t))return false;const p=b[f.y]?.[f.x],d=b[t.y]?.[t.x];if(!p||(d&&d.c===p.c))return false;
    const dx=t.x-f.x,dy=t.y-f.y,ax=Math.abs(dx),ay=Math.abs(dy),red=p.c==='red',type=p.h?p.o:p.t,free=variant==='jieqi'&&!p.h;
    if(type==='R')return(dx===0||dy===0)&&pathCount(f,t,b)===0;if(type==='C')return(dx===0||dy===0)&&pathCount(f,t,b)===(d?1:0);
    if(type==='H')return(ax===2&&ay===1&&!b[f.y][f.x+dx/2])||(ax===1&&ay===2&&!b[f.y+dy/2][f.x]);
    if(type==='E')return ax===2&&ay===2&&!b[f.y+dy/2][f.x+dx/2]&&(free||(red?t.y>=5:t.y<=4));
    if(type==='A')return ax===1&&ay===1&&(free||(t.x>=3&&t.x<=5&&(red?t.y>=7:t.y<=2)));
    if(type==='K'){if(d?.t==='K'&&dx===0&&pathCount(f,t,b)===0)return true;return ax+ay===1&&t.x>=3&&t.x<=5&&(red?t.y>=7:t.y<=2)}
    if(type==='P')return(dy===(red?-1:1)&&dx===0)||((red?f.y<=4:f.y>=5)&&dy===0&&ax===1);return false;
  }
  function inCheck(color,b,variant='standard'){let k;for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(b[y]?.[x]?.t==='K'&&b[y][x].c===color)k={y,x};if(!k)return true;for(let y=0;y<10;y++)for(let x=0;x<9;x++)if(b[y]?.[x]&&b[y][x].c!==color&&pseudo({y,x},k,b,variant))return true;return false}
  function legal(color,f,t,b,variant='standard'){if(b[f?.y]?.[f?.x]?.c!==color||!pseudo(f,t,b,variant))return false;const n=apply(b,{from:f,to:t});return!inCheck(color,n,variant)}
  function moves(b,color,variant='standard'){const out=[];for(let y=0;y<10;y++)for(let x=0;x<9;x++){if(b[y]?.[x]?.c!==color)continue;for(let ty=0;ty<10;ty++)for(let tx=0;tx<9;tx++)if(legal(color,{y,x},{y:ty,x:tx},b,variant)){const capture=b[ty][tx];out.push({from:{y,x},to:{y:ty,x:tx},capture:capture?(capture.h?300:VALUES[capture.t]||0):0})}}out.sort((a,b)=>b.capture-a.capture);return out}
  function apply(b,move){const n=clone(b),piece=n[move.from.y][move.from.x],wasHidden=Boolean(piece?.h);n[move.to.y][move.to.x]={...piece,h:false,t:wasHidden?(piece.o||'P'):piece.t,simulatedReveal:wasHidden};n[move.from.y][move.from.x]=null;return n}
  function pieceValue(p){if(!p)return 0;if(p.h)return 300;return VALUES[p.t]||300}
  function evaluate(b,perspective,variant='standard'){
    let score=0;for(let y=0;y<10;y++)for(let x=0;x<9;x++){const p=b[y][x];if(!p)continue;let v=pieceValue(p);if(!p.h&&p.t==='P'){const crossed=p.c==='red'?y<=4:y>=5;if(crossed)v+=35}if(x>=3&&x<=5)v+=4;score+=(p.c===perspective?1:-1)*v}
    if(inCheck(opposite(perspective),b,variant))score+=25;if(inCheck(perspective,b,variant))score-=25;return score;
  }
  function search(b,turn,perspective,variant,depth,alpha,beta,budget){if(--budget.nodes<=0||depth<=0)return evaluate(b,perspective,variant);const list=moves(b,turn,variant);if(!list.length)return turn===perspective?-999999:999999;const maximize=turn===perspective;let best=maximize?-Infinity:Infinity;for(const move of list){const score=search(apply(b,move),opposite(turn),perspective,variant,depth-1,alpha,beta,budget);if(maximize){best=Math.max(best,score);alpha=Math.max(alpha,best)}else{best=Math.min(best,score);beta=Math.min(beta,best)}if(beta<=alpha||budget.nodes<=0)break}return best}
  function chooseMove(board,color,variant='standard',difficulty='normal'){const list=moves(board,color,variant);if(!list.length)return null;const depth=difficulty==='hard'?3:difficulty==='normal'?2:1,budget={nodes:difficulty==='hard'?18000:difficulty==='normal'?5000:1000};const scored=list.map(move=>({move,score:search(apply(board,move),opposite(color),color,variant,depth-1,-Infinity,Infinity,budget)+(difficulty==='easy'?(Math.random()-.5)*180:0)})).sort((a,b)=>b.score-a.score);if(difficulty==='easy')return scored[Math.floor(Math.random()*Math.min(4,scored.length))].move;return scored[0].move}
  globalThis.ChuheAI={chooseMove,evaluate,legalMoves:moves,applyMove:apply};
})();
