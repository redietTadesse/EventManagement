import { useEffect, useRef } from 'react';

// A layered wave of light, drawn at display resolution and paused offscreen.
export default function VenueLightField() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width, height, frame, visible = true, time = 0, last = 0;
    let focus = .5, target = .5;
    function draw() {
      ctx.clearRect(0,0,width,height);
      const gradient = ctx.createLinearGradient(0,0,width,height*.6);
      gradient.addColorStop(0,'#6259ff'); gradient.addColorStop(.39,'#af6bff');
      gradient.addColorStop(.62,'#ff89ab'); gradient.addColorStop(.81,'#ffbb92'); gradient.addColorStop(1,'#fccbb2');
      ctx.strokeStyle = gradient;
      for (let i=0; i<62; i++) {
        const t=i/61;
        ctx.beginPath();
        for(let j=0;j<=110;j++) {
          const x=j/110;
          const crest=Math.sin(x*6.3+t*2.4+time*.21+(focus-.5)*.6);
          const fold=Math.sin(x*9.4-time*.17+t*.7);
          const y=height*(.36+.24*crest+.08*fold+.29*t);
          if(j===0)ctx.moveTo(0,y); else ctx.lineTo(width*x,y);
        }
        ctx.globalAlpha=.26+.55*Math.sin(Math.PI*t);
        ctx.lineWidth=.8+t*.6;ctx.stroke();
      }
    }
    function animate(now) {
      if(now-last>=32){time+=Math.min(now-last,50)/1000;last=now;focus+=(target-focus)*.08;draw();}
      frame=requestAnimationFrame(animate);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (width && height) draw();
      if (visible && !document.hidden && !reduced.matches) frame=requestAnimationFrame(animate);
    }
    function resize() {
      const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;
      const scale=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);sync();
    }
    const parent=canvas.parentElement;
    function steer(event){target=event.clientX/Math.max(width,1);}
    const size=new ResizeObserver(resize);size.observe(parent);
    const observer=typeof IntersectionObserver==='function' ? new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}) : null;
    observer?.observe(parent);parent.addEventListener('pointermove',steer);
    reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);resize();
    return ()=>{cancelAnimationFrame(frame);size.disconnect();observer?.disconnect();parent.removeEventListener('pointermove',steer);reduced.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);};
  },[]);
  return <canvas ref={ref} className="venue-light-field" aria-hidden="true"/>;
}
