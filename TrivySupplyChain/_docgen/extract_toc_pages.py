#!/usr/bin/env python3
"""Map each TOC title to its page number in the rendered PDF.
Usage: python extract_toc_pages.py <pdf> <toc_titles.json> <out toc_pages.json>
Uses the LAST page containing the title so the Contents page itself (which lists
every title and comes before all section pages) is never mistaken for the target.
"""
import sys, json, re
from pypdf import PdfReader

pdf, titles_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
titles = json.load(open(titles_path, encoding="utf-8"))
reader = PdfReader(pdf)

def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()

page_texts = [norm(pg.extract_text() or "") for pg in reader.pages]
result = {}
for title in titles:
    nt = norm(title)
    last = None
    for i, pt in enumerate(page_texts):
        if nt and nt in pt:
            last = i + 1            # 1-based page number == footer "Page N"
    result[title] = last

missing = [t for t, p in result.items() if p is None]
json.dump(result, open(out_path, "w", encoding="utf-8"), indent=2)
print(f"mapped {len(result)-len(missing)}/{len(result)} titles; pages found:",
      sorted(set(v for v in result.values() if v)))
if missing:
    print("MISSING:", missing)
