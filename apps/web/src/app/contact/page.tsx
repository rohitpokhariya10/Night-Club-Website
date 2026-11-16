import PageIntro from '@/components/PageIntro';
import InquiryForm from '@/components/InquiryForm';
import {Button,Photo} from '@/components/ui';
import {getVenue} from '@/lib/api';
import {venueContent} from '@jimmy/shared';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Contact & Location','Find Jimmy O’s at 225 15th Street, Del Mar, California. View opening hours, get directions, call the team or send a message.','/contact','gallery-5.jpg');
export default async function Page(){const venue=await getVenue();return <main id="main"><PageIntro overline="See you on 15th Street" title="Find your way here." description="In the heart of Del Mar. A little closer to your next good night." image="gallery-5.jpg"/><section className="section service-layout"><div className="service-story"><p className="script">Come on over</p><h2>Jimmy O’s Del Mar</h2><address>{venue.address}<br/>United States</address><a className="contact-link" href="tel:+18583503735">{venue.phone}</a><a className="contact-link" href={`mailto:${venue.email}`}>{venue.email}</a><div className="actions"><Button href={venueContent.directionsUrl}>Get Directions</Button><Button href="/reservations" outline>Book a Table</Button></div><h3>Opening hours</h3>{venue.hours.map(h=><div className="hours" key={h.days}><span>{h.days}</span><span>{h.hours}</span></div>)}<p className="muted">All hours are Pacific Time. Holiday hours may vary.</p><Photo src="venue.jpg" alt="The lounge at Jimmy O’s"/></div><InquiryForm type="GENERAL"/></section></main>}
