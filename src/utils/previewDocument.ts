// Fit existing games whose fixed canvas sizes are taller than the monitor.
// This runs inside the isolated preview; the saved HTML remains unchanged.
export function previewDocument(code: string): string {
  const helper = `<script>(()=>{const fit=()=>{const b=document.body;if(!b)return;b.style.zoom='1';requestAnimationFrame(()=>{const height=Math.max(b.scrollHeight,b.offsetHeight);const scale=Math.min(1,innerHeight/height);b.style.zoom=String(scale);});};addEventListener('load',fit);addEventListener('resize',fit);setTimeout(fit,100);})();</script>`
  return /<\/body\s*>/i.test(code) ? code.replace(/<\/body\s*>/i, helper + '</body>') : code + helper
}
