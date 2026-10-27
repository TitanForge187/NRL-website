// Manga choreography decorates the page without intercepting game input.
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hero=document.querySelector('.hero');
 const decorative=(tag,cls,text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;node.setAttribute('aria-hidden','true');return node;};
 const strip=decorative('div','anime-eye-strip');const image=document.createElement('img');image.src='assets/manga-titan.svg';image.alt='';image.width=1200;image.height=320;strip.append(image);hero.prepend(strip);
 hero.append(decorative('span','anime-issue','ISSUE 187 / THE ORIGIN ARC'),decorative('span','anime-impact','FORGE\nAWAKENED.'),decorative('span','anime-sideword','BUILD. BREAK. ASCEND.'));
 const power=decorative('div','anime-power');power.innerHTML='<span>FORGE POWER</span><i><b></b></i><strong>00%</strong>';document.body.append(power);
 const chapters=[['#arena','01 / ENTER THE ARENA'],['#assembly','02 / THE MACHINE WITHIN'],['#modules','03 / KNOW YOUR POWER'],['#simulations','04 / MOTION UNLEASHED'],['#team','05 / MEET THE SQUAD'],['#gallery','06 / BEHIND THE BUILD']];
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('anime-in-view');observer.unobserve(entry.target);}},{threshold:.12});
 for(const [selector,title] of chapters){const section=document.querySelector(selector);if(!section)continue;section.classList.add('anime-chapter');const ribbon=decorative('div','anime-chapter-ribbon',title);section.prepend(ribbon);observer.observe(section);}
 let queued=false;
 function update(){queued=false;const max=document.documentElement.scrollHeight-innerHeight,p=max>0?Math.min(1,Math.max(0,scrollY/max)):0;power.style.setProperty('--power',p);power.querySelector('strong').textContent=String(Math.round(p*100)).padStart(2,'0')+'%';if(!reduced.matches&&!document.body.classList.contains('paused'))hero.style.setProperty('--manga-shift',Math.min(scrollY*.12,90)+'px');}
 addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);update();
 document.querySelector('#hero-ignite').addEventListener('click',()=>{hero.classList.toggle('anime-awakened',document.querySelector('#hero-ignite').getAttribute('aria-pressed')==='true');});
 if(matchMedia('(pointer:fine)').matches)for(const card of document.querySelectorAll('.module-card,.team .card,.photo-panel')){card.addEventListener('pointermove',event=>{if(reduced.matches||document.body.classList.contains('paused'))return;const r=card.getBoundingClientRect();card.style.setProperty('--panel-x',(event.clientX-r.left)/r.width);});card.addEventListener('pointerleave',()=>card.style.setProperty('--panel-x','.5'));}
})();
