"""Searches Openverse (api.openverse.org, openly licensed images) for commercial-use, modifiable images and writes
the large results (>= 1600 x 1200) with licence and attribution data. usage: python3 openverse-search.py <out.json> "<query>" ..."""
import json, sys, time, urllib.parse, urllib.request
out, queries = sys.argv[1], sys.argv[2:]
found = {}
for q in queries:
    for page in (1, 2):
        url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({'q': q, 'license_type': 'commercial,modification', 'page_size': 20, 'page': page, 'size': 'large'})
        req = urllib.request.Request(url, headers={'User-Agent': 'openverse-search-script/1.0'})
        try:
            data = json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            print(q, page, 'error', e); continue
        for r in data.get('results', []):
            if (r.get('width') or 0) >= 1600 and (r.get('height') or 0) >= 1200:
                found[r['id']] = {k: r.get(k) for k in ('id', 'title', 'url', 'thumbnail', 'width', 'height', 'license', 'license_version', 'license_url', 'creator', 'creator_url', 'foreign_landing_url', 'source', 'attribution')} | {'query': q}
        time.sleep(1)
    print(q, 'large so far', sum(1 for v in found.values() if v['query'] == q))
json.dump(list(found.values()), open(out, 'w'), indent=1)
print('total', len(found))
