import {HomeHero,HomeAbout,HomeNightlife,HomeFood,SpecialsFeature,CenterTitle,EventTiles,Celebrations,HomeGallery,Reviews} from '@/components/SiteSections';
import {Visit} from '@/components/Sections';
import {Button} from '@/components/ui';
import HomeMotion from '@/components/motion/HomeMotion';
import ExperienceStringsSection from '@/components/strings/ExperienceStringsSection';
import {getVenue,getEvents,getSpecials} from '@/lib/api';
export const revalidate=60;
export default async function Home(){const [venue,events,specials]=await Promise.all([getVenue(),getEvents(),getSpecials()]);return <main id="main" data-home><div className="hero-hold"><HomeHero/></div><div className="scene-cover"><ExperienceStringsSection/><HomeAbout/><HomeNightlife/><HomeFood/><SpecialsFeature specials={specials}/><section className="section home-events"><CenterTitle script="Dates for your diary" title="The night starts here."/><EventTiles events={events.slice(0,3)}/><div className="center-action"><Button href="/events" outline>All Upcoming Events</Button></div></section><Celebrations/><HomeGallery/><Reviews/><Visit venue={venue}/></div><HomeMotion/></main>}
