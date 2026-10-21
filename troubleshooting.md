# Troubleshooting Guide: n8n AI Content Automation

This guide addresses common errors, UI quirks in n8n Cloud, credential obstacles, and runtime edge cases encountered when building and executing this workflow.

---

## 🔍 Issue 1: "The Chat Model Sub-Node `+` Button Did Not Open in Basic LLM Chain"

### 💡 Why this happens in n8n Cloud / n8n Canvas:
1. **Modal Conflict vs. Canvas Connection**: In n8n's UI, the *Basic LLM Chain* node has internal parameters that open when double-clicked. If you try to click the small sub-node connector `+` while the node parameter drawer is open, or while zooming/panning, the canvas event handler can fail to open the sub-node selector popover.
2. **Sub-Node Port Separation**: In LangChain nodes, regular inputs/outputs are on the horizontal left and right sides (circles). Sub-nodes (Model, Memory, Output Parser, Tools) connect at the bottom sockets labeled `Model`, `Memory`, etc. Sometimes the tooltip or the small `+` icon renders behind neighboring nodes or doesn't register clicks if the canvas zoom is not at 100%.

### 🛠️ Solutions & Workarounds:

#### Workaround A: Use the Pre-Built Workflow JSON (Easiest)
When you import [`ai-content-automation.json`](file:///c:/Users/SPECTRE/AI-Automation/Content-Automation-sys/ai-content-automation.json), the connection is already configured programmatically:
```json
"Google Gemini Chat Model": {
  "ai_languageModel": [
    [
      {
        "node": "Basic LLM Chain",
        "type": "ai_languageModel",
        "index": 0
      }
    ]
  ]
}
```
You don't need to click the `+` button at all—the model node will already be attached directly beneath the Basic LLM Chain!

#### Workaround B: Drag and Connect Manually from the Node Library
If building from scratch manually:
1. Do **not** rely on the `+` button on the node socket.
2. Instead, open the right-side/top-right **Nodes panel** (click the big `+` icon in the upper right corner of n8n).
3. Search for **Google Gemini Chat Model** (or `Gemini`).
4. Drag and drop the **Google Gemini Chat Model** node onto the canvas directly below your *Basic LLM Chain*.
5. Drag a connector line from the top output port of the *Google Gemini Chat Model* node into the bottom `Model` socket of the *Basic LLM Chain* node until it snaps into place.

#### Workaround C: Canvas Zoom Reset
Press `Ctrl + 0` (or `Cmd + 0` on Mac) to reset the canvas zoom to 100%, deselect all nodes by clicking on empty canvas space, and then try clicking the socket again.

---

## 🔍 Issue 2: Google Sheets Authentication & Permission Errors

### Symptoms:
- Error: `403 Forbidden: The caller does not have permission`
- Error: `Could not find spreadsheet`
- Error: `Access denied to Google Drive scope`

### Causes & Fixes:
1. **Missing Google Drive Permission**:
   - When authenticating via Google OAuth2, Google Sheets requires both the **Google Sheets API** and the **Google Drive API** (read/search permission) to list spreadsheets in the dropdown.
   - **Fix**: Re-authenticate the Google Sheets credential and make sure to check all boxes on the Google consent screen (including permission to see and edit your Google Drive files).
2. **Spreadsheet Created in a Different Google Account**:
   - If your browser is logged into multiple Google profiles (e.g., school/work and personal), n8n might authenticate account A while the sheet was created in account B.
   - **Fix**: Open the Google Sheet, click **Share**, and grant `Editor` access to the email address connected in n8n. Alternatively, paste the exact Spreadsheet ID (from the URL: `/spreadsheets/d/<SPREADSHEET_ID>/edit`) by toggling the Document field from **List** to **By ID**.

---

## 🔍 Issue 3: LLM Rate Limits & Quota Exhaustion (HTTP 429)

### Symptoms:
- Error: `429 Too Many Requests`
- Error: `Resource has been exhausted (e.g. check quota)`

### Causes & Fixes:
1. **Using Depleted n8n Gateway Credits**:
   - If using n8n's built-in gateway credits, you may have reached the trial tier limit.
   - **Fix**: Switch to the **Google Gemini Chat Model** node with your own free API key from [Google AI Studio](https://aistudio.google.com).
2. **Gemini Free Tier RPM (Requests Per Minute) Limit**:
   - Google AI Studio's free tier has an RPM limit (typically 15 requests/minute). If you click **Test workflow** multiple times in rapid succession, you will trigger a temporary 60-second cooldown.
   - **Fix**: Wait 30 seconds before re-testing. For production batch processing, add a `Wait` node between iterations.

---

## 🔍 Issue 4: Malformed JSON or Markdown Fences from the LLM

### Symptoms:
- The output in Google Sheets contains ````json ... ```` instead of pure fields.
- JSON parsing error: `SyntaxError: Unexpected token '` in JSON at position 0`.

### Why this happens:
Even when prompted to return only JSON, LLMs often wrap responses in Markdown code fences (````json { ... } ````) or include polite introductory text ("Here is your draft:").

### How the Included Code Node Solves This:
The **Normalize & Structure Output** node includes regex sanitization and fallback error handling:
```javascript
// Clean markdown fences if the model returned ```json ... ```
if (typeof rawText === 'string') {
  rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
}

let parsed = {};
try {
  parsed = typeof rawText === 'object' ? rawText : JSON.parse(rawText);
} catch (error) {
  // Graceful fallback to prevent workflow failure
  parsed = {
    caption: rawText.trim(),
    hashtags: '#Promotion #SpecialOffer',
    call_to_action: 'Check out our latest update!'
  };
}
```
This guarantees the workflow never crashes, regardless of model quirks.

---

## 🔍 Issue 5: Google Sheets Column Mismatches

### Symptoms:
- Data is written to the wrong columns or an empty row is created.
- Columns like `created_at` or `call_to_action` remain blank in the spreadsheet.

### Causes & Fixes:
1. **Header Name Spelling**:
   - Google Sheets column matching is case-sensitive and whitespace-sensitive.
   - If the sheet header says `Created At` or `call to action` (with spaces) instead of `created_at` or `call_to_action` (with underscores), auto-mapping will skip it.
   - **Fix**: Check row 1 of your sheet against [`google-sheets-template.csv`](file:///c:/Users/SPECTRE/AI-Automation/Content-Automation-sys/google-sheets-template.csv). The exact headers are:
     ```text
     created_at,topic,platform,audience,tone,caption,hashtags,call_to_action,status
     ```
2. **Data Mapping Mode**:
   - If **Auto-Map Input Data** is not finding headers, switch **Data Mode** to **Map Each Column Below**, click **Add Field**, and manually map each field using n8n expressions (e.g., `{{ $json.caption }}`).
