#!/usr/bin/env python3
"""Tek dosyalık HTML üretir.  python3 build.py            -> taktik-ops.html
                              python3 build.py --music    -> taktik-ops-muzikli.html (js/songdata.js gömülü şarkılar varsa)"""
import re, sys, os
music = '--music' in sys.argv
s = open('index.html', encoding='utf-8').read()
def rep(m):
    return '<script>\n' + open(m.group(1), encoding='utf-8').read().replace('</script>', '<\\/script>') + '\n</script>'
if music:
    assert os.path.exists('js/songdata.js'), 'js/songdata.js yok'
    s = s.replace('<script src="js/extras.js"></script>', '<script src="js/songdata.js"></script>\n<script src="js/extras.js"></script>')
s = re.sub(r'<script src="([^"]+)"></script>', rep, s)
out = 'taktik-ops-muzikli.html' if music else 'taktik-ops.html'
open(out, 'w', encoding='utf-8').write(s)
print(out, round(os.path.getsize(out) / 1048576, 1), 'MB')
