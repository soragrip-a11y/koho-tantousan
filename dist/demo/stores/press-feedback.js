// Visual feedback only: no click interception, persistence, or transmission.
let held = null;
let pointer = null;
let bounds = null;
function release() {
  held?.removeAttribute('data-pressed');
  held = pointer = bounds = null;
}
document.addEventListener('pointerdown', event => {
  release();
  document.body.classList.add('pointer-input');
  const control = event.target.closest('button,a.button');
  if (!event.isPrimary || event.button !== 0 || !control || control.disabled) return;
  held = control;
  pointer = event.pointerId;
  bounds = control.getBoundingClientRect();
  held.setAttribute('data-pressed', '');
}, {passive:true});
document.addEventListener('pointermove', event => {
  if (held && event.pointerId === pointer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) release();
}, {passive:true});
for (const type of ['pointerup','pointercancel','lostpointercapture']) {
  document.addEventListener(type, event => { if (event.pointerId === pointer) release(); }, {passive:true});
}
document.addEventListener('scroll', release, {capture:true,passive:true});
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', release);
document.addEventListener('keydown', () => {
  release();
  document.body.classList.remove('pointer-input');
});
