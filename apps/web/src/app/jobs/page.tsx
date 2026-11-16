import ServicePage from '@/components/ServicePage';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Careers','Introduce yourself to the Jimmy O’s Del Mar team. Share your hospitality experience, interests and availability for future opportunities.','/jobs');
export default function Page(){return <ServicePage type="JOB"/>}
