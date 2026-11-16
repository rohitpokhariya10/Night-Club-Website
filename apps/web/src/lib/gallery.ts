/** Venue-owned media, retained from the original gallery. CMS-ready presentation data. */
export type GalleryPhoto = {id: string; src: string; caption: string; depth?: boolean; shape?: 'landscape' | 'portrait' | 'square'};
export const galleryPhotos: GalleryPhoto[] = [
  {id: 'disco', src: '/images/gallery-1.jpg', caption: 'Under the disco ball', depth: true},
  {id: '15th-street', src: '/images/gallery-5.jpg', caption: 'Your place on 15th Street'},
  {id: 'good-company', src: '/images/gallery-2.jpg', caption: 'A night in good company'},
  {id: 'cocktails', src: '/images/hero.jpg', caption: 'A little something from the bar'},
  {id: 'lounge', src: '/images/venue.jpg', caption: 'Settle into the lounge', depth: true},
  {id: 'celebrate', src: '/images/gallery-3.jpg', caption: 'A reason to celebrate'},
  {id: 'dinner', src: '/images/burger.jpg', caption: 'Dinner plans, sorted'},
  {id: 'bar', src: '/images/gallery-6.jpg', caption: 'Meet us at the bar'},
  {id: 'sharing', src: '/images/nachos.jpg', caption: 'Made for sharing'},
];

/**
 * Homepage ring (GALLERY-REFERENCE-MOTION.md): eight approved venue photographs with their existing captions,
 * in ring order starting at the top and running clockwise. Mixed card proportions, as in the reference: the
 * slots that orbit past the top and bottom of the title (0, 1, 4, 5) are landscape or square, and portrait
 * cards orbit the sides, which keeps the centre clear. The two 16:9 photographs take the landscape cards.
 */
export const homeGalleryPhotos: GalleryPhoto[] = [
  {id: 'home-dancefloor', src: '/images/gallery-1.jpg', caption: 'Dancing at Jimmy O’s', shape: 'square'},
  {id: 'home-cocktails', src: '/images/hero.jpg', caption: 'A little something from the bar', shape: 'landscape'},
  {id: 'home-celebrate', src: '/images/gallery-3.jpg', caption: 'A reason to celebrate', shape: 'portrait'},
  {id: 'home-company', src: '/images/gallery-2.jpg', caption: 'A night in good company', shape: 'square'},
  {id: 'home-food', src: '/images/nachos.jpg', caption: 'Loaded nachos to share', shape: 'square'},
  {id: 'home-lounge', src: '/images/venue.jpg', caption: 'Settle into the lounge', shape: 'landscape'},
  {id: 'home-bar', src: '/images/gallery-6.jpg', caption: 'A lively night at the bar', shape: 'portrait'},
  {id: 'home-exterior', src: '/images/gallery-5.jpg', caption: 'Our spot on 15th Street', shape: 'square'},
];

/**
 * A card's place on the homepage ring as unit-circle coordinates: evenly spaced, clockwise from the top.
 * `turn` rotates the whole ring in degrees (negative = counter-clockwise). Rounded so server and client agree.
 */
export function ringPoint(i: number, count: number, turn = 0) {
  const angle = (i / count) * Math.PI * 2 + (turn * Math.PI) / 180;
  return {cx: Math.sin(angle).toFixed(4), cy: (-Math.cos(angle)).toFixed(4)};
}
