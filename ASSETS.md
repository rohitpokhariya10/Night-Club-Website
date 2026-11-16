# Asset provenance

Retrieved 2026-11-14. All files are stored locally under `apps/web/public/`. No Pinterest or third-party stock imagery is used.

## Venue media

Photographs and logo were retrieved from the official Jimmy O’s website (`https://jimmyodelmar.com/`) and its official menu page (`https://jimmyodelmar.com/food-menu`). They are client-site source assets, not public-domain or independently licensed stock. This authorized redesign reuses the client’s published assets; ownership and transfer/republication rights should be confirmed by the client before production launch. No independent copyright license or model release was supplied.

Visual inspection: `gallery-1.jpg` shows the blue-lit dance floor; `gallery-2.jpg` shows a red-lit crowd and bottle service; `gallery-3.jpg`, `gallery-4.jpg`, `gallery-7.jpg` show celebrations; `gallery-5.jpg` shows the actual exterior; `gallery-6.jpg` shows the bar crowd; `venue.jpg` shows the teal lounge. `hero.jpg` is the official video’s poster showing a cocktail being poured, not a nightclub panorama. Gallery photographs are 800×800 source images; avoid excessive enlargement. `burger.jpg`, `nachos.jpg`, `wings.jpg`, and `flatbread.jpg` are mapped to their menu entries on the official food page.

## Fonts

The four exact filenames named in the brief were absent from the empty workspace. The official site stylesheet explicitly imports Rubik, Rubik Dirt and Kaushan Script from Google Fonts. Current Latin WOFF2 releases of those same families were retrieved, plus the permitted Bebas Neue family. These are matching families, not byte-identical replacements for the missing supplied files. Rubik is variable weight 300–900; the others use weight 400. SIL Open Font License texts are included alongside each font. FontAwesome was not downloaded because the interface uses Lucide icons.

Self-host using `next/font/local` to avoid runtime third-party font requests. Exact original filenames still requiring user supply if byte-identical originals are mandatory: `iJWKBXyIfDnIV7nBrXyw023e.woff2`, `DtVmJxC7WLEj1uIXEWAdilss6yLUrwA.woff2`, `vm8vdRfvXFLG3OLnsO15WYS5DG74wNJVMJ8b.woff2`, `fontawesome-webfont.woff2`.

## Source manifest

| Local file | Source |
|---|---|
| `fonts/bebas-neue.woff2` | https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2 |
| `fonts/bebasneue-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/OFL.txt |
| `fonts/kaushan-script.woff2` | https://fonts.gstatic.com/s/kaushanscript/v19/vm8vdRfvXFLG3OLnsO15WYS5DG74wNI.woff2 |
| `fonts/kaushanscript-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/kaushanscript/OFL.txt |
| `fonts/rubik-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/OFL.txt |
| `fonts/rubik-dirt.woff2` | https://fonts.gstatic.com/s/rubikdirt/v2/DtVmJxC7WLEj1uIXEWAdilss6w.woff2 |
| `fonts/rubik.woff2` | https://fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nBrXw.woff2 |
| `fonts/rubikdirt-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/rubikdirt/OFL.txt |
| `images/burger.jpg` | https://static.spotapps.co/spots/3a/4cbddacfd546589f2347f52f4f90cf/full |
| `images/favicon.png` | https://static.spotapps.co/website_images/ab_websites/208933_website_v1/favicons/favicon-96x96.png |
| `images/flatbread.jpg` | https://static.spotapps.co/spots/0c/2d70b9a3cd4abca545eb9b9c7f867c/full |
| `images/gallery-1.jpg` | https://static.spotapps.co/spots/04/ba0121576c4ac98aab8419bd586480/full |
| `images/gallery-2.jpg` | https://static.spotapps.co/spots/31/15c2f3fc86487c911ee2a282186f8e/full |
| `images/gallery-3.jpg` | https://static.spotapps.co/spots/39/294e5ad9874c3080e53d109ab616a3/full |
| `images/gallery-4.jpg` | https://static.spotapps.co/spots/54/26f0e4a17e49a98ccdb21ad3933994/full |
| `images/gallery-5.jpg` | https://static.spotapps.co/spots/5a/35f71855a640488c462c8ebaa6902f/full |
| `images/gallery-6.jpg` | https://static.spotapps.co/spots/c2/a85cc3e4d9475082770c174522e27e/full |
| `images/gallery-7.jpg` | https://static.spotapps.co/spots/d7/5e85ab90e6497b855d65005d0eb4d2/full |
| `images/hero.jpg` | https://static.spotapps.co/new_website_videos/208933_videos/208933_video_desktop_v1.jpg |
| `images/logo.png` | https://static.spotapps.co/website_images/ab_websites/208933_website_v1/logo.png |
| `images/nachos.jpg` | https://static.spotapps.co/spots/b8/cb563882cf4a0ca0f40e55e1b0cfd1/full |
| `images/venue.jpg` | https://static.spotapps.co/website_images/ab_websites/208933_website_v1/parties_left.jpg |
| `images/wings.jpg` | https://static.spotapps.co/spots/f3/d77129f61f467ab084b343a6d674d5/full |

## Reference limitation

Pinterest reference https://in.pinterest.com/pin/581245895655716859/ was inaccessible through the browsing tool. No attached reference screenshot was supplied. The design follows the written creative brief rather than claiming visual fidelity to that unseen pin.

## Superseding full-site update

The exact four client font files and hero media have since been located. The new site uses the exact supplied Rubik, Rubik Dirt and Kaushan Script binaries. Bebas Neue/Georgia are no longer used. See MEDIA-UPDATE.md for verified metadata, media derivatives and the successfully inspected new Pinterest reference. The earlier missing-font and inaccessible-reference notes above describe the initial phase only.

## November 14, 2026 additions
- **Fonts:** `public/fonts/syne-variable-latin.woff2` (Syne, wght 400–800) and `public/fonts/manrope-variable-latin.woff2` (Manrope, wght 200–800). Latin subsets from Google Fonts, SIL Open Font License 1.1 (`syne-OFL.txt`, `manrope-OFL.txt`), self-hosted with `next/font/local`.
- **Nightlife film:** `public/videos/jimmy-os-nightlife-desktop.mp4` (1280×720) and `jimmy-os-nightlife-mobile.mp4` (640×360), plus the posters `public/images/jimmy-os-nightlife-poster.webp` and `jimmy-os-nightlife-poster-mobile.webp`. A re-encoded cut of the client-supplied `jimmy-os-hero-desktop.mp4` (kept unchanged): bar, guests and cocktail segments only. Made with `scripts/motion/make-section-film.mjs`. See `NIGHT-OUT-SECTION-REPORT.md`.
- **Typography change (gallery and typography redesign):** the site now renders only Syne and Manrope. The client-supplied Rubik, Rubik Dirt and Kaushan Script files are **no longer loaded** but remain in `public/fonts` with their licences, so the change can be reversed. This retires the client's supplied brand faces from the site and should be confirmed with the client. The logo is an image and is unchanged.
- **Homepage gallery:** eight existing, approved photographs (`gallery-1`, `gallery-2`, `gallery-3`, `gallery-5`, `gallery-6`, `hero.jpg`, `venue.jpg`, `nachos.jpg`) with their existing captions. No new imagery. The Pinterest reference video was saved to `artifacts/gallery-reference/media/` for frame analysis only and is not used on the site.
