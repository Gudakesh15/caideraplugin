## Product Requirements Document (PRD): Caidera Copilot (Chrome Extension, MV3)

## Overview
**Caidera Copilot** is a simple Manifest V3 Chrome extension that helps users run a first-pass compliance review on marketing, promotional, or medical-style claims directly from any webpage. The extension reads **highlighted text** from the current page, sends it to an **n8n webhook** for analysis, and renders a **structured risk assessment** in a polished popup UI.

## Goals
- **Fast, low-friction flow**: highlight → open popup → click “Check Compliance” → see results.
- **Work on arbitrary webpages** (not site-specific).
- **Clear, hackathon-friendly UI** that communicates risk quickly and provides actionable rewrites.
- **Structured output rendering**: overall risk + flags with details + summary + CTA.
- **Robust states**: empty selection, loading, success, error.

## Non-goals
- Not a legal/compliance approval system; **first-pass only**.
- No user accounts, auth, payments, or history/logging in v1.
- No complex page annotation or inline highlighting on the webpage (popup-only output).
- No multi-model selection or configurable rubric in v1 (backend handles intelligence).

## Target Users / Personas
- **Marketing manager / copywriter**: wants quick feedback before publishing.
- **Growth / performance marketer**: iterates fast and needs “safe enough” copy.
- **Medical / regulated industry marketer**: needs early warnings and suggested rewrites.
- **Founder / hackathon demo audience**: wants a slick “wow” popup experience.

## Core User Flow (MVP)
1. User highlights text on any webpage.
2. User opens extension popup.
3. Popup requests selected text from the active tab.
4. Popup sends POST request to n8n webhook with JSON body: `{ "text": "<selected text>" }`.
5. Backend returns JSON with fields:
   - `overall_risk`
   - `flags` (list)
   - `severity`
   - `risk_type`
   - `reason`
   - `suggested_rewrite`
   - `summary`
   - `cta`
6. Popup renders results with strong visual hierarchy (risk first, then flags, then summary/cta).

## User Stories
- **As a user**, if I haven’t highlighted text, **I see a helpful prompt** to highlight text first.
- **As a user**, I can click **“Check Compliance”** to start analysis.
- **As a user**, I see a **loading state** while the check runs.
- **As a user**, I see a **clear error message** if the request fails or the response is invalid.
- **As a user**, I see the **overall risk prominently** so I can decide quickly if I should revise.
- **As a user**, I can review each flagged phrase with context: phrase, severity, risk type, reason, rewrite.
- **As a user**, I can **copy** suggested rewrites with one click (nice-to-have).
- **As a user**, I see a concise **summary** and an actionable **CTA** at the bottom.

## Functional Requirements

### Extension architecture (Manifest V3)
- Must include these files:
  - `manifest.json`
  - `popup.html`
  - `popup.js`
  - `popup.css`
  - `content.js`
- Must use MV3 conventions.

### Selection capture (content script)
- `content.js` must capture the currently selected text on the page.
- Must support arbitrary webpages.
- Must safely return empty string / null when there is no meaningful selection.

### Popup behavior
- `popup.js` must request selected text from the active tab (via messaging).
- Must show a **helpful empty-selection state** when no text is selected.
- Must provide a **“Check Compliance”** button to trigger the webhook call.
- Must send POST request with JSON:
  - Headers: `Content-Type: application/json`
  - Body: `{ "text": "<selected text>" }`
- Webhook endpoint is defined as a **constant** in `popup.js`.
- Must parse and render JSON response.

### Rendering requirements
- Display **overall risk** prominently (top of popup).
- Display **flags** as cards. Each card shows:
  - **phrase**
  - **severity** (with color-coded badge; preferred)
  - **risk type**
  - **reason**
  - **suggested rewrite** (with copy button; nice-to-have)
- Display **summary** and **CTA** at the bottom.

### States
- **Idle / empty selection**: prompt user to highlight text first.
- **Ready**: selection present, button enabled.
- **Loading**: disable button, show spinner/skeleton, keep UI stable.
- **Success**: render full results.
- **Error**: show error message, allow retry.

## Data Contract

### Request (popup → n8n webhook)
```json
{
  "text": "..."
}
```

### Response (n8n webhook → popup)
Expected JSON containing at minimum:
- `overall_risk`: string or scalar label (e.g., “Low/Medium/High”)
- `flags`: array of objects (see below)
- `summary`: string
- `cta`: string

Each flag object should contain:
- `phrase`: string
- `severity`: string (or enum-like value)
- `risk_type`: string
- `reason`: string
- `suggested_rewrite`: string

**Resilience requirement**: if any field is missing, UI should degrade gracefully (show “—” or omit sections rather than breaking).

## UX / UI Requirements
- **Polished, lightweight, hackathon demo feel**
  - Clean typography, spacing, and modern cards
  - Clear hierarchy: risk → flags → summary/cta
  - Color-coded severity badges
- Popup size should be readable without scrolling too much, but allow scroll for many flags.
- Copy buttons (nice-to-have) should confirm copy success (subtle inline state change).

## Permissions & Security / Privacy
- Permissions should be **minimal** and justified:
  - `activeTab` (to message the current page / read selection)
  - Host permissions as needed for the webhook endpoint
- **Privacy**:
  - Only the **user-selected text** is sent to the backend.
  - No background scraping of page content.
  - No storage of user data in v1.

## Error Handling Requirements
- Network errors (offline, DNS, non-2xx) → show readable error + retry.
- Non-JSON or unexpected JSON → show “Invalid response”.
- Timeout handling (reasonable timeout) → show timeout message.
- If selected text is extremely long → optionally warn or truncate (define max length in v1 to avoid huge payloads).

## Acceptance Criteria (MVP)
- From any webpage, user can highlight text, open popup, click button, and see structured results.
- If no selection, popup shows helpful instruction.
- Webhook request matches required JSON body exactly.
- UI includes loading, success, and error states.
- Flags render as cards with required fields.
- Summary + CTA appear at bottom.
- MV3-compliant and loads successfully in Chrome as an unpacked extension.

## Nice-to-Haves (v1.1 / stretch)
- Copy-to-clipboard buttons for suggested rewrites.
- Severity color system (e.g., Low=green, Medium=amber, High=red).
- “Re-check” without reselecting (reuse last selection shown in popup).
- Simple local history (last N checks) stored in `chrome.storage` (defer unless needed).

## Open Questions / Assumptions (documented, not blocking)
- **Overall risk format**: assumed to be a string label; UI will treat it as display text.
- **Flags shape**: assumed array of objects with the specified fields; UI will be defensive.
- **CORS / permissions**: assumed the extension can POST to the webhook with proper manifest permissions; adjust if the endpoint requires special handling.

