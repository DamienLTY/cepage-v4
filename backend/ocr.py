#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ocr.py — Reconnaissance optique de caractères pour étiquettes de vins

Lance PaddleOCR, EasyOCR et Tesseract en parallèle, retourne le meilleur résultat.
"""

import re
import base64
import logging
import tempfile
import os
import concurrent.futures
from typing import Optional, Dict, Any

from flask import jsonify

log = logging.getLogger("backend")


def ocr_parallel(image_b64: str):
    """Lance les 3 OCR en parallèle et retourne le meilleur résultat (Flask Response)."""
    img_bytes = base64.b64decode(image_b64)

    # Améliorer l'image avant OCR
    try:
        import io
        from PIL import Image, ImageEnhance
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = ImageEnhance.Contrast(img).enhance(1.8)
        img = ImageEnhance.Sharpness(img).enhance(1.5)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=95)
        img_bytes = buf.getvalue()
    except Exception as e:
        log.warning(f"[OCR] Image preprocessing failed: {e}")

    results = []

    def validate_ocr_result(wine_name, vintage, all_text, engine) -> Optional[Dict]:
        if not wine_name or len(wine_name) < 4:
            return None
        text_lower = wine_name.lower()
        wine_keywords = ['chateau', 'château', 'domaine', 'cru']
        if any(kw in text_lower for kw in wine_keywords):
            return {"ok": True, "text": wine_name, "vintage": vintage, "all_text": all_text, "engine": engine}
        if vintage and len(wine_name) >= 6:
            return {"ok": True, "text": wine_name, "vintage": vintage, "all_text": all_text, "engine": engine}
        return None

    # ── 1. PaddleOCR ─────────────────────────────────────────────
    def run_paddleocr():
        try:
            from paddleocr import PaddleOCR
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
                f.write(img_bytes)
                tmp_path = f.name
            ocr = PaddleOCR(lang='fr', use_angle_cls=True, show_log=False)
            result = ocr.ocr(tmp_path, cls=True)
            os.unlink(tmp_path)
            if not result or not result[0]:
                return None
            texts = [(line[1][0], line[1][1]) for line in result[0]]

            def _norm(s):
                s = s.lower().strip()
                for old, new in [('â','a'),('à','a'),('é','e'),('è','e'),('ê','e'),
                                  ('î','i'),('ô','o'),('ù','u'),('û','u'),('ç','c')]:
                    s = s.replace(old, new)
                return s

            chateau_keywords = ['chateau', 'château', 'domaine', 'cru']
            wine_name = None
            for text, conf in texts:
                if any(kw in _norm(text) for kw in chateau_keywords):
                    wine_name = text.strip()
                    break
            if not wine_name:
                for text, conf in texts:
                    ts = text.strip()
                    if ts.isdigit() and 1900 <= int(ts) <= 2030:
                        continue
                    if len(ts) >= 3:
                        wine_name = ts
                        break
            if not wine_name:
                wine_name = texts[0][0]

            full_text = ' '.join([t[0] for t in texts])
            vintages  = re.findall(r'\b(19\d{2}|20[0-2]\d)\b', full_text)
            vintage   = max(int(y) for y in vintages) if vintages else None
            all_text  = ' | '.join([t[0] for t in texts[:5]])
            return validate_ocr_result(wine_name, vintage, all_text, 'paddleocr')
        except Exception as e:
            log.warning(f"[OCR Parallel] PaddleOCR failed: {e}")
            return None

    # ── 2. EasyOCR ───────────────────────────────────────────────
    def run_easyocr():
        try:
            import easyocr
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
                f.write(img_bytes)
                tmp_path = f.name
            reader  = easyocr.Reader(['fr', 'en'], gpu=False, verbose=False)
            res     = reader.readtext(tmp_path, detail=1, paragraph=False)
            os.unlink(tmp_path)

            def bbox_area(bbox):
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                return (max(xs) - min(xs)) * (max(ys) - min(ys))

            good = [(bbox, text, conf) for bbox, text, conf in res if conf > 0.15 and len(text.strip()) > 1]
            chateau_keywords = ['chateau', 'château', 'domaine', 'cru']
            wine_name = None
            for bbox, text, conf in good:
                if any(kw in text.lower().strip() for kw in chateau_keywords):
                    wine_name = text.strip()
                    break
            if not wine_name:
                good.sort(key=lambda x: bbox_area(x[0]), reverse=True)
                wine_name = good[0][1].strip() if good else None
            if not wine_name:
                return None

            all_texts = [t[1] for t in good]
            full_text = ' '.join(all_texts)
            vintages  = re.findall(r'\b(19\d{2}|20[0-2]\d)\b', full_text)
            vintage   = max(int(y) for y in vintages) if vintages else None
            all_text  = ' | '.join(all_texts[:5])
            return validate_ocr_result(wine_name, vintage, all_text, 'easyocr')
        except Exception as e:
            log.warning(f"[OCR Parallel] EasyOCR failed: {e}")
            return None

    # ── 3. Tesseract ─────────────────────────────────────────────
    def run_tesseract():
        try:
            import io
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(img, lang='fra+eng')
            if not text or not text.strip():
                return None
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            chateau_keywords = ['chateau', 'château', 'domaine', 'cru']
            wine_name = None
            for line in lines:
                if any(kw in line.lower() for kw in chateau_keywords):
                    wine_name = line
                    break
            if not wine_name:
                for line in lines:
                    if line.isdigit() and 1900 <= int(line) <= 2030:
                        continue
                    if len(line) >= 4:
                        wine_name = line
                        break
            if not wine_name:
                return None
            vintages = re.findall(r'\b(19\d{2}|20[0-2]\d)\b', text)
            vintage  = max(int(y) for y in vintages) if vintages else None
            return validate_ocr_result(wine_name, vintage, text[:200], 'tesseract')
        except Exception as e:
            log.warning(f"[OCR Parallel] Tesseract failed: {e}")
            return None

    # ── Lancer en parallèle et choisir le meilleur ────────────────
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = [executor.submit(run_paddleocr), executor.submit(run_easyocr), executor.submit(run_tesseract)]
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception:
                pass

    if results:
        priority = {'paddleocr': 0, 'easyocr': 1, 'tesseract': 2}
        results.sort(key=lambda x: priority.get(x['engine'], 3))
        log.info(f"[OCR Parallel] Best result: {results[0]['text']!r} from {results[0]['engine']}")
        return jsonify(results[0])

    log.error("[OCR Parallel] All OCRs failed to find valid result")
    return jsonify({
        "ok": True,
        "text": "",
        "vintage": None,
        "all_text": "",
        "engine": "none",
        "needs_manual": True,
        "error": "Impossible de reconnaître l'étiquette. Veuillez saisir le nom manuellement."
    })
