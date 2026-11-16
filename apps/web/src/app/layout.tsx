import type {Metadata} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Motion from '@/components/Motion';
import SmoothScroll from '@/components/motion/SmoothScroll';
import MusicDock from '@/components/music/MusicDock';
import '@/components/music/music.css';
// One type system site-wide (SIL OFL 1.1, self-hosted): Syne for display, Manrope for text. Both are used above
// the fold (hero headline, navigation), so both are preloaded; next/font adds size-adjusted fallbacks to avoid shifts.
const syne=localFont({src:'../../public/fonts/syne-variable-latin.woff2',variable:'--font-syne',weight:'400 800',display:'swap',preload:true,fallback:['Arial']});
const manrope=localFont({src:'../../public/fonts/manrope-variable-latin.woff2',variable:'--font-manrope',weight:'200 800',display:'swap',preload:true,fallback:['Arial']});
const url=process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
// Before first paint: on the homepage's first view in a session (motion allowed), start from the hero intro's opening frame. HomeMotion takes over; a CSS fail-safe reveals everything if JavaScript never runs.
const introScript="try{if(location.pathname==='/'&&matchMedia('(prefers-reduced-motion: no-preference)').matches&&!sessionStorage.getItem('jo-hero-intro'))document.documentElement.classList.add('hero-intro')}catch(e){}";
const description='Coastal California by day. Electric nightlife after dark. Visit Jimmy O’s in Del Mar for food, cocktails, DJs, karaoke and private parties.';
export const metadata:Metadata={metadataBase:new URL(url),title:{default:'Jimmy O’s Del Mar | Coastal Bar & Nightlife',template:'%s | Jimmy O’s Del Mar'},description,alternates:{canonical:'/'},robots:{index:process.env.INDEXING_ENABLED==='true',follow:process.env.INDEXING_ENABLED==='true'},openGraph:{title:'Jimmy O’s — Del Mar After Dark',description,url:'/',siteName:'Jimmy O’s Del Mar',type:'website',images:[{url:'/images/gallery-1.jpg',width:800,height:800,alt:'Jimmy O’s dance floor'}]},twitter:{card:'summary_large_image',title:'Jimmy O’s — Del Mar After Dark',description,images:['/images/gallery-1.jpg']},icons:{icon:'/images/favicon.png'}};
export default function Layout({children}:{children:React.ReactNode}){const schema={'@context':'https://schema.org','@type':'BarOrPub',name:'Jimmy O’s',url,image:`${url}/images/venue.jpg`,telephone:'+1-858-350-3735',email:'chelsea@jodelmar.com',address:{'@type':'PostalAddress',streetAddress:'225 15th Street',addressLocality:'Del Mar',addressRegion:'CA',postalCode:'92014',addressCountry:'US'},hasMenu:`${url}/food-menu`,openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Tuesday','Wednesday','Thursday'],opens:'17:00',closes:'02:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:['Friday','Saturday','Sunday'],opens:'12:00',closes:'02:00'}]};return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:introScript}}/></head><body id="top" className={`${syne.variable} ${manrope.variable}`}><a href="#main" className="skip-link">Skip to content</a><Header/>{children}<Footer/><MusicDock/><SmoothScroll/><Motion/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/></body></html>}
