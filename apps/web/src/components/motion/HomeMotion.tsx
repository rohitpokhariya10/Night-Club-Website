'use client';

import {useLayoutEffect} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {EASE, QUERIES} from '@/lib/motion/config';
import {lineReveal, mediaOf, revealOnFocus, titleReveal, whenIdle, type RevealRegistry} from '@/lib/motion/primitives';
import {getSmoothScroll} from '@/lib/motion/scroll';
import {createCrowd} from '@/lib/motion/crowd';
import {createHeadlineReflection} from '@/lib/motion/headlineReflection';

const q = (root: ParentNode | null | undefined, selector: string) => root?.querySelector<HTMLElement>(selector) ?? null;
const qa = (root: ParentNode | null | undefined, selector: string) => Array.from(root?.querySelectorAll<HTMLElement>(selector) ?? []);
type Scene = {root: HTMLElement; mobile: boolean; registry: RevealRegistry};

/**
 * Homepage scroll choreography. Sections are server-rendered and fully visible without this;
 * every scene below only enhances them and is reverted on unmount, breakpoint change or
 * reduced-motion preference. Scroll-linked scenes use scrub (progress = scroll position), so
 * fast jumps and reverse scrolling always land in a correct, visible state.
 */
export default function HomeMotion() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-home]');
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    // `reduce` is listed so the callback also runs for reduced motion on wide screens: gsap.matchMedia only calls a
    // conditions callback when at least one condition matches, and there both `motion` and `mobile` are false.
    media.add({motion: QUERIES.motion, reduce: '(prefers-reduced-motion: reduce)', mobile: QUERIES.mobile}, context => {
      const {motion, mobile} = context.conditions as {motion: boolean; mobile: boolean};
      // Reduced motion: the server-rendered resting composition is the hero; never hold the intro state.
      if (!motion) {
        document.documentElement.classList.remove('hero-intro');
        // Reduced motion: the scene is complete and still; the crowd is drawn once, standing.
        const host = q(root, '.hero-crowd');
        const still = host ? createCrowd(host, {mobile, still: true}) : null;
        return () => still?.destroy();
      }
      const scene: Scene = {root, mobile, registry: new Map()};
      // The hero is on screen at load, so its scene starts immediately.
      const releaseHero = heroScene(scene);
      // The first section after the hero: built at idle time, or on the first scroll input (wheel, touch, key,
      // pointer, scroll), whichever comes first. Input fires before the page moves, so the scene always exists
      // before the section comes into view, and its setup stays out of the page-load critical path.
      let releaseNightOut = () => {};
      let nightOutBuilt = false;
      const INPUTS = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'] as const;
      const buildNightOut = () => {
        if (nightOutBuilt) return;
        nightOutBuilt = true;
        INPUTS.forEach(type => removeEventListener(type, buildNightOut, true));
        cancelNightOut();
        context.add(() => {releaseNightOut = nightOutScene(scene);});
      };
      INPUTS.forEach(type => addEventListener(type, buildNightOut, {passive: true, capture: true}));
      const cancelNightOut = whenIdle(buildNightOut, 600);
      // Everything below the fold is built at the next idle moment, inside the same context (same cleanup).
      const cancelIdle = whenIdle(() => context.add(() => {
        nightlifeScene(scene);
        specialsScene(scene);
        eventsScene(scene);
        celebrationScene(scene);
        closingScene(scene);
      }));
      const releaseFocus = revealOnFocus(root, scene.registry);
      return () => {
        INPUTS.forEach(type => removeEventListener(type, buildNightOut, true));
        cancelNightOut(); cancelIdle(); releaseHero(); releaseNightOut(); releaseFocus();
      };
    });
    return () => media.revert();
  }, []);
  return null;
}

const INTRO_KEY = 'jo-hero-intro';
const introSeen = () => {try {return sessionStorage.getItem(INTRO_KEY) === '1';} catch {return true;}};
const markIntroSeen = () => {try {sessionStorage.setItem(INTRO_KEY, '1');} catch {/* storage unavailable */}};

/**
 * The hero. Two parts:
 * 1. The room's soft backlight and ceiling beams reveal around the original headline/crowd intro.
 *    Afterward, inner beam elements sweep independently; the outer rigs belong to the intro and scroll scene.
 *    The entire ambient timeline pauses offscreen and resumes from its existing phase.
 * 2. Sequence A of the scroll choreography (DELTA-MOTION-REFERENCE.md): the hero holds and recedes
 *    while the page rises over it (desktop/tablet); on phones, a native-scroll exit.
 */
function heroScene({root, mobile}: Scene) {
  const html = document.documentElement;
  const hero = q(root, '.cinema-hero');
  if (!hero) {html.classList.remove('hero-intro'); return () => {};}
  const layer = q(hero, '.cinema-media');
  const veil = q(hero, '.cinema-veil');
  const orbit = q(hero, '.cinema-orbit');
  const copy = q(hero, '.cinema-copy');
  const foot = q(hero, '.cinema-foot');
  const skip = q(hero, '.hero-skip');
  const header = document.querySelector<HTMLElement>('.header');
  const playIntro = !introSeen();
  // Hand over from the pre-paint class before any layout read, so a focused Skip button is never hidden.
  html.classList.remove('hero-intro');
  if (playIntro) hero.classList.add('is-intro');
  // The room (HERO-NIGHTCLUB-REBUILD-REPORT.md): ceiling beams (rig = scroll, light = ambient sway), the scroll-driven
  // ember wash and light sweep, and the unchanged crowd against a soft stage glow.
  const beamRigs = qa(hero, '.hero-beam');
  const beamLights = qa(hero, '.hero-beam > i');
  const beamField = q(hero, '.hero-beams');
  const atmosphere = q(hero, '.hero-atmosphere');
  const wash = q(hero, '.hero-wash');
  const sweep = q(hero, '.hero-sweep');
  const crowdHost = q(hero, '.hero-crowd');
  const crowd = crowdHost ? createCrowd(crowdHost, {mobile}) : null;

  // Each inner beam owns its idle rotation; ScrollTrigger rotates only the outer rig.
  // A quarter-cycle ease out of the static pose joins a full sine sweep with no velocity jump at the turn.
  // Distinct periods/directions keep the room from moving in unison. No animated blur or per-frame layout reads.
  const sweeps = [
    {angle: 7.8, period: 8.6}, {angle: -9.4, period: 10.6}, {angle: 6.4, period: 8.1},
    {angle: -8.2, period: 9.7}, {angle: 8.6, period: 11.1},
  ];
  // The headline catches the two angled beams over it (rigs 2 and 4) as each passes a point 45% into its own sweep:
  // a glint of a second or so that slides across a couple of letters (0.2 line heights per degree of turn), a third
  // or so of the time, never in unison. The centre key light only washes it.
  const sway = mobile ? 0.65 : 1;
  const catchPoint = (i: number) => ({offset: sweeps[i].angle * 0.45 * sway, spread: 1.5 * sway, travel: 0.2});
  const reflection = createHeadlineReflection(hero, mobile, [catchPoint(1), null, catchPoint(3)]);
  const ambient = gsap.timeline({paused: true, onUpdate: reflection.update});
  beamLights.forEach((beam, i) => {
    const {angle, period} = sweeps[i % sweeps.length];
    const amplitude = angle * sway;
    ambient.to(beam, {rotation: amplitude, duration: period / 4, ease: 'sine.out'}, 0)
      .to(beam, {rotation: -amplitude, duration: period / 2, ease: 'sine.inOut', repeat: -1, yoyo: true}, period / 4);
  });

  // The light only runs while it can be seen.
  let visible = true;
  let covered = false;
  let introDone = !playIntro;
  function update() {
    const active = visible && !covered && !document.hidden;
    if (active) crowd?.start(); else crowd?.stop();
    if (active && introDone) ambient.play(); else ambient.pause();
    reflection.update();
    hero!.dataset.ambient = active && introDone ? 'running' : 'paused';
  }
  const observer = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; update();});
  observer.observe(hero);
  document.addEventListener('visibilitychange', update);

  let intro: gsap.core.Timeline | null = null;
  let releaseSkip = () => {};
  if (playIntro) {
    const h1 = q(hero, '.cinema-copy h1');
    const description = q(hero, '.hero-description');
    const decor = [q(hero, '.hero-dots')].filter(Boolean) as HTMLElement[];
    const footItems = qa(hero, '.cinema-foot > *');
    const faded = [header, description, ...decor, ...footItems].filter(Boolean) as HTMLElement[];
    // Opening frame (replaces the pre-paint CSS state without a visible jump).
    gsap.set(faded, {opacity: 0});
    gsap.set(h1, {opacity: 0.12, filter: 'blur(16px)', scale: 1.04});
    gsap.set([beamField, atmosphere], {opacity: 0});
    gsap.set(crowdHost, {opacity: 0, yPercent: 16});
    if (crowd) crowd.energy = 0.15;

    const finish = () => {
      introDone = true;
      markIntroSeen();
      const skipHadFocus = document.activeElement === skip;
      hero.classList.remove('is-intro');
      gsap.set([...faded, h1], {clearProps: 'opacity,transform,filter'});
      gsap.set([beamField, atmosphere, crowdHost], {clearProps: 'opacity,transform'});
      gsap.set(beamRigs, {clearProps: 'transform'});
      if (crowd) crowd.energy = 1;
      releaseSkip();
      if (skipHadFocus) q(hero, '.cinema-foot a')?.focus({preventScroll: true});
      update();
    };
    // Timings measured from the reference (T0 = intro start); see PINTEREST-HERO-REFERENCE.md.
    intro = gsap.timeline({paused: true, onComplete: finish, onUpdate: reflection.update})
      // Preserve the original scene duration after removing the logo badge's 1.0–2.7s tween.
      .to({}, {duration: 2.7}, 0)
      .to(atmosphere, {opacity: 1, duration: 1.6, ease: 'sine.inOut'}, 0.2)
      .to(h1, {opacity: 1, filter: 'blur(0px)', scale: 1, duration: 0.85, ease: 'power1.inOut'}, 1.0)
      .fromTo(description, {y: 12, filter: 'blur(6px)'}, {opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out'}, 1.45)
      .to(header, {opacity: 1, duration: 0.5, ease: 'power1.out'}, 1.5)
      .to(decor, {opacity: 1, duration: 0.6, ease: 'power1.out'}, 1.6)
      .to(footItems, {opacity: 1, duration: 0.5, ease: 'power1.out'}, 1.9)
      .to(skip, {opacity: 0, duration: 0.3}, 2.1)
      .to(beamField, {opacity: 1, duration: 1.3, ease: 'power1.out'}, 0.2)
      .fromTo(beamRigs, {rotation: i => (i % 2 ? 11 : -11)}, {rotation: 0, duration: 1.9, ease: 'power2.out'}, 0.2)
      .to(crowdHost, {opacity: 1, yPercent: 0, duration: 1.5, ease: 'power2.out'}, 0.9)
      .to(crowd ?? {}, {energy: 1, duration: 1.4, ease: 'power1.in'}, 1.2);

    // Start two frames after hydration commits, so start-up work can never swallow the opening.
    let frame = requestAnimationFrame(() => {frame = requestAnimationFrame(() => intro?.play());});
    if (process.env.NODE_ENV !== 'production') (hero as HTMLElement & {heroIntro?: gsap.core.Timeline}).heroIntro = intro; // dev-only: frame-exact verification
    // Skip: the button, any key, wheel or touch finishes the intro instantly.
    const skipNow = () => {if (intro && intro.progress() < 1) intro.progress(1);};
    const events: [EventTarget, string][] = [[window, 'keydown'], [window, 'wheel'], [window, 'touchstart'], [hero, 'pointerdown']];
    skip?.addEventListener('click', skipNow);
    events.forEach(([target, type]) => target.addEventListener(type, skipNow, {passive: true}));
    releaseSkip = () => {cancelAnimationFrame(frame); skip?.removeEventListener('click', skipNow); events.forEach(([target, type]) => target.removeEventListener(type, skipNow));};
  }
  update();

  // Scroll: once fully covered the hero is invisible, so the light sleeps and the layer stops painting.
  const cover = (isCovered: boolean) => {
    covered = isCovered;
    if (layer) gsap.set(layer, {visibility: isCovered ? 'hidden' : 'inherit'});
    update();
  };
  /**
   * Scroll lighting (second reference: light travels as the story moves on). Over the same scrubbed range as the
   * recede: the rigs swing so the beams cross, a soft light sweeps across the room, an ember wash rises from the floor
   * and ceiling, the crowd lifts its energy then recedes into the dark, and the beams dim as the next section arrives.
   * Explicit start values (no immediate render), so the scrub never fights the intro or the ambient sway.
   */
  const sceneLighting = (timeline: gsap.core.Timeline) => {
    // The rigs turn inward, so the beams converge on the section rising into view (rigs left of centre turn right).
    const swing = [-22, -28, 10, 26, 20];
    timeline
      .to(beamLights, {opacity: 1, duration: 0.3, ease: 'power1.out'}, 0)
      .fromTo(beamRigs, {rotation: 0}, {rotation: i => swing[i % swing.length] * (mobile ? 0.7 : 1), duration: 0.8, ease: 'sine.inOut', immediateRender: false}, 0)
      .fromTo(beamField, {opacity: 1}, {opacity: 0.4, duration: 0.45, ease: 'power1.in', immediateRender: false}, 0.55)
      .fromTo(sweep, {xPercent: -140}, {xPercent: 330, duration: 0.9, ease: 'none', immediateRender: false}, 0.05)
      .fromTo(sweep, {opacity: 0}, {opacity: 1, duration: 0.3, ease: 'power1.out', immediateRender: false}, 0.08)
      .to(sweep, {opacity: 0, duration: 0.3, ease: 'power1.in'}, 0.62)
      .fromTo(wash, {opacity: 0}, {opacity: 0.9, duration: 0.55, ease: 'sine.inOut', immediateRender: false}, 0.1)
      .fromTo(crowdHost, {yPercent: 0, opacity: 1}, {yPercent: 12, opacity: 0.5, duration: 1, immediateRender: false}, 0);
    if (crowd) timeline.fromTo(crowd, {energy: 1}, {energy: 1.3, duration: 0.4, ease: 'sine.out', immediateRender: false}, 0)
      .to(crowd, {energy: 0.55, duration: 0.6, ease: 'sine.in'}, 0.4);
  };
  if (!mobile) {
    // CSS (.hero-hold sticky) holds the hero for one viewport while the page rises over it; this scrubs the recede.
    const recede = gsap.timeline({
      onUpdate: reflection.update,
      defaults: {ease: EASE.scrub},
      scrollTrigger: {
        id: 'hero-recede', trigger: hero.parentElement?.classList.contains('hero-hold') ? hero.parentElement : hero,
        start: 'top top', end: () => `+=${hero.offsetHeight}`, scrub: true, invalidateOnRefresh: true,
        onLeave: () => cover(true), onEnterBack: () => cover(false),
      },
    })
      .to(layer, {scale: 0.92, duration: 1}, 0)
      .to(orbit, {scale: 0.92, opacity: 0.3, duration: 1}, 0)
      .to(veil, {opacity: 0.62, duration: 1}, 0)
      .to(copy, {yPercent: -22, opacity: 0, ease: 'power1.in', duration: 0.45}, 0)
      .to(foot, {y: -24, opacity: 0, ease: 'power1.in', duration: 0.2}, 0);
    sceneLighting(recede);
  } else {
    // Phones keep native scrolling: only the measured late copy exit and a gentle media lag.
    const exit = gsap.timeline({
      onUpdate: reflection.update,
      defaults: {ease: EASE.scrub},
      scrollTrigger: {id: 'hero-exit', trigger: hero, start: 'top top', end: 'bottom top', scrub: true},
    })
      .to(layer, {yPercent: 16, duration: 1}, 0)
      .to(orbit, {opacity: 0, duration: 0.6}, 0.1)
      .to(veil, {opacity: 0.45, duration: 1}, 0)
      .to(copy, {yPercent: -14, opacity: 0, ease: 'power1.in', duration: 0.55}, 0.2)
      .to(foot, {opacity: 0, duration: 0.25}, 0);
    sceneLighting(exit);
  }

  // Keyboard users moving back into the hero always see it uncovered and readable.
  function uncover() {
    if (scrollY < 2) return;
    const lenis = getSmoothScroll();
    if (lenis) lenis.scrollTo(0, {immediate: true, force: true});
    else scrollTo({top: 0, behavior: 'instant'});
  }
  hero.addEventListener('focusin', uncover);
  return () => {
    hero.removeEventListener('focusin', uncover);
    document.removeEventListener('visibilitychange', update);
    observer.disconnect();
    releaseSkip();
    ambient.kill();
    reflection.destroy();
    crowd?.destroy();
    gsap.set([beamField, atmosphere, crowdHost, wash, sweep], {clearProps: 'opacity,transform'});
    gsap.set([...beamRigs, ...beamLights], {clearProps: 'transform'});
    html.classList.remove('hero-intro');
    hero.classList.remove('is-intro');
    delete hero.dataset.ambient;
    if (layer) gsap.set(layer, {clearProps: 'visibility'});
  };
}

/**
 * "More than a night out" (#discover): a scoped scene for this section only.
 * 1. Typography arrives when the section does: the index and eyebrow wipe in, then the headline words
 *    rise through their masks in sequence.
 * 2. The film opens from a cropped letterbox to the full-bleed frame (scrubbed) while the footage settles,
 *    and the offset headline line rides the edge of the expanding media.
 * 3. Lights, oversized type, headline and film drift at different depths (the copy and its actions stay put).
 * 4. Desktop pointer: the footage leans toward the pointer, the frame edge catches the light, the round
 *    link is magnetic.
 * 5. Exit: the film sinks back and dims as the next section arrives.
 * Returns a cleanup for listeners; tweens and triggers are reverted with the surrounding context.
 */
function nightOutScene({root, mobile, registry}: Scene) {
  const section = q(root, '.night-out');
  if (!section) return () => {};
  const head = q(section, '.night-out-head');
  const title = q(section, '.night-out-title');
  const stage = q(section, '.night-out-stage');
  const frame = q(section, '.night-out-frame');
  const media = q(section, '.night-out-media');
  const film = q(section, '.night-film');
  const grade = q(section, '.night-out-grade');
  const round = q(section, '.night-out-round');
  const [lightA, lightB] = qa(section, '.night-out-light > span');

  // Plays once without `once: true` (a passed once-trigger kills itself mid-refresh, which can crash GSAP).
  const entrance = gsap.timeline({scrollTrigger: {trigger: head, start: 'top 82%', toggleActions: 'play none none none'}, defaults: {ease: EASE.reveal}})
    .from(q(section, '.night-out-index'), {x: -16, opacity: 0, duration: 0.8, clearProps: 'transform,opacity'}, 0)
    .from(q(section, '.night-out-eyebrow-text'), {clipPath: 'inset(0% 100% 0% 0%)', duration: 1, ease: 'power3.inOut', clearProps: 'clipPath'}, 0.08)
    .from(qa(title, '.nw > span'), {yPercent: 112, rotate: 4, duration: 1.15, stagger: 0.075, clearProps: 'transform'}, 0.2);
  if (head) registry.set(head, [entrance]);

  gsap.timeline({
    defaults: {ease: EASE.scrub},
    scrollTrigger: {id: 'night-out-reveal', trigger: stage, start: 'top bottom', end: mobile ? 'top 28%' : 'top 16%', scrub: true},
  })
    .fromTo(frame, {clipPath: mobile ? 'inset(14% 12% 14% 12%)' : 'inset(24% 26% 24% 26%)'}, {clipPath: 'inset(0% 0% 0% 0%)'}, 0)
    .fromTo(media, {scale: 1.34}, {scale: 1}, 0)
    .fromTo(q(title, '.night-out-line-offset'), {y: mobile ? 18 : 46}, {y: 0}, 0)
    .fromTo(round, {scale: 0.55, rotate: -45}, {scale: 1, rotate: 0, ease: 'power2.out', duration: 0.4}, 0.5);

  const depth = {trigger: section, start: 'top bottom', end: 'bottom top', scrub: true};
  gsap.fromTo(media, {yPercent: -5}, {yPercent: 5, ease: 'none', scrollTrigger: {...depth}});
  if (!mobile) {
    gsap.fromTo(lightA, {yPercent: -14}, {yPercent: 20, ease: 'none', scrollTrigger: {...depth}});
    gsap.fromTo(lightB, {yPercent: 18}, {yPercent: -16, ease: 'none', scrollTrigger: {...depth}});
    gsap.fromTo(head, {y: 40}, {y: -60, ease: 'none', scrollTrigger: {...depth}});
  }

  gsap.timeline({
    defaults: {ease: EASE.scrub},
    scrollTrigger: {id: 'night-out-exit', trigger: stage, start: 'bottom 50%', end: 'bottom top', scrub: true},
  })
    .to(frame, {scale: 0.94}, 0)
    // The handoff to the next section: as the film recedes and darkens, it narrows from the sides and its corners
    // soften, so it settles back into the page instead of being cut off. Only the sides close: the bottom edge stays
    // put, under the round link that sits across it. Explicit start value, no immediate render, so it never fights
    // the entrance's clip-path above.
    .fromTo(frame, {clipPath: 'inset(0% 0% 0% 0% round 0px)'}, {clipPath: mobile ? 'inset(0% 3% 0% 3% round 10px)' : 'inset(0% 4% 0% 4% round 18px)', immediateRender: false}, 0)
    .to(grade, {backgroundColor: 'rgba(9, 11, 13, 0.5)'}, 0); // the page colour (--background) at half strength

  let releasePointer = () => {};
  if (!mobile && frame && film && stage && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const leanX = gsap.quickTo(film, 'x', {duration: 0.9, ease: 'power3.out'});
    const leanY = gsap.quickTo(film, 'y', {duration: 0.9, ease: 'power3.out'});
    const lightX = gsap.quickTo(lightB, 'x', {duration: 1.6, ease: 'power2.out'});
    const pullX = round ? gsap.quickTo(round, 'x', {duration: 0.6, ease: 'power3.out'}) : null;
    const pullY = round ? gsap.quickTo(round, 'y', {duration: 0.6, ease: 'power3.out'}) : null;
    const move = (event: PointerEvent) => {
      const box = frame.getBoundingClientRect();
      const nx = (event.clientX - box.left) / box.width - 0.5;
      const ny = (event.clientY - box.top) / box.height - 0.5;
      leanX(-nx * 26); leanY(-ny * 16); lightX(nx * 90);
      frame.style.setProperty('--px', `${((nx + 0.5) * 100).toFixed(1)}%`);
      frame.style.setProperty('--py', `${((ny + 0.5) * 100).toFixed(1)}%`);
      frame.style.setProperty('--glow', '1');
      if (round && pullX && pullY) {
        const r = round.getBoundingClientRect();
        const dx = event.clientX - (r.left + r.width / 2);
        const dy = event.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < r.width * 1.2;
        pullX(near ? dx * 0.32 : 0); pullY(near ? dy * 0.32 : 0);
      }
    };
    const leave = () => {leanX(0); leanY(0); lightX(0); pullX?.(0); pullY?.(0); frame.style.setProperty('--glow', '0');};
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', leave);
    releasePointer = () => {stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerleave', leave); frame.style.removeProperty('--glow');};
  }
  return releasePointer;
}

/** Sequence B, part 2 — into the night: the purple layer emerges from beneath the photo, at a different depth. */
function nightlifeScene({root, mobile, registry}: Scene) {
  const section = q(root, '.split-feature');
  if (!section) return;
  titleReveal(q(section, ':scope > div:first-child'), {registry});
  const stack = q(section, '.stacked-photo');
  gsap.timeline({
    defaults: {ease: EASE.scrub},
    scrollTrigger: {id: 'nightlife-layers', trigger: stack, start: 'top bottom', end: 'center 45%', scrub: true},
  })
    .fromTo(stack, {'--back': 0}, {'--back': 1}, 0)
    .fromTo(mediaOf(q(stack, '.photo')), {scale: 1.22}, {scale: 1}, 0)
    .fromTo(q(stack, '.photo-tag'), {xPercent: 18, opacity: 0}, {xPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.6}, 0.35);
  if (!mobile) gsap.fromTo(stack, {yPercent: 7}, {
    yPercent: -7, ease: EASE.scrub,
    scrollTrigger: {trigger: section, start: 'top bottom', end: 'bottom top', scrub: true},
  });
}

/** Sequence C — the kitchen and the bar counter-move like two tracks; each image settles while its caption slides over it. */
/** Sequence D, part 1 — the full-bleed specials photo "settles" exactly like the reference's full-bleed media (scale 1.1 → 1 with counter-translate). */
function specialsScene({root, registry}: Scene) {
  const section = q(root, '.special-feature');
  if (!section) return;
  gsap.timeline({
    defaults: {ease: EASE.scrub},
    scrollTrigger: {id: 'specials-settle', trigger: section, start: 'top bottom', end: 'center center', scrub: true},
  })
    // Scale margin always covers the counter-translate, so the frame never shows an empty edge.
    .fromTo(mediaOf(q(section, ':scope > .photo')), {scale: 1.12, yPercent: -5}, {scale: 1, yPercent: 0});
  titleReveal(q(section, '.special-copy'), {registry});
}

/** Sequence D, part 2 — event cards rise at staggered rates and arrive together; dates and links never hide. */
function eventsScene({root, mobile, registry}: Scene) {
  const section = q(root, '.home-events');
  if (!section) return;
  titleReveal(q(section, ':scope > .center-title'), {registry});
  const grid = q(section, '.event-tiles');
  const tiles = qa(grid, '.event-tile');
  tiles.forEach((tile, i) => {
    const scrollTrigger = mobile
      ? {trigger: tile, start: 'top bottom', end: 'top 55%', scrub: true}
      : {trigger: grid, start: 'top bottom', end: 'top 40%', scrub: true};
    gsap.timeline({defaults: {ease: EASE.scrub}, scrollTrigger})
      .fromTo(tile, {y: mobile ? 50 : 90 + i * 55}, {y: 0}, 0)
      .fromTo(mediaOf(q(tile, '.photo')), {scale: 1.18}, {scale: 1}, 0);
  });
  const action = q(section, '.center-action');
  const reveal = gsap.from(action, {y: 18, opacity: 0, duration: 0.7, ease: EASE.entrance, clearProps: 'transform,opacity', scrollTrigger: {trigger: action, start: 'top 95%', once: true}});
  if (action) registry.set(action, [reveal]);
}

/** Sequence E, part 1 — the celebration photo is unmasked from its center while the image settles, leading into the gallery. */
function celebrationScene({root, mobile, registry}: Scene) {
  const section = q(root, '.celebrations');
  if (!section) return;
  const frame = q(section, '.celebration-image .photo');
  gsap.timeline({
    defaults: {ease: EASE.scrub},
    scrollTrigger: {id: 'celebration-unmask', trigger: frame, start: 'top bottom', end: mobile ? 'top 35%' : 'center 55%', scrub: true},
  })
    .fromTo(frame, {clipPath: 'inset(22% 9% 22% 9%)'}, {clipPath: 'inset(0% 0% 0% 0%)'}, 0)
    .fromTo(mediaOf(frame), {scale: 1.3}, {scale: 1}, 0);
  titleReveal(q(section, ':scope > div:last-child'), {registry});
}

/** Sequence F — the journey settles: words only, so reviews, hours and booking actions are immediately usable. */
function closingScene({root, registry}: Scene) {
  const reviews = q(root, '.review-section');
  const script = q(reviews, ':scope > .script');
  if (script) registry.set(script, [gsap.from(script, {y: 16, opacity: 0, duration: 0.7, ease: EASE.entrance, clearProps: 'transform,opacity', scrollTrigger: {trigger: script, start: 'top 92%', once: true}})]);
  qa(reviews, 'blockquote').forEach(quote => lineReveal(quote, {start: 'top 92%', registry}));
  lineReveal(q(root, '.visit h2'), {registry});
}
