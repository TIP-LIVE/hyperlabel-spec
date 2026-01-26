# HyperLabel: Label Lifecycle Review

**Purpose:** Discussion document for Denys & Andrii  
**Date:** January 26, 2026  
**Status:** Draft — needs answers before updating SPEC.md

---

## Current Flow (as documented)

```
MANUFACTURING → INVENTORY → PURCHASE → SHIP TO SHIPPER → ACTIVATE → TRANSIT → DELIVERY → ???
```

---

## 1. Pre-Purchase Phase

| Question | Options | Answer |
|----------|---------|--------|
| **Label state in warehouse?** | Dormant (battery not draining) / Slow drain | |
| **Shelf life before battery degrades?** | 6 months? 1 year? 2 years? | |
| **Inventory location?** | China only / UK warehouse / Both | |
| **QC/Testing before shipping?** | Yes (how?) / No | |

---

## 2. Purchase → Shipper

| Question | Options | Answer |
|----------|---------|--------|
| **Who triggers label shipment?** | Automatic (when shipper enters address) / Manual (HyperLabel team) | |
| **What if shipper never responds to link?** | Timeout after X days? Refund? Re-assign? | |
| **Is label tracked during shipping TO shipper?** | Yes (active) / No (dormant until activation) | |
| **What if label lost in transit to shipper?** | Replacement? Refund? | |

---

## 3. QR Scan vs Activation

**Current confusion:** Two separate steps documented:
- Step 5: Scan QR - Fulfillment Warehouse
- Step 6: Activate & Attach (pull tab)

| Question | Options | Answer |
|----------|---------|--------|
| **What's the exact sequence?** | A: QR scan first → then pull tab | |
| | B: Pull tab first → then QR scan confirms | |
| | C: QR scan = full activation (no separate tab) | |
| **What does QR scan DO technically?** | Links label to shipment? Confirms receipt? Starts tracking? | |
| **What does pulling tab DO technically?** | Connects battery? Starts GPS? | |
| **Can shipper skip QR scan?** | Yes (optional) / No (enforced how?) | |
| **Time allowed between scan and activation?** | Hours? Days? No limit? | |
| **What if scanned but never activated?** | Timeout? Alert? Auto-cancel? | |

---

## 4. Transit Phase — Edge Cases

| Scenario | What happens? | Answer |
|----------|---------------|--------|
| **Battery dies mid-transit** | Last known location shown? Alert sent? | |
| **Label detached/damaged** | How detected? Alert? | |
| **No signal for X days** | "Lost" status? When? | |
| **Cargo route changes unexpectedly** | Alert? (Post-MVP?) | |

---

## 5. Post-Delivery (NEEDS CLARITY)

| Question | Options | Answer |
|----------|---------|--------|
| **When does label STOP transmitting?** | A: Auto after delivery detected | |
| | B: Manual "close shipment" by consignee | |
| | C: When battery dies | |
| | D: After X days of no movement | |
| **What if wrong destination was entered?** | Manual override? Re-enter? | |
| **Who marks shipment "complete"?** | Auto (geofence) / Manual (consignee confirms) / Both | |
| **What happens to physical label after delivery?** | Discard / Return program / E-waste guidance | |

---

## 6. Label States — Proposed

```
┌─────────────────────────────────────────────────────────────────┐
│                        LABEL STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MANUFACTURED                                                    │
│       │                                                          │
│       ▼                                                          │
│  INVENTORY (dormant, in warehouse)                               │
│       │                                                          │
│       ▼                                                          │
│  SOLD (purchased by consignee)                                   │
│       │                                                          │
│       ▼                                                          │
│  PENDING_SHIPPER (waiting for shipper to enter address)          │
│       │                                                          │
│       ├──► EXPIRED_UNUSED (if no response after X days)          │
│       │                                                          │
│       ▼                                                          │
│  SHIPPING_TO_SHIPPER (label in transit to shipper)               │
│       │                                                          │
│       ▼                                                          │
│  RECEIVED (shipper has label, not yet activated)                 │
│       │                                                          │
│       ▼                                                          │
│  QR_SCANNED (shipper scanned QR, confirms receipt)               │
│       │                                                          │
│       ├──► ABANDONED (if not activated after X days)             │
│       │                                                          │
│       ▼                                                          │
│  ACTIVATED (tab pulled, GPS active, attached to cargo)           │
│       │                                                          │
│       ▼                                                          │
│  IN_TRANSIT (cargo moving, label transmitting)                   │
│       │                                                          │
│       ├──► STUCK (no movement >500m for 24h+)                    │
│       │         │                                                │
│       │         ▼                                                │
│       │    RESOLVED (movement resumed)                           │
│       │                                                          │
│       ├──► LOST (no signal for X days)                           │
│       │                                                          │
│       ├──► BATTERY_DEPLETED (battery died mid-transit)           │
│       │                                                          │
│       ▼                                                          │
│  DELIVERED (geofence detected, at destination)                   │
│       │                                                          │
│       ▼                                                          │
│  COMPLETED (shipment closed, tracking stopped)                   │
│       │                                                          │
│       ▼                                                          │
│  ARCHIVED (data retained 30/90 days)                             │
│       │                                                          │
│       ▼                                                          │
│  PURGED (data deleted per retention policy)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Battery States (parallel track):**
```
DORMANT → FULL → OK → LOW_20% → LOW_10% → DEPLETED
```

---

## 7. Summary: Key Decisions Needed

### Must Answer for MVP:

| # | Question | Priority |
|---|----------|----------|
| 1 | QR scan vs tab pull — what's the sequence? | HIGH |
| 2 | When does label stop transmitting? | HIGH |
| 3 | Is label tracked before shipper activates? | MEDIUM |
| 4 | What if shipper never responds? (timeout policy) | MEDIUM |
| 5 | Inventory location — China / UK / Both? | MEDIUM |

### Can Defer to Post-MVP:

| # | Question |
|---|----------|
| 6 | E-waste / disposal guidance |
| 7 | Return program for unused labels |
| 8 | "Lost" detection algorithm |
| 9 | Route deviation alerts |

---

## 8. Hardware Questions for Andrii

| Question | Notes |
|----------|-------|
| **Battery drain in storage?** | How long can label sit in warehouse before battery is affected? |
| **What physically happens when tab is pulled?** | Battery connects? Circuit completes? |
| **Can label be "re-dormant"?** | If activated but never attached, can it go back to sleep? |
| **GPS cold start time?** | How long after activation until first GPS fix? |
| **Minimum transmission interval?** | Can we go lower than 120 min if needed? |

---

## Next Steps

1. Denys + Andrii review this document
2. Fill in "Answer" columns
3. Update SPEC.md with confirmed lifecycle
4. Update platform requirements based on label states

---

*Document created: January 26, 2026*
