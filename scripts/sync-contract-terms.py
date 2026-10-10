"""Snapshot published service clauses into the downloadable contract. Run after terms edits."""
from html.parser import HTMLParser
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
class TermsParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.sections=[]; self.active=False; self.part=None
    def handle_starttag(self, tag, attrs):
        if tag=='section' and 'prose-section' in dict(attrs).get('class','').split():
            self.active=True; self.current={'title':'','text':''}
        if self.active and tag in ('h2','p'): self.part='title' if tag=='h2' else 'text'
    def handle_data(self, text):
        if self.active and self.part: self.current[self.part]+=text
    def handle_endtag(self,tag):
        if tag in ('h2','p'): self.part=None
        if tag=='section' and self.active:
            self.sections.append(self.current); self.active=False
parser=TermsParser(); parser.feed((ROOT/'dist/terms.html').read_text())
if len(parser.sections)<10: raise RuntimeError('Expected all published service clauses')
(ROOT/'dist/contract-terms.js').write_text('// Generated from terms.html by npm run sync:terms. Keep this snapshot in the signed PDF.\nexport const TERMS = '+json.dumps(parser.sections,ensure_ascii=False,indent=2)+';\n')
