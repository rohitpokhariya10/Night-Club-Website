import gsap from 'gsap';

type Box = {x: number; y: number; width: number; height: number};
type Light = {x: number; y: number; angle: number; width: number; height: number; opacity: number};
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

/** GSAP emits percentage translations alongside rotation. DOMMatrix cannot parse unresolved percentages;
 * extract the rotation without reading layout or normalizing the rig's CSS individual transforms. */
export function inlineRotation(transform: string) {
  const rotate = transform.match(/rotate(?:Z)?\(([-\d.e]+)deg\)/i);
  if (rotate) return Number(rotate[1]);
  const matrix = transform.match(/matrix(?:3d)?\(([^)]+)\)/i);
  if (!matrix) return 0;
  const [a, b] = matrix[1].split(',').map(Number);
  return Math.atan2(b, a) * 180 / Math.PI;
}

/**
 * The specular lobe of a polished surface. A mirror-finished letter only sends a light to the viewer when the beam
 * passes close to the angle that reflects it at the eye (for a sign facing the room and a rig straight above, a beam
 * pointing straight down). Away from that angle the surface shows only a faint diffuse wash. Gaussian in the beam's
 * angle from vertical (degrees); `spread` sets how long a sweep holds the glint.
 */
export function specular(angle: number, spread = 3) {
  return Math.exp(-(angle * angle) / (2 * spread * spread));
}

/** Project the existing cone onto the middle of a text line. CSS gradient coordinates use the projection onto
 * its normal, so the feathered reflection shares the real beam's direction as well as its position. */
/**
 * Where in its sweep a beam reflects off the lettering toward the viewer (absolute angle, degrees) and how tightly.
 * `travel` (px per degree) treats the letter faces as very slightly curved: as the beam turns through the catch angle,
 * the highlight slides across the letters in the direction the beam is moving, instead of only fading in place.
 */
export type Catch = {angle: number; spread: number; travel?: number};

export function reflectedLight(light: Light, text: Box, catchAt: Catch | null = {angle: 0, spread: 3}) {
  const angle = clamp(light.angle, -65, 65) * Math.PI / 180;
  const depth = text.y + text.height / 2 - light.y;
  const x = light.x - depth * Math.tan(angle) - text.x;
  const span = Math.abs(text.width * Math.cos(angle)) + Math.abs(text.height * Math.sin(angle));
  const cone = light.width * (0.12 + 0.88 * clamp(depth / light.height, 0, 1));
  const distance = Math.max(-x, x - text.width, 0);
  const falloff = Math.pow(clamp(1 - distance / Math.max(1, cone), 0, 1), 2);
  const along = (px: number) => 50 + (px - text.width / 2) * Math.cos(angle) / Math.max(1, span) * 100;
  // The footprint moves toward -x as the angle grows (x = light.x - depth·tan); the highlight slides the same way.
  const slide = catchAt ? (light.angle - catchAt.angle) * (catchAt.travel ?? 0) : 0;
  return {
    position: along(x),
    glintPosition: along(x - slide),
    width: clamp(cone * 0.23 / Math.max(1, span) * 100, 2, 8),
    angle: 90 + light.angle,
    intensity: depth < 0 ? 0 : clamp(light.opacity * falloff * (1 - clamp(depth / light.height - 0.3, 0, 0.7)), 0, 1),
    // The moment the letters catch this light: the diffuse reach above, gated by the specular lobe.
    glint: depth < 0 || !catchAt ? 0 : clamp(light.opacity * falloff * specular(light.angle - catchAt.angle, catchAt.spread), 0, 1),
  };
}

/** Read static geometry on resize; read animated values from the existing GSAP transforms on update.
 * No ticker, timer, independent shimmer or competing text transform. */
/**
 * `glints[i]` places beam i's catch point inside its own ambient sweep, as an offset from its resting angle (degrees)
 * with the lobe's spread; a missing entry means that beam only washes the letters (no glint). The caller owns the
 * sweeps, so the catch points always lie on the paths the beams actually travel.
 */
export function createHeadlineReflection(hero: HTMLElement, mobile: boolean, glints: ({offset: number; spread: number; travel?: number} | null)[] = []) {
  const lines = Array.from(hero.querySelectorAll<HTMLElement>('.hero-line-text'));
  const overlays = lines.map(line => line.querySelector<HTMLElement>('.hero-reflection'));
  const rigs = Array.from(hero.querySelectorAll<HTMLElement>('.hero-beam')).slice(1, 4);
  const lights = rigs.map(rig => rig.querySelector<HTMLElement>('i')!);
  const media = hero.querySelector<HTMLElement>('.cinema-media')!;
  const field = hero.querySelector<HTMLElement>('.hero-beams')!;
  const copy = hero.querySelector<HTMLElement>('.cinema-copy')!;
  let width = 1, height = 1, copyHeight = 1;
  let boxes: Box[] = [], beams: {x: number; angle: number; width: number; opacity: number}[] = [];
  let destroyed = false;
  const number = (el: HTMLElement, property: string, fallback = 0) => {
    const value = Number(gsap.getProperty(el, property));
    return Number.isFinite(value) ? value : fallback;
  };
  // gsap.getProperty(rotation) can normalize a CSS individual `rotate` into an inline transform. The rig's
  // resting rotate belongs to CSS, so read only the already-rendered inline matrix, without invoking GSAP's parser.
  const rotationCache = new Map<HTMLElement, {transform: string; angle: number}>();
  const rotation = (el: HTMLElement) => {
    const transform = el.style.transform || 'none';
    const cached = rotationCache.get(el);
    if (cached?.transform === transform) return cached.angle;
    const angle = inlineRotation(transform);
    rotationCache.set(el, {transform, angle});
    return angle;
  };
  const localBox = (el: HTMLElement): Box => {
    let x = 0, y = 0, node: HTMLElement | null = el;
    while (node && node !== hero) {x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null;}
    return {x, y, width: el.offsetWidth, height: el.offsetHeight};
  };
  function update() {
    if (destroyed || !boxes.length) return;
    const scale = number(media, 'scaleX', 1), mediaY = number(media, 'yPercent') * height / 100;
    const copyY = number(copy, 'yPercent') * copyHeight / 100;
    const fieldOpacity = field.style.opacity === '' ? 1 : Number(field.style.opacity);
    const projected = beams.map((beam, i): Light => ({
      x: width / 2 + (beam.x - width / 2) * scale,
      y: height / 2 + (-height * 0.06 - height / 2) * scale + mediaY,
      width: beam.width * scale, height: height * 1.14 * scale,
      angle: beam.angle + rotation(rigs[i]) + rotation(lights[i]),
      opacity: fieldOpacity * (lights[i].style.opacity === '' ? beam.opacity : Number(lights[i].style.opacity)),
    }));
    overlays.forEach((overlay, line) => {
      if (!overlay) return;
      projected.forEach((light, i) => {
        const glint = glints[i];
        // travel is given per line height, so the slide covers the same share of the lettering at every size.
        const reflection = reflectedLight(light, {...boxes[line], y: boxes[line].y + copyY},
          glint ? {angle: beams[i].angle + glint.offset, spread: glint.spread, travel: (glint.travel ?? 0) * boxes[line].height} : null);
        const vars = {
          [`--rx${i}`]: `${reflection.position.toFixed(2)}%`, [`--rw${i}`]: `${reflection.width.toFixed(2)}%`,
          [`--ra${i}`]: `${reflection.angle.toFixed(2)}deg`, [`--ri${i}`]: (reflection.intensity * (mobile ? 0.6 : 1)).toFixed(3),
          [`--rg${i}`]: (reflection.glint * (mobile ? 0.8 : 1)).toFixed(3), [`--gx${i}`]: `${reflection.glintPosition.toFixed(2)}%`,
        };
        for (const [key, value] of Object.entries(vars)) if (overlay.style.getPropertyValue(key) !== value) overlay.style.setProperty(key, value);
      });
    });
  }
  const measure = () => {
    if (destroyed) return;
    width = hero.offsetWidth; height = hero.offsetHeight; copyHeight = copy.offsetHeight;
    boxes = lines.map(localBox);
    beams = rigs.map((rig, i) => {
      const style = getComputedStyle(rig);
      return {x: parseFloat(style.getPropertyValue('--bx')) / 100 * width, angle: parseFloat(style.getPropertyValue('--br')),
        width: rig.offsetWidth, opacity: parseFloat(getComputedStyle(lights[i]).opacity)};
    });
    update();
  };
  const observer = new ResizeObserver(measure);
  observer.observe(hero);
  lines.forEach(line => observer.observe(line));
  measure();
  return {update, destroy() {
    destroyed = true; observer.disconnect();
    overlays.forEach(overlay => {for (let i = 0; i < 3; i++) for (const key of ['rx', 'rw', 'ra', 'ri', 'rg', 'gx']) overlay?.style.removeProperty(`--${key}${i}`);});
  }};
}
