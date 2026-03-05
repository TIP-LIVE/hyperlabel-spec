#!/usr/bin/env python3
"""
Analyze transaction screenshots (PNG) in a folder.
Uses OCR to extract date, merchant, amount (GBP) and prints a table + total.

Usage: python analyze_transaction_screenshots.py [folder]
  Default folder: ~/Documents/Transactions

Requires: brew install tesseract  &&  pip install -r requirements-ocr.txt
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from decimal import Decimal

# Default: Documents/Transactions (not tied to any project)
DEFAULT_FOLDER = Path.home() / "Documents" / "Transactions"


def get_ocr_text(image_path: Path) -> str:
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        print("Install OCR deps: pip install Pillow pytesseract", file=sys.stderr)
        print("Also install Tesseract: brew install tesseract", file=sys.stderr)
        raise SystemExit(1) from e
    img = Image.open(image_path)
    return pytesseract.image_to_string(img)


# Common date patterns
DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b"),
    re.compile(r"\b(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})\b"),
    re.compile(r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b", re.I),
]
MONTH = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
         "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

# Time: 16:26 or 12:34
TIME_PATTERN = re.compile(r"\b(\d{1,2}):(\d{2})\b")

# Amount: £12.34 or GBP 12.34 or 12.34 (with 2 decimals)
AMOUNT_PATTERNS = [
    re.compile(r"£\s*(\d+[,.]?\d*)\b"),
    re.compile(r"GBP\s*(\d+[,.]?\d*)\b", re.I),
    re.compile(r"(\d+[.,]\d{2})\s*(?:GBP|£)?\s*$", re.M),
    re.compile(r"\b(\d+[.,]\d{2})\b"),
]


def normalize_date(match, pattern_index: int) -> str:
    if pattern_index == 0:  # DD/MM/YYYY or DD-MM-YYYY
        d, mo, y = match.group(1), match.group(2), match.group(3)
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    if pattern_index == 1:  # YYYY-MM-DD
        y, mo, d = match.group(1), match.group(2), match.group(3)
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    if pattern_index == 2:  # 13 Feb 2026
        d, mo, y = match.group(1), match.group(2).lower()[:3], match.group(3)
        return f"{y}-{MONTH.get(mo, 1):02d}-{int(d):02d}"
    return ""


def parse_amount_raw(s: str) -> Decimal:
    s = s.replace(",", ".")
    return Decimal(s)


def extract_from_text(text: str, image_name: str) -> tuple[str, str, str, Decimal | None]:
    """Returns (date YYYY-MM-DD, time HH:MM, merchant, amount or None)."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    date_str = ""
    time_str = "00:00"
    amount_val: Decimal | None = None
    merchant_candidates: list[str] = []

    # Find date
    for i, pat in enumerate(DATE_PATTERNS):
        m = pat.search(text)
        if m:
            date_str = normalize_date(m, i)
            break
    if not date_str:
        date_str = "—"

    # Find time
    tm = TIME_PATTERN.search(text)
    if tm:
        time_str = f"{int(tm.group(1)):02d}:{tm.group(2)}"

    # Find amount (prefer £ or GBP, then X.XX)
    for pat in AMOUNT_PATTERNS:
        for m in pat.finditer(text):
            raw = m.group(1)
            try:
                val = parse_amount_raw(raw)
                if val > 0 and val < 100_000:
                    amount_val = val.quantize(Decimal("0.01"))
                    break
            except Exception:
                pass
        if amount_val is not None:
            break

    # Merchant: first substantial line that isn't a number and isn't a date
    for ln in lines:
        if not ln or len(ln) < 2:
            continue
        if re.match(r"^[\d\s£.,\-/]+$", ln):
            continue
        if re.match(r"^\d{1,2}[/\-\.]\d", ln) or re.match(r"^\d{4}[/\-\.]\d", ln):
            continue
        if "GBP" in ln.upper() and len(ln) < 20:
            continue
        if ln.lower() in ("date", "merchant", "amount", "total", "balance"):
            continue
        merchant_candidates.append(ln)
    merchant = (merchant_candidates[0][:40] if merchant_candidates else image_name).replace(",", " ")

    return (date_str, time_str, merchant, amount_val)


def main() -> None:
    folder = Path(sys.argv[1]).expanduser().resolve() if len(sys.argv) > 1 else DEFAULT_FOLDER
    if not folder.is_dir():
        print(f"Folder not found: {folder}", file=sys.stderr)
        sys.exit(1)
    pngs = list(folder.glob("*.png")) + list(folder.glob("*.PNG"))
    if not pngs:
        print(f"No PNG files in {folder}", file=sys.stderr)
        sys.exit(1)

    pngs = sorted(set(pngs), key=lambda p: (p.stat().st_mtime, p.name))

    for path in pngs:
        text = get_ocr_text(path)
        date_str, time_str, merchant, amount = extract_from_text(text, path.stem)
        if date_str == "—":
            datetime_part = "—"
        else:
            datetime_part = f"{date_str} {time_str}"
        amount_part = f"-{amount}" if amount is not None else "—"
        print(f"{datetime_part},{merchant},{amount_part}")


if __name__ == "__main__":
    main()
