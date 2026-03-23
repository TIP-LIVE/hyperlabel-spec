#!/usr/bin/env node

/**
 * Creates a "TIP User Research Interview" event on Google Calendar.
 *
 * First run: opens a browser for OAuth consent, saves token for reuse.
 * Usage: node create-calendar-event.mjs
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = join(__dirname, "google-credentials.json");
const TOKEN_PATH = join(__dirname, "google-token.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// ── Event configuration ─────────────────────────────────────────────
// Edit these for each interview you schedule:

const EVENT = {
  summary: "TIP User Research Interview",
  description: `Thanks for agreeing to chat about cargo tracking!

What to expect:
• 45-60 minute conversation about your experience with shipment visibility
• A brief product concept review
• Confidential — nothing attributed to you by name
• £30 Amazon gift card as a thank you

This call will be recorded (with your permission) for note-taking accuracy.
Recordings are only accessible to the TIP research team and deleted within 90 days.

If you need to reschedule, just reply to this invite.

— Denys Chumak, TIP (tip.live)`,
  location: "Zoom (link will be sent separately)",
  // Change these for each interview:
  start: "2026-03-26T10:00:00",
  end: "2026-03-26T11:00:00",
  timeZone: "Europe/London",
  // Attendee email (the interviewee) — leave empty to skip:
  attendeeEmail: "",
  // Add a 15-minute prep reminder:
  reminders: [15, 60],
};

// ── Auth ─────────────────────────────────────────────────────────────

async function authorize() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_id, client_secret } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost:3456"
  );

  // Reuse saved token if available
  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
    oauth2Client.setCredentials(token);

    // Check if token needs refresh
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log("Token expired, refreshing...");
      const { credentials: newToken } = await oauth2Client.refreshAccessToken();
      writeFileSync(TOKEN_PATH, JSON.stringify(newToken, null, 2));
      oauth2Client.setCredentials(newToken);
    }
    return oauth2Client;
  }

  // First-time: open browser for consent
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n🔐 Opening browser for Google sign-in...");
  console.log("If it doesn't open, visit this URL:\n");
  console.log(authUrl);
  console.log("");

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://localhost:3456");
      const authCode = url.searchParams.get("code");
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (authCode) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h2>Authorized! You can close this tab.</h2>");
        server.close();
        resolve(authCode);
      }
    });
    server.listen(3456, () => {
      import("open").then((mod) => mod.default(authUrl));
    });
    server.on("error", reject);
    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for authorization (5 min)"));
    }, 300_000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("✅ Token saved for future use.\n");

  return oauth2Client;
}

// ── Create event ─────────────────────────────────────────────────────

async function createEvent(auth) {
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: EVENT.summary,
    description: EVENT.description,
    location: EVENT.location,
    start: {
      dateTime: EVENT.start,
      timeZone: EVENT.timeZone,
    },
    end: {
      dateTime: EVENT.end,
      timeZone: EVENT.timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: EVENT.reminders.map((mins) => ({
        method: "popup",
        minutes: mins,
      })),
    },
    colorId: "9", // blueberry
  };

  if (EVENT.attendeeEmail) {
    event.attendees = [{ email: EVENT.attendeeEmail }];
    event.sendUpdates = "all"; // sends invite email
  }

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    sendUpdates: EVENT.attendeeEmail ? "all" : "none",
  });

  console.log(`✅ Event created: ${res.data.summary}`);
  console.log(`   ${EVENT.start} — ${EVENT.end} (${EVENT.timeZone})`);
  console.log(`   Link: ${res.data.htmlLink}`);
  if (EVENT.attendeeEmail) {
    console.log(`   Invite sent to: ${EVENT.attendeeEmail}`);
  }

  return res.data;
}

// ── Main ─────────────────────────────────────────────────────────────

try {
  const auth = await authorize();
  await createEvent(auth);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
