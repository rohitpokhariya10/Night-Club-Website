import MenuPage from '@/components/MenuPage';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Food Menu','Explore Jimmy O’s full food menu: appetizers, burgers, tacos, flatbreads, salads and after-dark favorites in Del Mar.','/food-menu','burger.jpg');
export const revalidate=60;
export default function Page(){return <MenuPage kind="FOOD"/>}
