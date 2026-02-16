# TIP: Questions for Andrii
**Meeting Date:** January 27, 2026  
**Purpose:** Clarify label lifecycle & hardware details

---

## PRIORITY 1: Hardware & Activation

### Q1: What happens when the tab is pulled?
**Context:** We have two steps documented — QR scan and tab pull. Need to understand the physical/technical sequence.

**Draft answers:**
- A) Tab connects battery → label powers on → starts transmitting immediately
- B) Tab connects battery → label waits for QR scan to start transmitting
- C) Tab just removes physical protection, battery was always connected

**Andrii's answer:** _______________

---

### Q2: What is the correct activation sequence?
**Context:** Current spec has "Scan QR" as step 5 and "Activate & Attach" as step 6. Is this correct?

**Options:**
- A) QR scan first (in app) → then pull tab (physical) → label starts
- B) Pull tab first → then QR scan confirms activation
- C) QR scan IS the activation (no separate tab mechanism)
- D) Pull tab IS the activation (QR scan is just for linking to shipment)

**Andrii's answer:** _______________

---

### Q3: Battery drain in storage — what's the shelf life?
**Context:** Labels sit in warehouse before purchase. How long can they sit?

**Draft answers:**
- A) Battery is disconnected until tab pulled — unlimited shelf life
- B) Small drain — 1 year shelf life
- C) Small drain — 2 years shelf life

**Andrii's answer:** _______________

---

### Q4: GPS cold start time?
**Context:** After activation, how long until first GPS fix?

**Draft answers:**
- A) ~30 seconds (warm start, has almanac)
- B) 1-2 minutes (cold start)
- C) Up to 5 minutes in difficult conditions

**Andrii's answer:** _______________

---

### Q5: Can we reduce transmission interval below 120 minutes?
**Context:** Current spec says 120 min. What's the minimum?

**Draft answers:**
- A) Yes, down to 15 min (but battery life drops to ~15 days)
- B) Yes, down to 30 min (battery life ~30 days)
- C) 120 min is the minimum for 60-day battery life

**Andrii's answer:** _______________

---

## PRIORITY 2: Logistics & Inventory

### Q6: Where is label inventory stored?
**Context:** Spec says "China warehouse" but also mentions "UK warehouse". Clarify.

**Options:**
- A) China only — all labels ship from China
- B) UK warehouse (pre-stocked) for UK/EU customers, China for others
- C) Both — depends on customer location

**Andrii's answer:** _______________

---

### Q7: Who handles label shipping to shippers?
**Context:** After consignee buys and shipper enters address, who ships the label?

**Options:**
- A) UTEC handles fulfillment
- B) 3PL partner (DHL Supply Chain, etc.)
- C) Hybrid — UTEC for now, 3PL when we scale

**Andrii's answer:** _______________

---

### Q8: Is label tracked during shipping TO shipper?
**Context:** Before shipper activates, can we track where the label package is?

**Options:**
- A) Yes — label is active (dormant mode, low frequency)
- B) No — label is off until tab pulled
- C) No — but we use carrier tracking (DHL/FedEx tracking number)

**Andrii's answer:** _______________

---

## PRIORITY 3: Edge Cases

### Q9: What if battery dies mid-transit?
**Context:** Label has 60-day battery. What if shipment takes longer?

**Draft answers:**
- A) Last known location shown, status = "Battery Depleted"
- B) Alert sent at 20%, 10%, then final "depleted" alert
- C) Nothing we can do — that's why we have Extended SKU (90-day) for long voyages

**Andrii's answer:** _______________

---

### Q10: Can label go back to "sleep" after activation?
**Context:** If shipper activates but doesn't attach to cargo, can we save battery?

**Options:**
- A) No — once activated, always on until battery dies
- B) Yes — app has "pause tracking" button
- C) Auto-sleep if no movement for X hours

**Andrii's answer:** _______________

---

### Q11: What if label is lost/damaged mid-transit?
**Context:** How do we detect this?

**Draft answers:**
- A) No signal for 48h+ → status = "Lost"
- B) No signal for 7 days → status = "Lost"
- C) Manual — consignee reports issue

**Andrii's answer:** _______________

---

## PRIORITY 4: Post-Delivery

### Q12: When does label STOP transmitting?
**Context:** After cargo delivered, does label keep transmitting?

**Options:**
- A) Auto-stop after delivery detected (geofence)
- B) Auto-stop after 24h at destination with no movement
- C) Keeps transmitting until battery dies
- D) Manual — consignee clicks "Complete Shipment"

**Andrii's answer:** _______________

---

### Q13: E-waste / disposal — any guidance needed?
**Context:** Label contains battery and electronics. Any special disposal?

**Options:**
- A) Regular trash — battery is small, no special handling
- B) E-waste guidance in quick-start guide
- C) Return program (future)

**Andrii's answer:** _______________

---

## SUMMARY TABLE

| # | Question | Andrii's Answer |
|---|----------|-----------------|
| 1 | Tab pull — what happens? | |
| 2 | Activation sequence? | |
| 3 | Shelf life? | |
| 4 | GPS cold start time? | |
| 5 | Min transmission interval? | |
| 6 | Inventory location? | |
| 7 | Who ships to shippers? | |
| 8 | Tracked before activation? | |
| 9 | Battery dies mid-transit? | |
| 10 | Can label sleep after activation? | |
| 11 | Lost/damaged detection? | |
| 12 | When stop transmitting? | |
| 13 | E-waste guidance? | |

---

## After Meeting: Next Steps

1. Update `SPEC.md` with confirmed answers
2. Update `LABEL-LIFECYCLE-REVIEW.md` status
3. Define label state machine based on answers
4. Update HTML spec overview

---

*Prepared: January 26, 2026*
