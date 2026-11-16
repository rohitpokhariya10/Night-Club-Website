import PageIntro from '@/components/PageIntro';
import {EventTiles,CenterTitle} from '@/components/SiteSections';
import {getEvents} from '@/lib/api';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Upcoming Events','Plan a night out with Jimmy O’s upcoming events and holiday gatherings in Del Mar. Explore event details and request a table.','/events');
export const revalidate=60;
export default async function Page(){const events=await getEvents();return <main id="main"><PageIntro overline="Dates for your diary" title="Make a night of it." description="Holiday gatherings. Coastal nights. Your favorite people. Here’s what’s coming up at Jimmy O’s."/><section className="section"><CenterTitle script="Join us" title="On the calendar."/><EventTiles events={events}/><p className="menu-disclaimer">All dates and times are Pacific Time. Event schedules and holiday hours may change; contact the team with questions.</p></section></main>}
