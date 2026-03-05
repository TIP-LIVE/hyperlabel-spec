# Transaction folder — GBP summary

## Option A: Screenshots (PNG) in `Transactions` folder

Put your transaction screenshots in **`HyperLabel/Transactions/`** (capital T), e.g. `IMG_5945.PNG`, `IMG_5946.PNG`, etc.

Then install OCR and run:

```bash
brew install tesseract
pip install -r transaction/requirements-ocr.txt
python transaction/analyze_transaction_screenshots.py
```

Output: table (date | merchant | amount in GBP) + total in GBP (extracted from each screenshot via OCR).

## Option B: CSV files in this folder

Put your transaction CSV(s) in this folder. Expected columns (case-insensitive):

- **date** — any common format (YYYY-MM-DD, DD/MM/YYYY, etc.)
- **merchant** (or `description`, `payee`, `name`) — who you paid
- **amount** — numeric (negative = outflow)
- **currency** (optional) — e.g. GBP, USD, EUR. Default: GBP

Then run:

```bash
python transaction/transactions_to_gbp_table.py
```

Output: table (date | merchant | amount in GBP) + total in GBP.
