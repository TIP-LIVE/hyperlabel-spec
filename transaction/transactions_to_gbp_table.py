#!/usr/bin/env python3
"""
Read CSV(s) from the transaction folder, convert amounts to GBP, output:
  date | merchant | amount (GBP)
  + total in GBP
"""
from __future__ import annotations

import csv
import re
from pathlib import Path
from decimal import Decimal

# Approximate rates to GBP (adjust or use API for live rates)
RATES_TO_GBP = {
    "GBP": Decimal("1"),
    "USD": Decimal("0.79"),
    "EUR": Decimal("0.86"),
}

SCRIPT_DIR = Path(__file__).resolve().parent


def parse_amount(s: str) -> Decimal:
    s = (s or "0").strip().replace(",", "")
    s = re.sub(r"[^\d.-]", "", s)
    return Decimal(s) if s else Decimal("0")


def parse_date(s: str) -> str:
    """Normalise to YYYY-MM-DD for sorting/display."""
    s = (s or "").strip()
    # DD/MM/YYYY or DD-MM-YYYY
    m = re.match(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", s)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    # YYYY-MM-DD
    if re.match(r"\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    return s


def find_columns(row: list[str]) -> dict[str, int]:
    header = [c.strip().lower() for c in row]
    col = {}
    for name, idx in [("date", "date"), ("merchant", "merchant"), ("description", "merchant"),
                      ("payee", "merchant"), ("name", "merchant"), ("amount", "amount"),
                      ("currency", "currency"), ("currency code", "currency")]:
        try:
            i = header.index(name)
            col[idx] = i
        except ValueError:
            pass
    # If no merchant, use first non-date non-amount column
    if "merchant" not in col and "amount" in col and "date" in col:
        for i, h in enumerate(header):
            if h not in ("date", "amount", "currency") and "amount" not in h:
                col["merchant"] = i
                break
    return col


def row_to_gbp(cols: dict[str, int], row: list[str]) -> tuple[str, str, Decimal] | None:
    if "date" not in cols or "amount" not in cols or "merchant" not in cols:
        return None
    try:
        date_s = row[cols["date"]] if cols["date"] < len(row) else ""
        merchant = row[cols["merchant"]] if cols["merchant"] < len(row) else ""
        amount_s = row[cols["amount"]] if cols["amount"] < len(row) else "0"
        currency = (row[cols["currency"]] if cols.get("currency") is not None and cols["currency"] < len(row)
                   else "GBP").strip().upper() or "GBP"
    except IndexError:
        return None
    amount = parse_amount(amount_s)
    rate = RATES_TO_GBP.get(currency, RATES_TO_GBP["GBP"])
    gbp = (amount * rate).quantize(Decimal("0.01"))
    return parse_date(date_s), (merchant or "—"), gbp


def main() -> None:
    rows_out: list[tuple[str, str, Decimal]] = []
    for path in sorted(SCRIPT_DIR.glob("*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if not header:
                continue
            cols = find_columns(header)
            for row in reader:
                if not row:
                    continue
                r = row_to_gbp(cols, row)
                if r:
                    rows_out.append(r)

    rows_out.sort(key=lambda x: (x[0], x[1]))

    # Table header
    print("| date       | merchant        | amount (GBP) |")
    print("|------------|-----------------|--------------|")
    total = Decimal("0")
    for date, merchant, gbp in rows_out:
        total += gbp
        merchant_short = (merchant[:15] + "…") if len(merchant) > 15 else merchant
        print(f"| {date} | {merchant_short:<15} | {gbp:>12} |")
    print("|------------|-----------------|--------------|")
    print(f"| **Total**  |                 | **{total:>10}** |")
    print()
    print(f"Total (GBP): {total}")


if __name__ == "__main__":
    main()
