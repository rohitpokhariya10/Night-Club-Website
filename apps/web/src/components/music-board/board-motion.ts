import gsap from 'gsap';

type Pose = {x: number; y: number; scale: number; rotation: number};
type Spring = {x: number; y: number; vx: number; vy: number; tx: number; ty: number};
export type PhotoBoard = {reset(): void; deselect(): void; destroy(): void};

/** Poses drive both cards and string endpoints. Only the control points lag; connections never detach. */
export function createPhotoBoard(stage: HTMLElement, onSelect: (index: number) => void): PhotoBoard {
  const cards = Array.from(stage.querySelectorAll<HTMLButtonElement>('.mb-photo'));
  const paths = Array.from(stage.querySelectorAll<SVGPathElement>('.mb-threads path'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const poses: Pose[] = cards.map(() => ({x: 0, y: 0, scale: 1, rotation: 0}));
  // Normalized drops survive resize; originals remain separate for Start Over.
  const dropped = new Map<number, {x: number; y: number; rotation: number}>();
  const springs: Spring[][] = paths.map(() => Array.from({length: 2}, () => ({x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0})));
  let homes: Pose[] = [], widths: number[] = [], heights: number[] = [], restLengths: number[] = [];
  let width = 0, height = 0, selected = -1, suppressed = -1, freeSelected = false;
  let destroyed = false, ticking = false, layer = 2;
  let drag: {index: number; id: number; startX: number; startY: number; pose: Pose; moved: boolean} | null = null;
  const mobile = () => matchMedia('(max-width: 600px)').matches;
  const center = () => ({x: width / 2, y: height * (mobile() ? .5 : .46)});
  const constrain = (i: number, pose: Pose): Pose => {
    const radians = pose.rotation * Math.PI / 180, c = Math.abs(Math.cos(radians)), s = Math.abs(Math.sin(radians));
    // Include the caption and rotated corners, plus a little room for the border/shadow.
    const halfW = (widths[i] * c + (heights[i] + 48) * s) * pose.scale / 2 + 6;
    const halfH = (widths[i] * s + heights[i] * c) * pose.scale / 2 + 6;
    return {...pose, x: Math.max(halfW, Math.min(width - halfW, pose.x)), y: Math.max(halfH, Math.min(height - halfH - 28 * pose.scale, pose.y))};
  };
  const home = (i: number): Pose => {
    const saved = dropped.get(i);
    return constrain(i, saved ? {x: saved.x * width, y: saved.y * height, rotation: saved.rotation, scale: 1} : homes[i]);
  };
  const destination = (i: number): Pose => {
    if (i !== selected) return home(i);
    const scale = Math.min((mobile() ? Math.min(width * .53, 190) : width * .25) / widths[i], (mobile() ? 200 : 235) / heights[i]);
    return constrain(i, {...(freeSelected ? home(i) : {...center(), rotation: -2}), scale});
  };
  const paintStrings = () => paths.forEach((path, i) => {
    const a = poses[i], b = poses[(i + 1) % poses.length], [c, d] = springs[i];
    path.setAttribute('d', `M${a.x},${a.y} C${c.x},${c.y} ${d.x},${d.y} ${b.x},${b.y}`);
  });
  const stop = () => {gsap.ticker.remove(tick); ticking = false;};
  const tick = (_time: number, delta: number) => {
    const dt = Math.min(delta / 1000, 1 / 30) / 2;
    let moving = false;
    for (const pair of springs) for (const p of pair) {
      for (let n = 0; n < 2; n++) {
        p.vx += ((p.tx - p.x) * 225 - p.vx * 21) * dt;
        p.vy += ((p.ty - p.y) * 225 - p.vy * 21) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (Math.hypot(p.tx - p.x, p.ty - p.y) > .08 || Math.hypot(p.vx, p.vy) > .5) moving = true;
      else {p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0;}
    }
    paintStrings();
    if (!moving) stop();
  };
  const draw = (instant = false) => {
    if (destroyed) return;
    poses.forEach((p, i) => {
      cards[i].style.transform = `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%) rotate(${p.rotation}deg) scale(${p.scale})`;
    });
    paths.forEach((_, i) => {
      const a = poses[i], b = poses[(i + 1) % poses.length];
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.max(1, Math.hypot(dx, dy));
      const tension = Math.min(1.7, Math.max(.3, (restLengths[i] || length) / length));
      const bend = (i % 2 ? -1 : 1) * Math.min(width * .065, 85) * tension;
      const nx = -dy / length * bend, ny = dx / length * bend;
      springs[i].forEach((p, j) => {
        const fraction = (j + 1) / 3;
        p.tx = a.x + dx * fraction + nx; p.ty = a.y + dy * fraction + ny;
        if (instant || reduce.matches) {p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0;}
      });
    });
    paintStrings();
    if (instant || reduce.matches) stop();
    else if (!ticking) {ticking = true; gsap.ticker.add(tick);}
  };
  const settle = (i: number) => {
    gsap.to(poses[i], {...destination(i), duration: reduce.matches ? 0 : .8, ease: 'power3.out', overwrite: true, onUpdate: () => draw()});
    cards[i].style.zIndex = i === selected ? '20' : '2';
    cards[i].removeAttribute('data-dragging');
  };
  const choose = (i: number) => {
    const previous = selected;
    selected = i; freeSelected = false;
    if (previous >= 0 && previous !== i) settle(previous);
    settle(i); onSelect(i);
  };
  const cancel = () => {
    if (!drag) return;
    const {index, id, pose, moved} = drag;
    drag = null;
    if (cards[index].hasPointerCapture(id)) cards[index].releasePointerCapture(id);
    if (moved) suppressed = index;
    gsap.to(poses[index], {...pose, duration: reduce.matches ? 0 : .35, overwrite: true, onUpdate: () => draw()});
    cards[index].removeAttribute('data-dragging');
    cards[index].style.zIndex = index === selected ? '20' : '2';
  };
  const resize = () => {
    if (destroyed || !stage.isConnected || !stage.clientWidth || !stage.clientHeight) return;
    if (cards.some(card => !Number.isFinite(parseFloat(getComputedStyle(card).getPropertyValue('--px'))))) return;
    cancel(); width = stage.clientWidth; height = stage.clientHeight;
    homes = cards.map((card, i) => {
      const css = getComputedStyle(card);
      widths[i] = card.offsetWidth; heights[i] = card.offsetHeight;
      return {x: parseFloat(css.getPropertyValue('--px')) * width / 100, y: parseFloat(css.getPropertyValue('--py')) * height / 100, scale: 1, rotation: parseFloat(css.getPropertyValue('--rotate'))};
    });
    restLengths = homes.map((a, i) => {const b = homes[(i + 1) % homes.length]; return Math.hypot(b.x - a.x, b.y - a.y);});
    poses.forEach((p, i) => {gsap.killTweensOf(p); Object.assign(p, destination(i));});
    stage.dataset.ready = 'true'; draw(true);
  };
  const cardIndex = (event: Event) => cards.indexOf((event.target as Element).closest<HTMLButtonElement>('.mb-photo')!);
  const down = (event: PointerEvent) => {
    const index = cardIndex(event);
    if (index < 0 || event.button !== 0 || !event.isPrimary || drag) return;
    suppressed = -1; gsap.killTweensOf(poses[index]);
    drag = {index, id: event.pointerId, startX: event.clientX, startY: event.clientY, pose: {...poses[index]}, moved: false};
    cards[index].setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    cards[drag.index].dataset.dragging = 'true'; cards[drag.index].style.zIndex = '100';
    Object.assign(poses[drag.index], constrain(drag.index, {...drag.pose, x: drag.pose.x + dx, y: drag.pose.y + dy}));
    draw();
  };
  const up = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const d = drag; drag = null;
    if (cards[d.index].hasPointerCapture(event.pointerId)) cards[d.index].releasePointerCapture(event.pointerId);
    if (!d.moved) return;
    suppressed = d.index;
    const p = poses[d.index];
    dropped.set(d.index, {x: p.x / width, y: p.y / height, rotation: p.rotation});
    if (d.index === selected) freeSelected = true;
    cards[d.index].removeAttribute('data-dragging');
    cards[d.index].style.zIndex = String(d.index === selected ? 20 : Math.min(++layer, 19));
    // Keep the card exactly where released; only its connected strings continue settling.
    draw();
  };
  const click = (event: MouseEvent) => {
    const i = cardIndex(event);
    if (i < 0) return;
    if (suppressed === i && event.detail !== 0) {suppressed = -1; return;}
    choose(i);
  };
  const cancelPointer = (event: PointerEvent) => {if (drag?.id === event.pointerId) cancel();};
  stage.addEventListener('pointerdown', down); stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', cancelPointer);
  stage.addEventListener('lostpointercapture', cancelPointer); stage.addEventListener('click', click);
  const observer = new ResizeObserver(resize); observer.observe(stage);
  reduce.addEventListener('change', resize); resize();
  const deselect = () => {cancel(); const previous = selected; selected = -1; freeSelected = false; if (previous >= 0) settle(previous);};
  return {
    deselect,
    reset() {cancel(); selected = -1; freeSelected = false; dropped.clear(); layer = 2; cards.forEach((_, i) => settle(i));},
    destroy() {
      destroyed = true; cancel(); stop(); observer.disconnect(); reduce.removeEventListener('change', resize);
      stage.removeEventListener('pointerdown', down); stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up); stage.removeEventListener('pointercancel', cancelPointer);
      stage.removeEventListener('lostpointercapture', cancelPointer); stage.removeEventListener('click', click);
      poses.forEach(p => gsap.killTweensOf(p));
    },
  };
}
