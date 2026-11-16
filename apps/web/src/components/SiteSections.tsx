import Link from 'next/link';
import {Disc3,Mic2,Trophy,GlassWater} from 'lucide-react';
import {Arrow,Button,Photo,Label} from './ui';
import {HeroOrbit, HeroScene} from './HeroLight';
import NightFilm from './NightFilm';
import HomeGalleryMotion from './HomeGalleryMotion';
import FoodCarousel from './FoodCarousel';
import SignatureShowcase from './SignatureShowcase';
import {foodCategories,featuredItems} from '@/lib/featured';
import LightboxGallery from './LightboxGallery';
import {homeGalleryPhotos} from '@/lib/gallery';
import {guestReviews,type PublicEvent,type SpecialContent} from '@jimmy/shared';
/** The hero: one H1, one line of copy and one booking action (the header keeps its own Book a Table link). The CTA's
 * anchor never moves; only its inner light layer, border catch and arrow respond to hover, focus and the spotlights. */
export function HomeHero(){return <section className="cinema-hero" aria-labelledby="hero-title"><div className="cinema-media" aria-hidden="true"><HeroScene/></div><div className="cinema-shade"/><div className="cinema-veil" aria-hidden="true"/><HeroOrbit/><div className="cinema-composition"><div className="cinema-copy"><h1 id="hero-title"><span className="hero-line"><span className="hero-line-text">DEL MAR.<span className="hero-reflection" aria-hidden="true" data-text="DEL MAR."/></span></span>{' '}<span className="hero-line"><span className="hero-line-text">TURN IT UP.<span className="hero-reflection" aria-hidden="true" data-text="TURN IT UP."/></span></span></h1><p className="hero-description"><span>Come for the drinks. Stay for the music.</span>{' '}<span>Make the night yours.</span></p><Link className="hero-cta" href="/reservations"><span className="hero-cta-light" aria-hidden="true"/><span className="hero-cta-label">Book a Table</span><Arrow dir="up-right" size={17}/></Link></div></div><div className="cinema-foot"><a href="#experience">Discover Jimmy O’s <Arrow dir="down" size={16}/></a></div><button type="button" className="hero-skip">Skip intro</button></section>}
export function CenterTitle({script,title,text,reveal=true}:{script:string;title:string;text?:string;reveal?:boolean}){return <div className="center-title" data-reveal={reveal || undefined}><p className="script">{script}</p><h2>{title}</h2>{text&&<p>{text}</p>}</div>}
/** One headline word inside its reveal mask (static markup: the heading text stays intact for SEO and screen readers). */
const Word=({children}:{children:string})=><span className="nw"><span>{children}</span></span>;
export function HomeAbout(){return <section id="discover" className="night-out" aria-labelledby="night-out-title">
  <div className="night-out-light" aria-hidden="true"><span className="night-out-light-a"/><span className="night-out-light-b"/></div>
  <div className="night-out-head">
    <p className="night-out-eyebrow"><span className="night-out-index" aria-hidden="true"/><span className="night-out-eyebrow-text">A Del Mar original</span></p>
    <h2 id="night-out-title" className="night-out-title"><span className="night-out-line"><Word>More</Word> <Word>than</Word></span>{' '}<span className="night-out-line night-out-line-offset"><span><Word>a</Word> <Word>night</Word></span>{' '}<em><Word>out.</Word></em></span></h2>
  </div>
  <div className="night-out-stage">
    <div className="night-out-frame"><div className="night-out-media"><NightFilm/></div><span className="night-out-grade" aria-hidden="true"/></div>
    <Link className="night-out-round" href="/about" aria-label="Discover the Jimmy O’s story"><Arrow dir="up-right" size={30}/></Link>
  </div>
</section>}
export function HomeNightlife(){return <section className="split-feature section"><div><p className="script">When the sun goes down</p><h2>Find your<br/>other side.</h2><p>Live entertainment, DJs, karaoke and weekend dancing. From the first round to the last song, make a little room for the unexpected.</p><Button href="/nightlife" outline>Inside the Night</Button></div><div className="stacked-photo"><Photo src="gallery-2.jpg" alt="Friends celebrating under red lights at Jimmy O’s"/><span className="photo-tag">Stay a little longer.</span></div></section>}
/** Food & Drinks: the categories carousel, then the signature selections (FOOD-DRINKS-CINEMATIC-EXPERIENCE-REPORT.md). */
export function HomeFood(){return <><FoodCarousel categories={foodCategories} eyebrow="Eat. Drink. Repeat." title="A taste of the good life."/><SignatureShowcase items={featuredItems}/></>}
export function SpecialsFeature({specials}:{specials:SpecialContent[]}){return <section className="special-feature"><Photo src="gallery-3.jpg" alt="A celebration at Jimmy O’s"/><div className="special-overlay"/><div className="section special-copy"><p className="script">A little extra tonight</p><h2>{specials.length?'Make an early night of it.':'Good nights are always on the menu.'}</h2><p>{specials.length?`${specials[0].description} · ${specials[0].priceLabel}. Explore the available dates and times.`:'Our specials change. Check what’s on before you head over.'}</p><Button href="/specials" outline>Explore Specials</Button></div></section>}
export function EventTiles({events}:{events:PublicEvent[]}){return <div className="event-tiles">{events.length?events.map(e=><Link className="event-tile" href={`/events/${e.slug}`} key={e.id}><Photo src={(e.image||'/images/gallery-1.jpg').replace('/images/','')} alt={`${e.name} at Jimmy O’s — venue photograph`}/><div className="event-tile-copy"><time dateTime={e.startsAt}>{new Date(e.startsAt).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',timeZone:'America/Los_Angeles'})}</time><h3>{e.name}</h3><p>{e.description}</p><span>Explore the evening <Arrow dir="up-right" size={18}/></span></div></Link>):<div className="empty-events"><h3>New nights. New memories.</h3><p>There are no announced upcoming events right now. The bar, the music and your people are still a good plan.</p><Button href="/nightlife" outline>Explore Nightlife</Button></div>}</div>}
export function Celebrations(){return <section className="section celebrations"><div className="celebration-image"><Photo src="gallery-7.jpg" alt="A group celebration at Jimmy O’s"/></div><div><p className="script">Make it yours</p><h2>Big moments.<br/>Your people.</h2><p>Birthdays, anniversaries, corporate gatherings and just-because celebrations. Ask us about your own corner of Jimmy O’s.</p><Button href="/private-parties">Plan Your Party</Button><div className="catering-callout"><h3>Take the good food with you.</h3><p>From intimate gatherings to bigger celebrations, let us help with the catering.</p><Link className="text-link" href="/catering">Explore Catering <Arrow dir="up-right" size={18}/></Link></div></div></section>}
export function HomeGallery(){return <HomeGalleryMotion><LightboxGallery photos={homeGalleryPhotos} variant="ring" center={<div className="lens-title">
  <p className="lens-eyebrow"><span>A little look inside</span></p>
  <h2 id="home-gallery-title" className="lens-heading"><span className="lens-line"><Word>The</Word> <Word>nights</Word></span>{' '}<span className="lens-line"><Word>we</Word> <Word>live</Word> <Word>for.</Word></span></h2>
  <Button href="/gallery" outline>Enter the Gallery</Button>
</div>}/></HomeGalleryMotion>}
export function Reviews(){return <section className="section review-section"><p className="script">They say it best</p>{guestReviews.map(r=><figure key={r.author}><blockquote>“{r.quote}”</blockquote><figcaption>{r.author} <span>— {r.platform}</span> <a href={r.reviewUrl} aria-label="View Jimmy O’s on Google Maps"><Arrow dir="up-right" size={17}/></a></figcaption></figure>)}</section>}
/** The four-up "what we do" strip, used on the About and Nightlife pages (the homepage no longer shows it). */
export function ExperienceStrip(){return <div className="experience-strip">{[[Disc3,'DJ experiences'],[Mic2,'Karaoke nights'],[Trophy,'Catch the game'],[GlassWater,'Drinks & good company']].map(([Icon,name])=>{const I=Icon as typeof Disc3;return <span key={String(name)}><I size={22}/>{String(name)}</span>})}</div>}
