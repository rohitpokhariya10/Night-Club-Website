"""Searches Wikimedia Commons (public API, scripted access with a descriptive user-agent) for large photographs and
records licence and attribution, then saves 330px thumbnails for review. Only commercial-use licences are kept
(CC0, public domain, CC BY, CC BY-SA). usage: python3 -I commons-search.py <outDir> "<query>" ..."""
import json, os, re, sys, time, urllib.parse, urllib.request
out, queries = sys.argv[1], sys.argv[2:]
os.makedirs(f'{out}/thumbs', exist_ok=True)
UA = {'User-Agent': 'jimmy-site-asset-search/1.0 (local development script)'}
def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40))
results = []
for q in queries:
    params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': f'filetype:bitmap {q}', 'gsrnamespace': 6, 'gsrlimit': 30,
              'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 330}
    data = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params))
    for p in (data.get('query', {}).get('pages', {}) or {}).values():
        ii = (p.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
        lic = (md.get('LicenseShortName', {}).get('value') or '')
        if ii.get('width', 0) < 1600 or ii.get('height', 0) < 1200: continue
        if not re.search(r'CC0|Public domain|CC BY(-SA)? \d', lic, re.I): continue
        n = len(results)
        thumb = f'{out}/thumbs/{n:03d}.jpg'
        try:
            open(thumb, 'wb').write(urllib.request.urlopen(urllib.request.Request(ii['thumburl'], headers=UA), timeout=40).read())
        except Exception as e:
            continue
        artist = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value') or '').strip()
        results.append({'n': n, 'query': q, 'title': p['title'], 'url': ii['url'], 'page': ii.get('descriptionurl'), 'width': ii['width'], 'height': ii['height'], 'license': lic, 'license_url': md.get('LicenseUrl', {}).get('value'), 'artist': artist[:120]})
        time.sleep(0.2)
    print(q, 'kept so far', len(results))
json.dump(results, open(f'{out}/commons.json', 'w'), indent=1)
