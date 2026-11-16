import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createInstrument} from '../apps/web/src/lib/strings/instrument.ts';
import {instrumentLayouts} from '../apps/web/src/lib/experience.ts';

// A small event/DOM adapter exercises the production instrument without launching a browser.
// It cannot validate browser hit testing, native touch scrolling or visual composition.
type Handler = (event: Record<string, unknown>) => void;
class ElementStub {
  listeners = new Map<string, Set<Handler>>();
  dataset: Record<string, string> = {};
  attrs = new Map<string, string>();
  capture = new Set<number>();
  values = new Map<string, string>();
  style = {transform: '', setProperty: (k: string, v: string) => this.values.set(k, v), removeProperty: (k: string) => this.values.delete(k)};
  children: ElementStub[] = [];
  parent: ElementStub | null = null;
  textContent = '';
  measures = 0;
  constructor(public name: string) {}
  add(child: ElementStub) {child.parent = this; this.children.push(child); return child;}
  matches(selector: string) {
    return selector.split(',').some(s => {
      s = s.trim();
      if (s === 'path:not(.ns-hit)') return this.name === 'path';
      return this.name === s.replace(/^\./, '');
    });
  }
  closest(selector: string): ElementStub | null {return this.matches(selector) ? this : this.parent?.closest(selector) ?? null;}
  querySelectorAll(selector: string): ElementStub[] {return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]);}
  querySelector(selector: string) {return this.querySelectorAll(selector)[0] ?? null;}
  setAttribute(key: string, value: string) {this.attrs.set(key, value);}
  getBoundingClientRect() {this.measures++; return {left: 0, top: 0, width: 1440, height: 1300};}
  addEventListener(type: string, fn: Handler) {if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(fn);}
  removeEventListener(type: string, fn: Handler) {this.listeners.get(type)?.delete(fn);}
  setPointerCapture(id: number) {this.capture.add(id);}
  hasPointerCapture(id: number) {return this.capture.has(id);}
  releasePointerCapture(id: number) {this.capture.delete(id);}
  emit(type: string, target: ElementStub, fields: Record<string, unknown> = {}) {
    const event = {type, target, button: 0, isPrimary: true, pointerType: 'mouse', pointerId: 1, clientX: 244, clientY: 180, timeStamp: performance.now(), detail: 1, prevented: false,
      preventDefault() {this.prevented = true;}, stopPropagation() {}, ...fields};
    for (const fn of this.listeners.get(type) ?? []) fn(event);
    return event;
  }
  get listenerCount() {return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);}
}

test('production photo events: drag/click separation, capture, silent movement, keyboard, cancellation, offscreen persistence and disposal', () => {
  const gsap = createRequire(new URL('../apps/web/package.json', import.meta.url))('gsap').gsap as typeof import('gsap').gsap;
  const original = {add: gsap.ticker.add, remove: gsap.ticker.remove};
  const callbacks = new Set<(...args: number[]) => void>();
  gsap.ticker.add = ((fn: (...args: number[]) => void) => {callbacks.add(fn); return fn;}) as typeof gsap.ticker.add;
  gsap.ticker.remove = ((fn: (...args: number[]) => void) => {callbacks.delete(fn);}) as typeof gsap.ticker.remove;
  const descriptors = new Map(['window', 'document', 'ResizeObserver', 'IntersectionObserver'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const win = new ElementStub('window'), doc = Object.assign(new ElementStub('document'), {hidden: false});
  let intersection: (entries: {isIntersecting: boolean}[]) => void = () => {};
  let disconnected = 0;
  class Resize {observe() {} disconnect() {disconnected++;}}
  class Intersection extends Resize {constructor(fn: typeof intersection) {super(); intersection = fn;}}
  for (const [key, value] of Object.entries({window: win, document: doc, ResizeObserver: Resize, IntersectionObserver: Intersection})) Object.defineProperty(globalThis, key, {value, configurable: true});
  const section = new ElementStub('section'), status = section.add(new ElementStub('ns-status'));
  const root = section.add(new ElementStub('ns-instrument')), svg = root.add(new ElementStub('svg'));
  for (let i = 0; i < 4; i++) {
    const group = svg.add(new ElementStub('ns-string')); group.dataset = {string: String(i), swing: '3'};
    group.add(new ElementStub('path'));
  }
  const cards = Array.from({length: 7}, (_, i) => {
    const el = root.add(new ElementStub('ns-card')); el.dataset.index = String(i);
    const swing = el.add(new ElementStub('ns-swing'));
    const mount = swing.add(new ElementStub('ns-mount'));
    const plate = swing.add(new ElementStub('ns-plate'));
    return {el, swing, mount, plate};
  });
  const positions = new Map<number, number>();
  let notes = 0;
  let live: ReturnType<typeof createInstrument> | undefined;
  const start = (motion: boolean) => createInstrument({root: root as unknown as HTMLElement, svg: svg as unknown as SVGSVGElement, layout: instrumentLayouts.desktop, motion, positions, onPluck: () => notes++});
  const frames = (n = 600) => {for (let i = 0; i < n; i++) for (const fn of callbacks) fn(i / 60, 1000 / 60);};
  try {
    live = start(true);
    const c = cards[0];
    root.emit('pointerdown', c.plate);
    root.emit('pointermove', c.plate, {clientX: 247});
    assert.equal(c.el.capture.size, 0, 'short movement is still a normal click');
    root.emit('pointermove', c.plate, {clientX: 310});
    assert.equal(c.el.dataset.dragging, 'swing');
    assert.ok(c.el.hasPointerCapture(1));
    assert.ok(c.swing.style.transform.includes('rotate(-'), 'pull pivots from the hanging attachment');
    const reads = svg.measures;
    for (let x = 311; x < 340; x++) root.emit('pointermove', c.el, {clientX: x});
    assert.equal(svg.measures, reads, 'no geometry read on pointermove');
    root.emit('pointerup', c.el, {clientX: 340});
    assert.equal(c.el.capture.size, 0);
    assert.equal(root.emit('click', c.plate).prevented, true, 'release-generated click cannot navigate');
    root.emit('pointerdown', c.plate);
    root.emit('pointerup', c.plate);
    assert.equal(root.emit('click', c.plate).prevented, false, 'next intentional click is not swallowed');
    frames();
    assert.equal(callbacks.size, 0, 'settled instrument removes its ticker');
    assert.equal(c.swing.style.transform, '');

    root.emit('pointerdown', c.mount);
    root.emit('pointermove', c.mount, {clientX: 900});
    assert.ok(positions.get(0)! > 600, 'mount can travel hundreds of units while making room for its neighbours');
    assert.equal(callbacks.size, 1, 'one coordinated ticker even with pushed neighbours');
    root.emit('lostpointercapture', c.plate); // implicit touch capture transferring to the card
    assert.equal(c.el.dataset.dragging, 'slide');
    root.emit('pointercancel', c.el);
    assert.equal(c.el.dataset.dragging, undefined);
    assert.equal(c.el.capture.size, 0);
    frames();
    const placed = c.swing.style.transform;
    intersection([{isIntersecting: false}]);
    assert.equal(callbacks.size, 0);
    intersection([{isIntersecting: true}]); frames();
    assert.equal(c.swing.style.transform, placed, 'offscreen suspension preserves dropped position');
    root.emit('keydown', c.mount, {key: 'ArrowLeft'});
    assert.ok(status.textContent.includes('Nightlife photograph at'));
    assert.equal(notes, 0, 'all photograph gestures remain silent');

    live.destroy(); live = start(false);
    const previous = positions.get(0)!;
    root.emit('pointerdown', c.plate);
    root.emit('pointermove', c.plate, {clientX: 214});
    root.emit('pointerup', c.el, {clientX: 214});
    frames();
    assert.ok(positions.get(0)! < previous, 'reduced motion allows direct repositioning on the photo');
    assert.ok(c.swing.style.transform.endsWith('rotate(0.000deg)'), 'no decorative spring in reduced motion');
    const next = positions.get(0)!;
    root.emit('pointerdown', c.mount, {pointerType: 'touch'});
    root.emit('pointermove', c.mount, {pointerType: 'touch', clientY: 260});
    assert.equal(c.el.capture.size, 0, 'vertical touch scroll never captures');
    assert.equal(positions.get(0), next);
    root.emit('pointerdown', c.mount);
    root.emit('pointermove', c.mount, {clientX: 300});
    live.destroy(); live = undefined;
    assert.equal(root.listenerCount + win.listenerCount + doc.listenerCount + cards.reduce((sum, c) => sum + c.el.listenerCount, 0), 0);
    assert.equal(callbacks.size, 0);
    assert.ok(cards.every(c => c.el.capture.size === 0));
    assert.equal(disconnected, 4, 'both observers released for both instrument instances');
  } finally {
    live?.destroy();
    gsap.ticker.add = original.add; gsap.ticker.remove = original.remove; gsap.ticker.sleep();
    for (const [key, descriptor] of descriptors) {if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);}
  }
});
