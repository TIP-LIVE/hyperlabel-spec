# Site Content Update Plan — Dispatch-First Mental Model

## Why this exists

The dashboard onboarding was rebuilt around a 6-phase journey model in April 2026 (see `CLAUDE.md` → "First-Impression Journey"). The dashboard now correctly walks users through **Buy → Dispatch → Receive + Activate → Track Cargo**.

But **the rest of the site still describes the product as if labels arrive at the user's address by default and the user immediately sticks them on cargo.** This contradicts the actual product:

- TIP holds labels in a warehouse.
- Users tell TIP where to ship the labels (their office, a forwarder, a supplier, anywhere).
- Receivers physically activate labels and stick them on cargo.
- Receivers may not be the buyer.

This plan lists every place in the codebase that uses the wrong mental model and proposes the fix. Each item is small and independent — they can be done in any order, in any combination, by anyone.

---

## Priority 1 — Materially misleading (do these first)

### 1. `app/src/emails/order-confirmed.tsx` — order confirmation email
**Current copy** (the "What happens next?" section):
1. Your labels are now in your dashboard
2. Create a shipment and assign a label to it
3. Share the tracking link with your shipper
4. Track your cargo in real-time until delivery

**Problem**: Steps 1 and 2 are wrong. Labels are not "in your dashboard" — they're reserved in TIP's warehouse. Step 2 skips the dispatch entirely.

**Proposed copy**:
1. Your order is being prepared in our warehouse
2. **Tell us where to dispatch the labels** — your office, a shipper, a supplier, anywhere
3. We physically ship the labels to that address (3–5 business days)
4. The receiver activates a label and sticks it on the cargo
5. Track door-to-door in real-time

CTA button: change "Go to Dashboard" → "Set Up Dispatch" linking to `/dashboard` (the journey card will route them).

### 2. `app/src/app/(marketing)/page.tsx` — landing page
**Current**: Hero meta description and feature list say "Attach a tracking label to your shipment and follow it from pickup to delivery."

**Problem**: Skips the dispatch step. New visitor thinks they'll receive labels at home and start tracking the next day.

**Proposed**:
- Meta description: "Buy tracking labels, dispatch them to anyone, and follow your cargo door-to-door in 180+ countries."
- Hero subhead: add "We dispatch labels worldwide so you don't have to."
- The 5-feature list ("No Scanners Required" / "30-Second Activation" / etc.) is fine — those describe the label hardware. But add a 6th item: **"Worldwide Dispatch — labels arrive ready-to-use"** so the dispatch step is visible from the homepage.

### 3. `app/src/app/(marketing)/how-it-works/page.tsx`
**Current**: Subtitle says "Five core capabilities that make cargo tracking as simple as sticking a label." Feature 3 ("Instant 30-Second Activation") tagline is "Scan. Peel. Stick. Done."

**Problem**: "Scan. Peel. Stick. Done." erases the dispatch step. The user reading this thinks step 1 is "scan."

**Proposed**:
- Subtitle: "Five core capabilities that make cargo tracking as simple as 1-2-3."
- Add a new feature section at the top of the page: **"Worldwide Dispatch"** explaining that TIP holds the labels and ships them anywhere the buyer asks.
- Rewrite Feature 3 tagline: **"Buy. Dispatch. Activate. Track."** — and update the body copy to walk through all four steps.

### 4. `app/src/components/landing/hero-section.tsx` (and any sub-headline component)
**Action**: Audit hero copy for the "stick a label" framing. The dispatch step should appear above the fold or in the second screen at the latest.

### 5. `app/src/components/landing/landing-faq.tsx`
**Action**: Add (at minimum) these FAQ entries:
- **"Where do my labels arrive?"** → "Wherever you tell us. After purchase, you'll create a Dispatch from your dashboard with the destination address. We ship labels to your office, a forwarder, a supplier — anywhere in the world."
- **"Can I send labels directly to a supplier or shipper?"** → Yes, that's the most common flow. You can also share a link with the receiver so they fill in their own address.
- **"How long until my labels arrive?"** → 3–5 business days from when the dispatch destination is confirmed.
- **"Do I need to be the one who attaches the label?"** → No. Whoever receives the labels can pull the tab and attach them. They don't need a TIP account.

---

## Priority 2 — Misleading dashboard copy

### 6. `app/src/app/(dashboard)/labels/page.tsx`
**Current**: Stat shows "Total Labels" with no distinction between warehouse-resident and physically delivered.

**Proposed**:
- Split into two: **"In dispatch"** (count of `SOLD` labels whose dispatch is `PENDING/IN_TRANSIT`) and **"Ready to use"** (count of labels whose dispatch is `DELIVERED` OR status is `ACTIVE`).
- For each label row, show a status pill: "In warehouse" / "In transit to <address>" / "Ready" / "Tracking <cargo name>" / "Depleted."

### 7. `app/src/app/(dashboard)/dispatch/page.tsx`
**Current empty state**: Description says "Ship labels from your warehouse to customer locations."

**Problem**: "Your warehouse" is wrong — it's TIP's warehouse, not the user's.

**Proposed**: "Tell TIP where to ship your purchased labels. They can go to your office, a forwarder, a supplier — anywhere in the world."

Also reorder buttons: **Create Dispatch** primary, **Buy Labels** secondary (since the user is more likely to be in the "I bought labels, now I need to dispatch them" state when they hit this page).

### 8. `app/src/app/(dashboard)/buy/page.tsx`
**Current sub-header**: "One-time purchase — choose how many labels you need"

**Proposed**: "One-time purchase. After checkout you'll tell us where to ship the labels — your office, a forwarder, or directly to your shipper."

This sets the dispatch expectation at the moment of purchase intent.

### 9. `app/src/app/(dashboard)/orders/page.tsx`
**Current empty state**: "Tracking labels start at $25 each. Order a pack and they'll appear in your dashboard instantly."

**Problem**: "Appear in your dashboard instantly" is technically true (the row exists) but misleading — you can't *use* them until they're dispatched and physically delivered.

**Proposed**: "Tracking labels start at $25 each. After checkout we'll dispatch them anywhere in the world — your office, a forwarder, or your shipper."

### 10. `app/src/components/cargo/create-cargo-form.tsx` (Cargo Name field tooltip)
**Current FieldInfo**: "Include cargo reference or invoice number to identify shipments on your dashboard."

This is fine. But the **Tracking Label** field tooltip says "Select a purchased label to attach to this cargo for real-time tracking." Should clarify: "Select an activated label (one that's been physically delivered and tracking)."

### 11. `app/src/components/dashboard/sidebar-nav.tsx` and `mobile-sidebar.tsx`
The current order is: Dashboard, Track Cargo, Label Dispatch, Labels, Orders, Addresses, Settings, Team.

**Proposed**: Swap "Track Cargo" and "Label Dispatch" so dispatch comes first — it matches the canonical journey order. Many new users will read top-to-bottom and try the first action.

### 12. Dashboard "New Shipment" dropdown — already phase-aware (April 2026), no change needed
(Listed here for completeness so future devs don't "fix" it back to a static order.)

---

## Priority 3 — Tone, microcopy, and asset polish

### 13. `app/src/app/(marketing)/technology/page.tsx`
**CTA**: "Try TIP Today" → "Buy Labels & Set Up Dispatch"

### 14. `app/public/og-image-*.jpg` and social-share images
If any include the slogan "Stick. Track. Done." or similar, regenerate with **"Buy. Dispatch. Track."**

### 15. `app/src/components/landing/marketing-cta.tsx`
Audit for "stick a label" framing. Replace with copy that includes the dispatch step.

### 16. `SPEC.md` use cases
The spec describes UC-CON-14 ("Create Dispatch") as a separate use case from UC-CON-12 ("Create Cargo Shipment"). Add a note to UC-CON-12 that **the dispatch must precede cargo creation** in the typical flow.

### 17. Help docs / API docs page (`app/src/app/docs/api/page.tsx`)
The example payloads don't need to change, but the prose should walk through the dispatch-then-track flow rather than treating them as parallel options.

### 18. New marketing copy needed: a short explainer for "How dispatches work"
**Proposed asset**: a 1-page page at `/how-dispatches-work` (or a section inside `/how-it-works`) that visualizes the warehouse → buyer-defined-address → activation → tracking flow with three illustrations.

---

## Priority 4 — Email templates that mention shipping or labels

Audit all `app/src/emails/*.tsx` templates and reword anywhere they imply the recipient already has labels:

- `order-confirmed.tsx` — see Priority 1, item 1
- `order-shipped.tsx` — should say "Your dispatch is now on its way to <receiver address>"
- `label-activated.tsx` — fine, fires after physical activation
- `consignee-tracking.tsx` — fine, this is for the cargo-tracking link
- `unused-labels-reminder.tsx` — verify the "you bought labels, use them" reminder doesn't assume they're at the user's address. Should probably say "you bought labels, dispatch them or assign them to a cargo shipment"
- `pending-shipment-reminder.tsx` — fine
- `dispatch-details-requested.tsx` (new April 2026) — fine
- `dispatch-details-submitted.tsx` (new April 2026) — fine

---

## Priority 5 — Things that might be wrong but need owner input

### 19. The hero video at `app/public/videos/hero-720p.mp4`
If it shows someone sticking a label on a box as the first frame, the visual story is wrong. Needs new footage or a re-edit that includes the dispatch step.

### 20. The "Try it free" / "Demo mode" path (if any)
Verify the demo mode shows a realistic onboarding journey (with dispatches), not just pre-populated cargo shipments.

### 21. Onboarding email sequence (Resend / drip)
If there's a 7-day drip campaign for new users, verify it walks through Buy → Dispatch → Activate → Track in that order, not the legacy 4-step.

### 22. SPEC.md "Investor narrative"
The investor materials in `/docs/INVESTOR-*.md` might describe the product differently. Verify the dispatch step is mentioned — investors should understand the unit economics include physical fulfillment.

---

## How to verify changes are correct

For each item above, the test is the same:
> **A new visitor with zero context should be able to read the page and correctly answer: "Where do my labels physically arrive?"**

If the answer is "I don't know" or "they appear in my dashboard somehow," the copy is still wrong.

For dashboard pages, use the 6-phase model in `lib/user-phase.ts` as the mental check:
> **For each phase 0-5, does the page tell me a sensible thing to do next?**

---

## Out of scope for this plan (deliberate)

- The activation hardware story (pull tab vs button vs always-on) — that's a product/firmware decision, not a copy decision. Whatever the hardware does, the copy should mirror it.
- Pricing copy — the dispatch model doesn't change pricing, but if shipping cost is bundled vs separate, that's a pricing-page decision.
- The buy page checkout flow — Stripe checkout itself is fine; only the surrounding sub-header copy needs the dispatch hint.
- Anything in `(admin)` routes — admin-only, not a first-impression touchpoint.
