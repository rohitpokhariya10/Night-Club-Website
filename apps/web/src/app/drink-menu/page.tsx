import MenuPage from '@/components/MenuPage';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Drink Menu','Find your next round at Jimmy O’s Del Mar: bottled and draft beer, wine, bubbles, cocktail pitchers and cocktail trees.','/drink-menu','hero.jpg');
export const revalidate=60;
export default function Page(){return <MenuPage kind="DRINK"/>}
