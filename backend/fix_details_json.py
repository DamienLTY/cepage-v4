#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch scraper.py : wraps all plain string values passed as 'details'
in scrape_log SQL statements with json.dumps() so PostgreSQL JSONB accepts them.
"""
import re, sys

path = 'scraper.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. INSERT tuples: ('type', 'datetime', 'running', 'plain string')
#    -> ('type', 'datetime', 'running', json.dumps('plain string'))
def fix_insert_details(m):
    global fixes
    val = m.group(1)
    if val.startswith('json.dumps'):
        return m.group(0)
    fixes += 1
    return f", json.dumps('{val}'))"

content = re.sub(
    r",\s*'((?:Démarrage\.\.\.|Recherche vins[^']*|Aucun candidat)[^']*?)'\s*\)",
    fix_insert_details,
    content
)

# 2. UPDATE tuples ending with str(e), log_id)
def fix_str_e(m):
    global fixes
    fixes += 1
    return m.group(1) + 'json.dumps(str(e))' + m.group(2)

content = re.sub(r'(,\s*)str\(e\)(,\s*log_id\))', fix_str_e, content)

# 3. UPDATE tuples ending with f'N vins de M producteurs...', log_id)
def fix_fstring_details(m):
    global fixes
    fstr = m.group(1)
    suffix = m.group(2)
    if fstr.startswith('json.dumps'):
        return m.group(0)
    fixes += 1
    return f', json.dumps({fstr}){suffix}'

content = re.sub(
    r",\s*(f'[^']*(?:vins|corrigés|scrapés|producteurs)[^']*')(,\s*log_id\))",
    fix_fstring_details,
    content
)

# 4. Remaining: (datetime, 'done', plain_string, log_id) or (datetime, f'error:...', str, log_id)
def fix_update_done(m):
    global fixes
    val = m.group(1)
    suffix = m.group(2)
    if val.startswith('json.dumps'):
        return m.group(0)
    fixes += 1
    return f", json.dumps({val}){suffix}"

content = re.sub(
    r",\s*('(?:done|running|error[^']*)'|f'[^']*')(,\s*log_id\))",
    fix_update_done,
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done: {fixes} remplacements effectués.")
