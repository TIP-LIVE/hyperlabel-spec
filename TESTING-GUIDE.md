# TIP — QA Testing Guide

Welcome, and thank you for helping test **TIP** (tip.live). This document walks you through every user-facing feature so you can exercise each one end-to-end and report what feels off.

You don't need any technical background to follow this. Each section describes **what to do**, **what should happen**, and **edge cases worth poking at**.

---

## Table of Contents

1. [About the Product](#1-about-the-product)
2. [Test Environment](#2-test-environment)
3. [What You'll Need Before Starting](#3-what-youll-need-before-starting)
4. [How to Report Issues](#4-how-to-report-issues)
5. [Sign Up & Onboarding](#5-sign-up--onboarding)
6. [Buying Labels](#6-buying-labels)
7. [Label Dispatch — Sending Labels to a Receiver](#7-label-dispatch--sending-labels-to-a-receiver)
8. [Cargo Tracking — Tracking a Shipment](#8-cargo-tracking--tracking-a-shipment)
9. [The Public Tracking Page (Receiver Experience)](#9-the-public-tracking-page-receiver-experience)
10. [Label Management](#10-label-management)
11. [Organization Settings](#11-organization-settings)
12. [Team Management — Inviting Users](#12-team-management--inviting-users)
13. [Account & Profile Settings](#13-account--profile-settings)
14. [Address Book](#14-address-book)
15. [Notification Preferences](#15-notification-preferences)
16. [Email Notifications to Verify](#16-email-notifications-to-verify)
17. [Data Export & Account Deletion](#17-data-export--account-deletion)
18. [Orders & Order History](#18-orders--order-history)
19. [State Transition Reference](#19-state-transition-reference)
20. [Edge Cases & Things to Try Breaking](#20-edge-cases--things-to-try-breaking)
21. [Appendix: Glossary](#appendix-glossary)

---

## 1. About the Product

TIP is a cargo tracking service. The workflow is:

1. Customers **buy IoT tracking labels** online.
2. TIP **dispatches the labels** from its warehouse to wherever the customer tells us (often a different receiver, like a factory).
3. The receiver **sticks the label onto cargo** and activates a shipment.
4. TIP **tracks the cargo door-to-door** using cell-tower triangulation and shows a live dashboard and shareable public link.

There are **two types of shipments** in the system, and this distinction matters throughout testing:

- **Label Dispatch** — TIP shipping empty labels *to* the customer/receiver.
- **Cargo Tracking** — the customer tracking *their own* cargo once the label is in hand.

---

## 2. Test Environment

- **Production URL:** https://tip.live (or https://www.tip.live)
- **Sign-in:** https://tip.live/sign-in
- **Sign-up:** https://tip.live/sign-up

> Production and test environments share the same domain. Please use a **real but disposable email address** so you can actually receive email notifications. Gmail `+` aliases work well (e.g. `youremail+tiptest@gmail.com`).

---

## 3. What You'll Need Before Starting

- A working **email address** (you must receive and read emails we send you).
- A **credit or debit card** for Stripe checkout. Test cards work if we enable test mode for you — otherwise any real card works and you can request a refund after.
- A **mobile phone** or second device — helpful for checking the receiver's public tracking page from a different browser/session.
- A **second email address** — useful for testing receiver flows and team invitations.

---

## 4. How to Report Issues

When you hit a bug or something confusing, please include:

- **URL** of the page where it happened.
- **What you did** (click-by-click).
- **What you expected** to happen.
- **What actually happened** (screenshot or screen recording is gold).
- **Your browser + OS** (e.g. Chrome 128 on macOS).
- **Time of the event** (helps us find it in logs).

Open issues at: **https://github.com/TIP-LIVE/hyperlabel-spec/issues**

Label each issue with the section number from this guide (e.g. "§7 Label Dispatch — receiver address form errors").

---

## 5. Sign Up & Onboarding

### 5.1 Create a new account

1. Go to https://tip.live and click **Sign Up** (or go to `/sign-up`).
2. Enter email + password (or use Google / GitHub SSO if offered).
3. Verify your email (Clerk sends a verification email/code).

**Expected:**
- You land on either the organization-selection screen or the dashboard.
- No errors; the verification email arrives within ~1 minute.

### 5.2 Create an organization

TIP is a B2B product — every user must belong to an **organization** (a company workspace).

1. At the org-selection screen, click **Create Organization**.
2. Enter an org name (e.g. "Acme Logistics Test").
3. Submit.

**Expected:**
- You are redirected to `/dashboard`.
- The org name appears in the top sidebar.

### 5.3 The Onboarding Journey Card

On the dashboard, first-time users see a **4-step journey card**:

1. Buy Labels
2. Dispatch Labels to Receiver
3. Activate + Attach to Cargo
4. Track Cargo

**What to test:**
- The card shows your **current phase** (which step is active).
- As you complete each phase, the active step advances.
- After you have an active cargo shipment, the journey card **hides itself**.

**Edge cases:**
- Refresh the page at each phase — does it still show the right step?
- Does the **"New Shipment"** dropdown order change with your phase? (It should put "Dispatch" first when you haven't dispatched yet, and "Track Cargo" first after you have labels in hand.)

### 5.4 Sign out / sign back in

- Click your profile → **Sign out**.
- Sign back in.

**Expected:** Your org and data are preserved.

---

## 6. Buying Labels

### 6.1 Select a label pack

1. From the dashboard, click **Buy Labels** (or go to `/dashboard/buy`).
2. You'll see three packs:
   - **1 Label** — ~$25
   - **5 Labels** — ~$110 (marked "Most Popular")
   - **10 Labels** — ~$200 (marked "Best Value")

**What to test:**
- All three packs are visible and priced correctly.
- The savings/discount math looks right.
- Clicking a pack opens **Stripe Checkout**.

### 6.2 Complete a checkout

1. Click a pack (e.g. 5 Labels).
2. On the Stripe page, fill in card details.
3. Submit payment.

**Expected:**
- You are redirected to `/checkout/success?session_id=...`.
- Success page shows the number of labels and an order ID.
- You receive an **Order Confirmation email** within ~1 minute.
- The dashboard now shows the labels in your inventory.
- The onboarding journey advances to **Step 2 — Dispatch**.

### 6.3 Cancel a checkout

1. Start a checkout, then click **back** in the browser or Stripe's Cancel link.

**Expected:**
- You land on `/checkout/cancel`.
- **No charge** was made.
- No labels appear in your inventory.

### 6.4 Deep link with a pack pre-selected

Try visiting:
- `/dashboard/buy?pack=starter` (should preselect 1 label)
- `/dashboard/buy?pack=team` (should preselect 5 labels)
- `/dashboard/buy?pack=volume` (should preselect 10 labels)

**Expected:** The corresponding pack is highlighted or checkout auto-starts.

---

## 7. Label Dispatch — Sending Labels to a Receiver

This is how you tell TIP where to physically send the labels you just bought.

### 7.1 Create a new dispatch (you know the receiver's address)

1. Go to `/dashboard/dispatch` → click **New Dispatch** (or use the "New Shipment" dropdown).
2. Select one or more labels from the table.
3. Enter a **Dispatch Name** (e.g. "To Acme Warehouse").
4. Choose **"I'll enter receiver details now"**.
5. Fill in:
   - Receiver first name + last name
   - Receiver email
   - Receiver phone (optional)
   - Address Line 1, Line 2 (optional), City, State, Postal Code, Country
6. Submit.

**Expected:**
- Dispatch is created with status **PENDING**.
- You land on the dispatch detail page.
- The receiver gets a **"Dispatch in Transit" / address-confirmation email**.
- You see the selected labels listed on the dispatch.
- The journey card advances to **Step 2 — Awaiting delivery**.

### 7.2 Create a dispatch (you DON'T know the receiver's address)

This is the **"ask receiver"** flow — very important, test carefully.

1. Start a new dispatch.
2. Select labels, enter a dispatch name.
3. Choose **"I'll ask the receiver to fill in their details"**.
4. Submit.

**Expected:**
- A **share modal** appears with a public tracking link (e.g. `https://tip.live/track/ABC123`).
- You can **copy** the link.
- The dispatch status is **PENDING** with `addressSubmittedAt = null`.
- The journey card shows **"Awaiting receiver details"**.

### 7.3 Send reminder / resend share link

On a pending dispatch awaiting receiver details:

1. Click **Send Reminder** or **Resend Share Link**.

**Expected:**
- The receiver gets an email with the share link.
- A confirmation toast appears.

### 7.4 Edit a dispatch

1. On a PENDING dispatch detail page, click **Edit**.
2. Change the dispatch name, receiver email, or address.
3. Save.

**Expected:**
- Changes persist after refresh.
- You **cannot** edit a dispatch that is already **DELIVERED** or **CANCELLED** (the edit button should be disabled/hidden).

### 7.5 Cancel a dispatch

1. On a PENDING dispatch, click **Cancel**.
2. Confirm.

**Expected:**
- Status changes to **CANCELLED**.
- Labels return to the inventory pool so they can be used on another dispatch.
- You receive a **Dispatch Cancelled** email.
- The dispatch still appears in the list (archived-style), just with CANCELLED status.

### 7.6 What happens during transit

Once TIP scans the labels outbound:

- Dispatch status flips **PENDING → IN_TRANSIT** automatically.
- Location events start flowing in from Onomondo.
- The map on the dispatch detail page shows the live location.
- Receiver gets a **"Dispatch in Transit"** email.

**Test:** Check that the map updates with new location points, and that the location history list shows the journey.

### 7.7 Delivery

When the receiver's location is detected:

- Status flips **IN_TRANSIT → DELIVERED**.
- Receiver gets a **"Dispatch Delivered"** email.
- Journey card advances to **Step 3 — Activate**.

**Edge cases to try:**
- Create a dispatch with **0 labels selected** → should be blocked with an error.
- Create with an **invalid country code** → should be blocked.
- Create with **no receiver email** (ask-receiver mode) → allowed; receiver email is captured when they fill the form.
- Try **editing receiver email** *after* `addressSubmittedAt` is set — does the system flag this as suspicious? (It should send a "details changed" notification.)
- Let a dispatch sit for **more than 14 days** without the receiver filling in the form — the system should auto-cancel it after the expiry (you may need to wait, or ask us to speed the clock up for testing).

---

## 8. Cargo Tracking — Tracking a Shipment

Once a label is physically on your cargo, you use **Cargo Tracking** to monitor the journey.

### 8.1 Create a cargo shipment

1. Go to `/dashboard/cargo` → click **New Cargo Shipment**.
2. Fill in:
   - **Cargo Name** (required, up to 200 chars) — e.g. "Electronics to Berlin warehouse".
   - **Label** (required dropdown) — pick an available label.
   - **Origin Address** (optional).
   - **Destination Address** (optional).
   - **Consignee Email** (optional) — the receiver of the cargo.
   - **Consignee Phone** (optional).
3. Optionally upload cargo photos.
4. Submit.

**Expected:**
- Shipment is created with status **PENDING**.
- Label is marked **ACTIVE**.
- Consignee receives a **"Cargo Tracking Started"** email with a public tracking link.
- Shipment appears on the dashboard map + active list.

### 8.2 Pick a saved address

On the address picker, open the **Saved Addresses** dropdown.

**Expected:** Addresses you saved previously auto-fill the form.

### 8.3 Scan a QR code

On the label dropdown, there's a **Scan QR** button.

**Test:** Use your phone camera / webcam to scan a label's QR code (if printed) — the form should auto-select that label.

### 8.4 Edit a cargo shipment

1. Open a PENDING or IN_TRANSIT shipment.
2. Edit the cargo name, destination, or contact info.
3. Save.

**Expected:** Changes persist. DELIVERED shipments should be read-only.

### 8.5 Cancel a cargo shipment

1. On a PENDING or IN_TRANSIT shipment, click **Cancel**.
2. Confirm.

**Expected:**
- Status → **CANCELLED**.
- The label is released back to usable state (can be reused on a new cargo).
- Consignee gets a cancellation email.

### 8.6 Confirm delivery manually

If auto-delivery detection didn't fire but the cargo has arrived:

1. Open an IN_TRANSIT shipment.
2. Click **Confirm Delivery**.
3. Confirm.

**Expected:**
- Status → **DELIVERED**.
- `deliveredAt` timestamp is set to now.
- Consignee gets a **"Cargo Delivered"** email.

### 8.7 Download the printable label PDF

On any shipment detail page, click **Download Label PDF** (or **Print Label**).

**Expected:** A PDF downloads with the tracking code, QR code, and receiver address.

### 8.8 Share the public tracking link

Click **Copy Share Link** or similar.

**Expected:** The link opens the public `/track/[code]` page (see §9). Open it in an **incognito window** to verify it works without logging in.

### 8.9 Live tracking

Once the label starts reporting:

- The **map** shows the latest location with a blue dot.
- The **location history** list shows all stops, grouped by city, with times.
- Battery % and signal freshness update.
- **Last Update** column on the cargo list stays fresh (should update at least every time the device reports, even if the location didn't change).

**Test:** Watch the dashboard for 10–15 minutes during active shipping; confirm values refresh.

### 8.10 Low battery / no signal alerts

- If battery drops below 20%, a **red badge** appears.
- If the device hasn't reported in > 48 hours, a **"No Signal"** warning appears.
- Appropriate emails should fire (see §16).

---

## 9. The Public Tracking Page (Receiver Experience)

URL pattern: `https://tip.live/track/[shareCode]`

This page works **without login**. A receiver opens it from an email link.

### 9.1 Address-fill state (dispatch, receiver hasn't submitted)

**Expected:** The receiver sees a form asking for their address (first name, last name, address lines, city, state, postal, country). Submitting saves the address, emails both parties, and switches the page to the "waiting for pickup" state.

**Test:**
- Submit valid data → success.
- Submit **missing required fields** → form shows inline errors.
- Submit an **invalid country code** → error.
- Submit on an **expired share link** (> 14 days old) → page shows "Link expired".

### 9.2 In-transit state (dispatch or cargo)

**Expected:**
- Live map with location dot.
- Timeline of locations (city-level).
- Signal freshness indicator.
- ETA if available.

### 9.3 Delivered state

**Expected:**
- "Delivered" confirmation message.
- Final location shown.
- Delivery time.

### 9.4 Share-disabled state

If the owner disables sharing:
- **Expected:** "Tracking is no longer available" message.

### 9.5 Receiver confirms delivery

The public page may have a **"Mark as Delivered"** button for the receiver.

**Test:** Click it → the shipment flips to DELIVERED and the owner gets a notification email.

### 9.6 Unsubscribe from receiver emails

Scroll to the bottom or use the unsubscribe link in any received email (`/track/[code]/unsubscribe?email=...`).

**Expected:**
- Confirmation page appears.
- Future emails to that address for that shipment are suppressed.
- Clicking the unsubscribe link a **second time** should say "already unsubscribed" (not an error).

---

## 10. Label Management

### 10.1 View all labels

Go to `/dashboard/labels`.

**Expected:** A list/table of your labels with columns: Device ID, Status, Battery, Last Activated, Firmware.

### 10.2 Label statuses to understand

- **INVENTORY** — unowned stock in TIP's warehouse.
- **SOLD** — you bought it, but TIP still has it (or it's in transit to you).
- **ACTIVE** — in your hands, attached to cargo, reporting.
- **DEPLETED** — battery exhausted, end of life.

### 10.3 Label filtering

Only labels you can **use** should appear in the cargo-creation dropdown. Specifically:

- `SOLD` labels whose dispatch is `DELIVERED` (they're in your hands).
- `ACTIVE` labels (already tracking).
- **Not** `SOLD` labels still in TIP's warehouse.

**Test:** Verify this filter is correct — warehouse-resident labels must NOT be selectable for cargo creation.

### 10.4 Claim an unclaimed label

If someone shared a claim link with you:

1. On the dashboard, click **Add Existing Labels**.
2. Paste the claim token / code.
3. Submit.

**Expected:**
- The label is added to your inventory.
- If another user tries the same token second → they get a **409 Conflict** error.

---

## 11. Organization Settings

Go to `/dashboard/settings` → **Organization** section (admin-only).

### 11.1 Settings to verify

- **Allow labels in multiple orgs** — toggle. Changing it should persist after refresh.
- **Default Dispatch Address** — dropdown of saved addresses. Setting one should pre-fill the dispatch form next time.
- **No Signal Alert Hours** — number input (default 48). Should accept positive integers.

### 11.2 Manage team

Click **Manage Team** → you land on `/dashboard/settings/organization` which embeds Clerk's org management UI.

**Expected:** You see current members, their roles (admin/member), and invite controls.

---

## 12. Team Management — Inviting Users

### 12.1 Invite a new member

1. At the org management screen, click **Invite member**.
2. Enter email address.
3. Choose role (admin or member).
4. Send invitation.

**Expected:**
- Invitee receives an invitation email from Clerk.
- In your member list, you see the pending invite.

### 12.2 Accept the invite

1. Invitee opens the email, clicks the link.
2. Signs up (or signs in if already has a Clerk account).

**Expected:**
- Invitee lands on the dashboard **inside your org**.
- Invitee sees the same shipments and labels you do (org-scoped data is shared).

### 12.3 Remove a member

1. In member list, click **Remove** next to a member.

**Expected:** Member loses access to the org. Their account still exists globally but can't see this org's data.

### 12.4 Change a role

**Test:** Promote a member to admin, demote an admin to member. Permissions should update — e.g. members shouldn't see admin-only settings.

### 12.5 Switch between organizations

If you belong to multiple orgs, use the org switcher in the sidebar.

**Expected:**
- All data (shipments, labels, addresses, settings) changes when you switch.
- No data from the other org should leak into the current view.

---

## 13. Account & Profile Settings

Go to `/dashboard/settings`.

### 13.1 Profile & Security (Clerk)

An embedded Clerk **UserProfile** panel lets you:

- Change your password.
- Add/remove email addresses.
- Manage active sessions (log out other devices).
- Enable 2FA.

**Test each of these.**

### 13.2 Display info

**Expected:** Your email, name, role badge, and "member since" date display correctly.

---

## 14. Address Book

Go to `/dashboard/address-book` (or the **Saved Addresses** section in settings).

### 14.1 Add an address

1. Click **Add Address**.
2. Fill:
   - **Label** (nickname, e.g. "Berlin Warehouse")
   - **Recipient Name**
   - **Address Line 1**, Line 2 (optional)
   - **City**, State (optional), **Postal Code**
   - **Country** (dropdown)
   - **Is Default?** (checkbox)
3. Save.

**Expected:** Address appears in the list; if marked default, a "Default" badge shows.

### 14.2 Edit / delete an address

- **Edit:** Change fields, save → persisted.
- **Delete:** Confirm → address removed.
- Cannot delete the **default** address unless another one is promoted first (or confirm this is handled gracefully).

### 14.3 Set a different default

**Expected:** Only one address can be default at a time. Setting a new one auto-unsets the previous.

### 14.4 Use addresses in forms

- Create a cargo shipment → open the saved-address picker → selecting an address auto-fills origin/destination.
- Create a dispatch → default dispatch address (from org settings) pre-fills the "ship to" fields.

---

## 15. Notification Preferences

Go to `/dashboard/settings` → **Notifications**.

### 15.1 Available toggles

- **Label Activated**
- **Low Battery**
- **No Signal**
- **Shipment Delivered**
- **Order Shipped**
- **Shipment Stuck**
- **Reminders**

### 15.2 Test each toggle

1. Toggle one **off**.
2. Trigger the corresponding event (if possible — e.g. mark a shipment delivered).
3. Confirm you do **not** receive that email.
4. Toggle it back on and repeat — you should receive the email.

---

## 16. Email Notifications to Verify

Below is every email the system sends. Please verify each fires at the right time and the content is correct (links work, fields are populated, no broken templates).

| # | Email | Triggered When |
|---|-------|----------------|
| 1 | Order Confirmation | After successful Stripe checkout |
| 2 | Order Shipped | When TIP ships labels from warehouse |
| 3 | Order Delivered | When the order reaches the receiver's door |
| 4 | Dispatch Details Requested | When owner sends share link to receiver |
| 5 | Dispatch Details Submitted | When receiver fills in address |
| 6 | Dispatch Address Confirmed | When owner confirms submitted address |
| 7 | Dispatch In Transit | When dispatch enters IN_TRANSIT status |
| 8 | Dispatch Delivered | When dispatch is delivered |
| 9 | Dispatch Cancelled | When owner cancels a dispatch |
| 10 | Label Activated | When a label attaches to cargo and first reports |
| 11 | Consignee Tracking | When a cargo shipment is created, to the consignee |
| 12 | Consignee In Transit | Location updates during cargo transit |
| 13 | Shipment Delivered (consignee) | Cargo delivered confirmation |
| 14 | Shipment Stuck | Alert when no location updates for > 48h (configurable) |
| 15 | Low Battery | When battery drops below 20% |
| 16 | No Signal | When device silent > 48h |
| 17 | Pending Shipment Reminder | Reminder for PENDING shipments without activation |
| 18 | Unused Labels Reminder | If purchased labels aren't used for a while |
| 19 | Label Orphaned | Label reports location without an active shipment |
| 20 | Team Invitation (Clerk) | When admin invites a new user |

**For each email, check:**
- It actually arrives.
- Subject line is clear.
- All dynamic fields (name, city, link) render correctly — no `{{placeholder}}` leakage.
- Links in the email work and go to the right page.
- The **unsubscribe** link works (§9.6).
- Mobile + desktop rendering both look OK (Gmail, Outlook, Apple Mail).

---

## 17. Data Export & Account Deletion

### 17.1 Export your data

Go to `/dashboard/settings` → **Data & Privacy** → **Export Data**.

**Expected:**
- A JSON file downloads.
- It includes all your shipments, orders, cargo, labels, saved addresses, and notification preferences.
- No other org's data leaks in.

### 17.2 Delete your account

**⚠️ Destructive — do this only on a dedicated test account.**

1. At the bottom of settings, find **Danger Zone → Delete Account**.
2. Confirm.

**Expected:**
- Your account is removed.
- All personal data is deleted (shipments, cargo, labels, addresses, notification prefs).
- You are signed out.
- Re-signing-in with the same email should behave as a brand-new user.

---

## 18. Orders & Order History

Go to `/dashboard/orders`.

### 18.1 Order list

**Expected columns:** Date, Quantity, Total, Status (PENDING / PAID / SHIPPED / DELIVERED), Tracking (DHL/FedEx link).

### 18.2 Order detail

Click an order → see the labels allocated to it, status history, shipping info.

### 18.3 Track physical shipment

- Click the **Tracking** link → opens AfterShip or DHL's tracking page.

### 18.4 Empty state

If you have no orders, there should be an empty-state message + **Buy Your First Labels** button.

---

## 19. State Transition Reference

Use this reference when verifying status changes.

### Shipment status (both Cargo and Dispatch)

```
PENDING ──▶ IN_TRANSIT ──▶ DELIVERED   (normal flow)
   │              │
   ▼              ▼
CANCELLED     CANCELLED                (user cancels)
```

- **DELIVERED** and **CANCELLED** are terminal — you cannot edit or transition out of them.
- A direct `PATCH` to DELIVERED (e.g. via browser dev tools) should be **rejected**. Delivery must go through the "confirm delivery" action.

### Label status

```
INVENTORY ──▶ SOLD ──▶ ACTIVE ──▶ DEPLETED
                ▲          │
                └── (released on cancel) ──┘
```

- A label can move back from ACTIVE to SOLD when its shipment is cancelled.
- DEPLETED is terminal.

### Order status

```
PENDING ──▶ PAID ──▶ SHIPPED ──▶ DELIVERED
   │
   ▼
CANCELLED
```

---

## 20. Edge Cases & Things to Try Breaking

This is where we really need your creativity — please be adversarial.

### Input validation

- Extremely long cargo names (> 200 chars) → should be rejected.
- Non-Latin characters in names and addresses (Cyrillic, Arabic, Chinese) → should work fine.
- Emoji in names 🚀📦 → should work or be cleanly stripped.
- Invalid email format → rejected.
- Invalid country code (e.g. `XX`) → rejected.
- Negative / zero quantities in checkout → rejected.
- Latitude > 90 or < -90, longitude > 180 or < -180 → rejected.

### Concurrency

- Open the same shipment in two browser tabs; edit in one, refresh the other — do you see stale data or a clean update?
- Two users in the same org edit the same shipment at once — does the second save overwrite, warn, or conflict?
- Try claiming the same label from two browsers simultaneously — exactly one should succeed, the other should see a 409 Conflict.

### Authorization

- Log in as User A, copy a shipment URL. Log in as User B in an incognito window and paste the URL → should get a 403 / 404.
- Same with label URLs, dispatch URLs, order URLs.
- Try accessing `/dashboard/...` while signed out → should redirect to sign-in.
- Try a public `/track/[code]` with a **made-up** code → should show "not found".

### Time-based behavior

- **Manufacturing cooldown:** A newly auto-registered label shouldn't create location history for the first 24 hours. Wait it out if you can.
- **Dispatch share-link expiry:** A blank dispatch should auto-cancel after 14 days; day 7 should trigger a reminder email.
- **No-signal alert:** A device silent for > 48h should raise a warning (configurable per org).

### Browser / device

- Test on **mobile** (iOS Safari, Android Chrome) — all forms and the map should work.
- Test on **small viewports** (resize to 375px wide).
- Test in **dark mode** (system preference) — no hardcoded colors should break.
- Test with the browser **back button** mid-flow (during checkout, during dispatch creation) — state should be sane.

### Network conditions

- Slow 3G simulation (Chrome DevTools) — forms should still submit, not double-submit.
- Submit a form, go offline, come back online — no zombie state.

### Copy & UX polish

- Every error message should be human-readable, not a raw stack trace.
- Empty states should make sense for a first-time user.
- Tooltips (`FieldInfo` components) should render correctly on both hover (desktop) and tap (mobile).
- Sidebar nav and mobile sidebar should stay in sync — if a link is added to one and not the other, flag it.

---

## Appendix: Glossary

| Term | Meaning |
|------|---------|
| **Label** | A physical IoT tracking sticker with a SIM card inside. Reports location via cell towers. |
| **Cargo** | The goods being tracked. A label sits on cargo. |
| **Cargo Tracking** (shipment type) | A shipment representing the customer's own cargo being tracked. |
| **Label Dispatch** (shipment type) | A shipment representing TIP sending labels to a customer/receiver. |
| **Consignee** | The person receiving the cargo (different from the buyer). |
| **Receiver** | The person receiving a label dispatch (often the same as the consignee, but not always). |
| **Organization / Org** | A company workspace. Most data is scoped to an org. |
| **Share Code** | A unique token in public tracking URLs (`/track/[code]`). |
| **Claim Token** | A token that lets someone claim an unclaimed label. 48-hour expiry. |
| **ICCID** | Unique ID for a SIM card. Labels are identified by this. |
| **IMEI** | Unique ID for the physical device (not used for label routing). |
| **Cell Tower Triangulation** | Locating a device by which mobile towers it's connected to. |
| **Onomondo** | TIP's cellular connectivity provider — sends location webhooks. |
| **Phase 0 / 1 / 2 / 3 / 4 / 5** | Stages of user onboarding, driving which "Journey Card" step is active. |
| **PENDING / IN_TRANSIT / DELIVERED / CANCELLED** | Shipment status values. |
| **INVENTORY / SOLD / ACTIVE / DEPLETED** | Label status values. |

---

**Thank you for testing TIP! 🙌**

Please file issues at **https://github.com/TIP-LIVE/hyperlabel-spec/issues** with the section number from this guide. If anything in this document is unclear or out of date, that's a bug too — please tell us.
