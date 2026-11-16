# Revised media and font verification

Verified November 14, 2026.

## Design reference

The new Pinterest pin https://in.pinterest.com/pin/387309636709751076/ was inaccessible to the web extraction tool, but its official HTML and Open Graph preview image were recovered and visually inspected. Reference preview used only for analysis, not copied into public site assets. The original rebuild translated its navy-purple photographic backgrounds, inset hero photo with overlapping headline, purple outlined controls, script overlines, large atmospheric script and asymmetric gallery into the Jimmy O’s identity. The subsequent [hero and gallery upgrade](HERO-GALLERY-UPGRADE.md) removes the inset hero photo and overlapping composition in favor of a full-viewport video. It does not reproduce the reference’s invented events, team, testimonials or content.

## Exact client fonts

All four exact files were found in Downloads and copied into `apps/web/public/fonts`. Fontkit metadata was inspected:

| File | Family | Weight | Usage |
|---|---|---|---|
| iJWKBXyIfDnIV7nBrXyw023e.woff2 | Rubik (family metadata: Rubik Light) | Variable 300–900 | Body, forms, prices, UI |
| DtVmJxC7WLEj1uIXEWAdilss6yLUrwA.woff2 | Rubik Dirt | Regular 400 | Navigation, menu item names, selected subheadings |
| vm8vdRfvXFLG3OLnsO15WYS5DG74wNJVMJ8b.woff2 | Kaushan Script | Regular 400 | Headings and handwritten accents |
| fontawesome-webfont.woff2 | FontAwesome | Regular 400 | Retained, not loaded; Lucide supplies interface icons |

Exact files are loaded with `next/font/local`; Bebas Neue and Georgia are no longer used. Earlier downloaded font files are retained as historical assets but unused. Rubik source and destination SHA-256 matched: `99ec7ccb40cf143f977c893649deece6cc2dcc7c0ff82ebf84b6584090f207ea`.

The original live site was inspected with Playwright: body computed Rubik 400, heading computed Kaushan Script with a theme-requested weight of 500. Its CSS specifies Rubik Dirt for navigation/subheadings. Kaushan Script has only a supplied regular face; the new site uses genuine 400 rather than synthetic 500. OFL family license texts remain in the font directory. Client-provided font assets should retain their applicable license.

## Hero video

- `public/videos/jimmy-os-hero-desktop.mp4`: supplied file copied unchanged; 1280×720 H.264, 24fps, 14.13 seconds, approximately 3 MB; no audio stream.
- `public/videos/jimmy-os-hero-mobile.mp4`: derivative of the supplied clip; 640×360 H.264, 24fps, 14.13 seconds, approximately 0.8 MB; no audio stream.
- `public/images/jimmy-os-hero-poster.webp`: 1280×720 poster extracted from the supplied clip.
- `public/images/jimmy-os-hero-poster-mobile.webp`: supplied 640×360 poster from Downloads.

The poster is server-rendered using Next optimized picture sources. Video is deferred until the hero is visible, muted, inline and looping, with no hero controls as requested. Reduced-motion and connection Save-Data preferences prevent video creation. If playback is unavailable, the poster remains visible. The film fades in on the playing event and pauses outside the viewport or in hidden tabs. Background footage uses object-fit cover and never delays headline rendering.

All other venue, gallery and food image provenance remains in ASSETS.md. Those originals are generally 800px; high-resolution client originals would improve large displays. Client media rights and consent remain a launch review item. No unlicensed Pinterest imagery is deployed.
