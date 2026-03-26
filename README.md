# Caidera Copilot (Chrome Extension)

First-pass compliance review for marketing/promotional/medical-style claims directly from any webpage. Highlight text on a page, open the extension popup, and send the selected text to an n8n webhook for a structured risk assessment and suggested rewrites.

## What it does
- **Reads highlighted text** from the active tab
- Sends it to an **n8n webhook** via `POST` JSON: `{ "text": "<selected text>" }`
- Renders a structured response in the popup:
  - **overall risk**
  - **flagged phrases** (severity, risk type, reason, suggested rewrite)
  - **summary** and **CTA**

## Project docs
- **PRD**: `.taskmaster/docs/caidera-copilot-prd.md`

## How to run (Chrome dev mode)
1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select this project folder (the directory that contains `manifest.json`)
5. Pin the extension (optional):
   - Click the puzzle icon → pin **Caidera Copilot**

## How to use
1. Navigate to any webpage
2. Highlight the text you want to review
3. Click the Caidera Copilot extension icon to open the popup
4. Click **Check Compliance**

## Webhook configuration
- The n8n webhook URL is defined as a constant in `popup.js`.
- Update that constant to point at your endpoint before testing.

Expected request body:

```json
{ "text": "..." }
```

Expected response shape (example keys):
- `overall_risk`
- `flags` (array)
- `summary`
- `cta`

Each item in `flags` is expected to include:
- `phrase`
- `severity`
- `risk_type`
- `reason`
- `suggested_rewrite`

## Troubleshooting
- **Popup says “highlight text first”**: make sure you’ve selected text on the page (not just clicked).
- **No response / network error**:
  - Confirm the webhook URL in `popup.js`
  - Check the n8n workflow is active and reachable
  - Check Chrome extension permissions/host permissions allow calling the webhook domain
- **CORS issues**:
  - Prefer configuring the extension’s host permissions to include your webhook domain
  - Ensure the webhook returns appropriate CORS headers for extension requests if needed
- **Works on some sites but not others**:
  - Some pages (e.g., Chrome Web Store, internal `chrome://` pages) block content scripts by design.

