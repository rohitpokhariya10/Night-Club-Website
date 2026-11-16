import gsap from 'gsap';
import {RESTING, slats, type LightState} from './lightShape';

/**
 * Drives the fluted-glass light field. GSAP tweens the plain `state` object; while running,
 * every animation frame writes four custom properties per visible slat (transform/opacity only,
 * no layout). The engine sleeps whenever the hero is hidden, covered or the tab is in the background.
 */
export function createLightField(root: HTMLElement, initial: LightState = RESTING) {
  const state: LightState = {...initial};
  let bands: HTMLElement[] = [];
  let aspect = 1.6;
  let running = false;

  function measure() {
    bands = Array.from(root.querySelectorAll<HTMLElement>('.lf-slat'))
      .filter(slat => slat.offsetWidth > 0)
      .map(slat => slat.querySelector<HTMLElement>('.lf-band')!)
      .filter(Boolean);
    aspect = root.offsetWidth / Math.max(1, root.offsetHeight) || 1.6;
  }

  function render() {
    const values = slats(bands.length, state, aspect);
    bands.forEach((band, i) => {
      const v = values[i];
      band.style.setProperty('--y', v.y.toFixed(4));
      band.style.setProperty('--k', `${v.skew.toFixed(2)}deg`);
      band.style.setProperty('--t', v.thick.toFixed(3));
      band.style.setProperty('--o', v.light.toFixed(3));
    });
  }

  const observer = new ResizeObserver(() => {measure(); render();});
  observer.observe(root);
  measure();
  render();

  return {
    state,
    render,
    get running() {return running;},
    start() {if (!running) {gsap.ticker.add(render); running = true;}},
    stop() {if (running) {gsap.ticker.remove(render); running = false;}},
    destroy() {gsap.ticker.remove(render); running = false; observer.disconnect();},
  };
}

export type LightField = ReturnType<typeof createLightField>;
