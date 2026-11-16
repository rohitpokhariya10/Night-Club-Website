import Image from 'next/image';
import Link from 'next/link';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,ArrowUpRight} from 'lucide-react';
export type ArrowDirection='right'|'up-right'|'up'|'left'|'down';
const ARROWS={right:ArrowRight,'up-right':ArrowUpRight,up:ArrowUp,left:ArrowLeft,down:ArrowDown};
/**
 * A directional arrow. When the link or button around it is hovered (with a fine pointer) or keyboard-focused, it
 * moves the way it points and eases back afterwards; it never moves while that control is disabled, on touch, or
 * with reduced motion. Pure CSS (`.arw` in globals.css): no event handlers, and it works in server components.
 */
export function Arrow({dir,size,className=''}:{dir:ArrowDirection;size?:number;className?:string}){const Icon=ARROWS[dir];return <Icon size={size} className={`arw ${className}`.trim()} data-arrow={dir} aria-hidden="true" focusable="false"/>}
export function Button({href,children,outline=false}:{href:string;children:React.ReactNode;outline?:boolean}){return <Link className={`button ${outline?'outline':''}`} href={href}>{children}<Arrow dir="up-right" size={17}/></Link>}
export function Photo({src,alt,className='',priority=false,sizes='(max-width: 700px) 100vw, 50vw'}:{src:string;alt:string;className?:string;priority?:boolean;sizes?:string}){return <div className={`photo ${className}`}><span className="photo-media"><Image src={`/images/${src}`} alt={alt} fill sizes={priority?"100vw":sizes} quality={65} priority={priority} fetchPriority={priority?"high":undefined}/></span></div>}
export function Label({children}:{children:React.ReactNode}){return <p className="eyebrow"><span aria-hidden="true">✦</span> {children}</p>}
