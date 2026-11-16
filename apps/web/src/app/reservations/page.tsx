import ServicePage from '@/components/ServicePage';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Reservations','Request a table at Jimmy O’s Del Mar. Share your preferred date, time and party size; the venue will follow up to confirm availability.','/reservations');
export default function Page(){return <ServicePage type="TABLE"/>}
