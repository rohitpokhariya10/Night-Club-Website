import PageIntro from '@/components/PageIntro';
import LightboxGallery from '@/components/LightboxGallery';
import {Button} from '@/components/ui';
import {pageMeta} from '@/lib/seo';
export const metadata=pageMeta('Gallery','Take a look inside Jimmy O’s Del Mar. Explore real venue, food, bar and nightlife photographs from our coastal neighborhood spot.','/gallery');
export default function Page(){return <main id="main"><PageIntro overline="Through our lens" title="Wish you were here." description="A look at the place, the people, the plates and the nights that make Jimmy O’s." image="gallery-5.jpg"/><section className="section gallery-page"><div className="center-title gallery-heading"><p className="script">The good times, captured</p><h2><span className="gallery-title-text">Every picture has a story.</span></h2></div><LightboxGallery/><div className="center-action"><Button href="/reservations" outline>Be Part of the Next One</Button></div></section></main>}
