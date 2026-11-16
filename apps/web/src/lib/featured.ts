import {fullMenus, type MenuItemContent} from '@jimmy/shared';

/**
 * Homepage Food & Drinks content (FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md).
 *
 * Names and descriptions come from the verified menu records in `packages/shared` (CONTENT-SOURCES.md), so the
 * homepage can never disagree with the menu pages. Detail labels are short phrases taken from each item's own
 * verified description (a browser test checks that every label appears in it); nothing is invented: no prices,
 * allergens, dietary claims or availability.
 *
 * Images: `status` records whether a photograph is an approved client image or a temporary placeholder, and
 * `public/media/featured/ASSET-MANIFEST.md` explains how to replace one. Swapping a photograph only means
 * changing `src` (and `focus`, the CSS object-position of the subject); no animation code depends on it.
 * The shapes below are deliberately plain data so they can later be filled from the CMS.
 */
export type AssetStatus = 'approved' | 'placeholder';
/**
 * Licence attribution for an openly licensed placeholder photograph. It is not shown over the food: the site's legal
 * page lists every credit in full (/privacy#image-credits): title, author, source, licence and the changes made.
 */
export type ImageCredit = {title: string; author: string; license: string; licenseUrl: string; source: string; changes: string};
/**
 * Where the plate (or glass) sits in the photograph, so every dish renders at the same size and turns around
 * its own centre: `size` is its width as a fraction of the image width; `x`/`y` its centre as fractions.
 */
export type PlateGeometry = {size: number; x: number; y: number};
/** `cutout`: the plate has been cut out along its rim (transparent background), so it is shown as an isolated object with its own shadow. */
export type FeaturedImage = {src: string; alt: string; focus: string; status: AssetStatus; width: number; height: number; credit?: ImageCredit; plate?: PlateGeometry; cutout?: boolean};
export type FeaturedLink = {label: string; href: string};

/** Section A: the categories carousel. */
export type FoodCategory = {id: string; label: string; eyebrow: string; title: string; description: string; image: FeaturedImage; cta: FeaturedLink};

/** Section B: one featured dish or drink. */
export type FeaturedItem = {
  id: string;
  /** Verified menu record id in `fullMenus` (packages/shared/src/content.ts). */
  menuId: string;
  category: 'Food' | 'Drinks';
  title: string;
  description: string;
  /** Short phrases from the verified description, shown around the image (four to six read best). */
  labels: string[];
  image: FeaturedImage;
  /**
   * How far the dish turns during a change, in degrees. Top-down shots turn like the reference's plates (90);
   * angled shots swing less, so they read as a plate turning rather than a photograph spinning.
   */
  turn: number;
  cta: FeaturedLink;
};

const menuItem = (id: string): MenuItemContent => {
  for (const category of fullMenus) {
    const item = category.items.find(entry => entry.id === id);
    if (item) return item;
  }
  throw new Error(`Featured item "${id}" is not in the verified menu`);
};
/** The verified description up to its first full stop (add-on lists and sauce lists are left to the menu page). */
const firstSentence = (text: string) => (text.match(/^[^.]*\./)?.[0] ?? text).trim();
const menuCategory = (id: string) => fullMenus.find(category => category.id === id)!;

export const foodCategories: FoodCategory[] = [
  {
    id: 'food',
    label: 'Food',
    eyebrow: 'From the kitchen',
    title: 'Good food. Great company.',
    description: 'Classic burgers, loaded nachos, wings and flatbreads.',
    image: {src: '/images/flatbread.jpg', alt: 'A flatbread topped with tomato, fresh cheese and basil at Jimmy O’s', focus: '50% 45%', status: 'approved', width: 800, height: 800},
    cta: {label: 'Explore the Menu', href: '/food-menu'},
  },
  {
    id: 'drinks',
    label: 'Drinks',
    eyebrow: 'Behind the bar',
    title: 'One more round?',
    description: 'Cocktail pitchers, beer, wine and something to celebrate.',
    image: {src: '/images/gallery-6.jpg', alt: 'Friends at the bar on a lively night at Jimmy O’s', focus: '50% 40%', status: 'approved', width: 800, height: 800},
    cta: {label: 'Find Your Drink', href: '/drink-menu'},
  },
  {
    id: 'after-dark',
    label: 'After Dark',
    eyebrow: menuCategory('after-dark').name,
    title: 'Late-night bites.',
    description: `Wings, mozzarella sticks, nachos, cheeseburgers and the After Hours Platter. ${menuCategory('after-dark').description}`,
    image: {src: '/images/gallery-4.jpg', alt: 'A late-night celebration under the neon sign at Jimmy O’s', focus: '55% 35%', status: 'approved', width: 800, height: 800},
    cta: {label: 'See the After Dark Menu', href: '/food-menu#after-dark'},
  },
];

const featured = (id: string, menuId: string, category: FeaturedItem['category'], labels: string[], image: FeaturedImage, cta: FeaturedLink, turn: number): FeaturedItem => {
  const item = menuItem(menuId);
  return {id, menuId, category, title: item.name, description: firstSentence(item.description), labels, image, cta, turn};
};

export const featuredItems: FeaturedItem[] = [
  featured('classic-burger', 'classic-burger', 'Food',
    ['Beef patty', 'American cheese', 'Crisp lettuce', 'House special sauce', 'Toasted brioche bun', 'Seasoned fries'],
    {src: '/media/featured/classic-burger.jpg', alt: 'Jimmy O’s Classic Burger with seasoned fries on a dark plate', focus: '50% 50%', status: 'approved', width: 800, height: 768, plate: {size: 0.93, x: 0.47, y: 0.5}},
    {label: 'See the Food Menu', href: '/food-menu'}, 16),
  featured('loaded-nachos', 'loaded-nachos', 'Food',
    ['Tortilla chips', 'Cheddar & jack cheese', 'Grilled chicken', 'Black beans', 'Pico de gallo', 'House chipotle crema'],
    {src: '/media/featured/loaded-nachos.webp', cutout: true, alt: 'A plate of loaded nachos with melted cheese, jalapeños, guacamole, salsa and sour cream (illustrative photograph)', focus: '50% 50%', status: 'placeholder', width: 2400, height: 1693, plate: {size: 0.976, x: 0.503, y: 0.522},
      credit: {title: 'Castle, North Acton, London', author: 'Ewan Munro', changes: 'Cropped, colour-graded and cut out along the plate rim. This adaptation is licensed under CC BY-SA 2.0.', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/', source: 'https://commons.wikimedia.org/wiki/File:Castle,_North_Acton,_London_(3316039116).jpg'}},
    {label: 'See the Appetizers', href: '/food-menu#appetizers'}, 16),
  featured('house-wings', 'house-wings', 'Food',
    ['Buffalo', 'BBQ', 'Korean BBQ', 'Sweet Red Chili', 'Parmesan Garlic', 'Celery, carrots, and ranch'],
    {src: '/media/featured/house-wings.webp', cutout: true, alt: 'A plate of glazed, charred chicken wings seen from above (illustrative photograph)', focus: '50% 50%', status: 'placeholder', width: 2600, height: 1828, plate: {size: 0.922, x: 0.489, y: 0.516},
      credit: {title: 'Home-made chicken wings', author: 'JIP', changes: 'Cropped, colour-graded and cut out along the plate rim. This adaptation is licensed under CC BY-SA 4.0.', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', source: 'https://commons.wikimedia.org/wiki/File:Home-made_chicken_wings.jpg'}},
    {label: 'See the Food Menu', href: '/food-menu'}, 90),
  {
    id: 'cocktail-pitchers', menuId: 'cocktail-pitchers', category: 'Drinks',
    title: menuCategory('cocktail-pitchers').name,
    description: 'Margarita, Paloma or Moscow Mule. A round made for sharing.',
    labels: menuCategory('cocktail-pitchers').items.map(item => item.name),
    image: {src: '/media/featured/cocktail-pitchers.jpg', alt: 'A frosted pitcher of margarita over ice on a bar (illustrative photograph)', focus: '50% 40%', status: 'placeholder', width: 2200, height: 2247, plate: {size: 1.55, x: 0.5, y: 0.75},
      credit: {title: 'La Casa Restaurant - September 20 2022 - Sarah Stierch 03', author: 'Missvain', changes: 'Cropped, colour-graded and darkened toward the edges.', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'https://commons.wikimedia.org/wiki/File:La_Casa_Restaurant_-_September_20_2022_-_Sarah_Stierch_03.jpg'}},
    cta: {label: 'See the Drink Menu', href: '/drink-menu#cocktail-pitchers'},
    turn: 12,
  },
];
