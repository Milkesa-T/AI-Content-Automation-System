# AI Content Automation System (Full-Stack Web App + n8n Cloud + RAG + Google Sheets)

A production-ready, full-stack AI content automation and governance platform engineered for marketing teams. It combines an interactive **Web UI Dashboard**, **Brand Knowledge Base (RAG)**, an **n8n Cloud AI Workflow Orchestrator**, **Google Gemini LLM**, and **Google Sheets** for audit logging and human review.

---

## 📌 Full-Stack System Architecture

```text
┌───────────────────────┐       ┌───────────────────────┐
│     Web UI Client     │ ────► │     Express Server    │ (RAG Context Injection)
│ (Studio, Preview,     │ ◄──── │   (localhost:3000)    │
│  Review & Governance) │       └───────────┬───────────┘
└───────────────────────┘                   │
                                            ▼
                                ┌───────────────────────┐
                                │       n8n Cloud       │
                                │   (LangChain + Gemini │
                                │    Output Normalizer) │
                                └───────────┬───────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │     Google Sheets     │
                                │ (Draft - Review Req.) │
                                └───────────────────────┘
```

---

## ⚡ Quick Start: Running the Full-Stack Web Application

The interactive web portal is already set up and running on your local machine!

1. Open your browser to: **`http://localhost:3000`**
2. In the **Campaign Studio**:
   - Choose a topic (e.g. *Pizza Promotion* or *Coffee Tasting*).
   - Select platform (Instagram, LinkedIn, X, TikTok).
   - Toggle **Inject Brand Knowledge Base (RAG)** on or off.
   - Click **⚡ Synthesize Social Draft**.
3. View the **Live Post Preview** formatted like a social media card.
4. Go to the **Review Station** tab to manage approval status (`Draft - Review Required`, `Approved`, `Rejected`).
5. Open the **Brand Knowledge Base (RAG)** tab to inspect or add company rules and local cultural guidelines.

---

## 🔑 Key Concepts Explained: Gateway Credits vs. API Key

When working on **n8n Cloud**, you encounter two main ways to power AI nodes:

| Feature | n8n AI Gateway Credits | Direct API Key (Recommended: Google AI Studio) |
| :--- | :--- | :--- |
| **What it is** | Built-in AI tokens provided by n8n Cloud on select subscription tiers. | A private secret key generated directly from the model provider (Google AI Studio). |
| **How it works** | n8n proxies your prompts through their internal billing gateway; you don't need your own OpenAI/Anthropic accounts. | n8n connects directly to Google's servers using your personal credentials. |
| **Cost / Limits** | Bounded by your monthly n8n Cloud plan quota; depletes with high testing volume. | **Free Tier available** on Google AI Studio for Gemini 1.5/2.0 Flash (generous RPM/TPM limits without credit card requirements in most regions). |
| **Setup Needed** | Zero setup if using native gateway models, but restricted to supported gateway providers. | 2-minute setup: generate a key from [aistudio.google.com](https://aistudio.google.com) and paste it into n8n. |

> **Recommendation for this Project:** Use a direct **Google Gemini API Key** from Google AI Studio. It is 100% free for educational prototyping, reliable, and avoids exhausting your n8n Cloud gateway credits during iterative testing.

---

## 📋 Prerequisites

1. An active **n8n Cloud** account.
2. A **Google Account** (for Google Sheets and Google Drive).
3. A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Step-by-Step Setup Guide

### Step 1: Prepare the Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name the spreadsheet: **`AI Content Marketing Pipeline`**.
3. In row 1, add the exact 9 column headers (or import `google-sheets-template.csv`):
   - `created_at`
   - `topic`
   - `platform`
   - `audience`
   - `tone`
   - `caption`
   - `hashtags`
   - `call_to_action`
   - `status`
4. Rename the sheet tab at the bottom to **`Drafts`** (or keep `Sheet1`).

---

### Step 2: Import the Workflow into n8n Cloud
1. In this repository, open [`ai-content-automation.json`](file:///c:/Users/SPECTRE/AI-Automation/Content-Automation-sys/ai-content-automation.json) and copy the entire JSON content.
2. Log in to your **n8n Cloud** workspace.
3. In the left navigation bar, click **Workflows** → **Add Workflow** (or open an empty canvas).
4. Click the three horizontal dots `...` in the top right corner of the canvas.
5. Select **Import from File** and upload `ai-content-automation.json`, OR select **Import from URL / Clipboard** and paste the JSON directly.
6. The full 6-node canvas will populate with all nodes and connections intact.

---

### Step 3: Configure Credentials in n8n Cloud

#### A. Google Gemini Chat Model Credential
1. Double-click the **Google Gemini Chat Model** node (located right underneath the *Basic LLM Chain*).
2. Under **Credential to connect with**, click **Create New Credential**.
3. Go to [Google AI Studio](https://aistudio.google.com/) and click **Get API Key** → **Create API Key in new project**.
4. Copy your key, paste it into the **API Key** field in n8n, and click **Save**.
5. Back in the node settings:
   - **Model**: `models/gemini-1.5-flash` (fast, high context, cost-free on free tier).
   - **Temperature**: `0.7` (ideal balance of creativity and instruction-following).

#### B. Google Sheets Credential
1. Double-click the **Append to Google Sheets** node.
2. Under **Credential to connect with**, click **Create New Credential** → Select **Google Sheets OAuth2 API**.
3. Click **Sign in with Google** (or provide your OAuth client credentials if using standard Google Cloud App).
4. Grant read/write access to Google Drive and Google Sheets.
5. Click **Save**.

---

### Step 4: Link the Google Sheet to the Workflow
1. In the **Append to Google Sheets** node:
   - **Resource**: `Spreadsheet`
   - **Operation**: `Append`
   - **Document**: Select **From list** → Search and select your spreadsheet (**`AI Content Marketing Pipeline`**).
   - **Sheet**: Select **`Drafts`** (or `Sheet1`).
   - **Data Mode / Column Mapping**: Ensure it is set to **Auto-Map Input Data** (or Map Each Column Below matching the 9 field names).
2. Click the canvas background to save node settings.

---

## 🧪 Testing the Workflow

1. Click **Test workflow** (or click **Execute Node** on the Manual Trigger `When clicking ‘Test workflow’`).
2. Observe the execution flow:
   - **Define Campaign Parameters** outputs the 4 input fields:
     - `topic`: "New pizza promotion"
     - `platform`: "Instagram"
     - `audience`: "Young adults in Addis Ababa"
     - `tone`: "Friendly and engaging"
   - **Basic LLM Chain** sends the engineered prompt to **Google Gemini Chat Model** and receives a structured response.
   - **Normalize & Structure Output** parses the JSON, attaches an ISO 8601 UTC timestamp (`created_at`), and sets `status: "Draft - Review Required"`.
   - **Append to Google Sheets** appends a new row to your spreadsheet.
3. Open your Google Sheet to verify that a new row has appeared with all 9 columns filled accurately!

---

## 🛡️ Human-in-the-Loop Safeguard

To prevent AI hallucinations, off-brand messaging, or accidental dissemination of unverified claims, this workflow strictly generates **drafts only**:
- Every record is saved with `status = "Draft - Review Required"`.
- Automated publishing to live social APIs (Instagram Graph API, LinkedIn API, X/Twitter API) is intentionally disconnected.
- A human content manager reviews, refines, and changes the status to `"Approved"` before scheduling.
