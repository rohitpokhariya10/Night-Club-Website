import Image from 'next/image';
import Link from 'next/link';
import {Arrow} from './ui';
import {venue} from '@jimmy/shared';

/**
 * The site's closing signature: logo and tagline, the venue's address, phone and email, then a slim row with
 * the copyright, privacy policy and back to top. Compact by design. Navigation lives in the header, and hours
 * and booking live on the homepage "Find your way here" section and the Contact page.
 * Server-rendered and complete without JavaScript; lib/motion/footerScene.ts adds a subtle reveal.
 */

/** Same destination as the homepage "Find your way here" section. */
const DIRECTIONS = 'https://www.google.com/maps/search/?api=1&query=Jimmy+O%27s+225+15th+Street+Del+Mar';
const [STREET, ...LOCALITY] = venue.address.split(', ');

export default function Footer() {
  return <footer className="footer">
    <div className="ft-main">
      <div className="ft-brand">
        <Link href="/" className="ft-logo"><Image src="/images/logo.png" alt="Jimmy O’s Del Mar" width={160} height={77} /></Link>
        <p className="ft-tagline">Coastal California by day.<br />Electric nightlife after dark.</p>
      </div>
      <address className="ft-contact">
        <div className="ft-item">
          <span className="ft-label">Visit</span>
          <a className="ft-link" href={DIRECTIONS}><span>{STREET}, {LOCALITY.join(', ')}</span><Arrow dir="up-right" size={14} /></a>
        </div>
        <div className="ft-item">
          <span className="ft-label">Call</span>
          <a className="ft-link" href="tel:+18583503735"><span>{venue.phone}</span></a>
        </div>
        <div className="ft-item">
          <span className="ft-label">Email</span>
          <a className="ft-link" href={`mailto:${venue.email}`}><span>{venue.email}</span></a>
        </div>
      </address>
    </div>
    <div className="ft-legal">
      <span>© {new Date().getFullYear()} Jimmy O’s Del Mar</span>
      <Link className="ft-quiet" href="/privacy">Privacy Policy</Link>
      <a className="ft-quiet ft-top" href="#top">Back to top<Arrow dir="up" size={14} /></a>
    </div>
  </footer>;
}
