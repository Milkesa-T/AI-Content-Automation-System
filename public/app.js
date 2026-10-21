/**
 * ContentStudio.AI — Full-Stack Automation & Review Client
 */

// Application State
let currentDraft = null;
let allDrafts = [];
let knowledgeDocs = [];

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const draftCountBadge = document.getElementById('draftCountBadge');

// Studio Form Elements
const campaignForm = document.getElementById('campaignForm');
const topicInput = document.getElementById('topicInput');
const platformSelect = document.getElementById('platformSelect');
const audienceInput = document.getElementById('audienceInput');
const toneSelect = document.getElementById('toneSelect');
const useRagToggle = document.getElementById('useRagToggle');
const generateBtn = document.getElementById('generateBtn');
const btnSpinner = document.getElementById('btnSpinner');
const btnText = document.getElementById('btnText');
const topicChips = document.querySelectorAll('.chip');

// Live Preview Elements
const previewPlatformBadge = document.getElementById('previewPlatformBadge');
const previewLocation = document.getElementById('previewLocation');
const previewCaptionText = document.getElementById('previewCaptionText');
const previewHashtagsText = document.getElementById('previewHashtagsText');
const previewCtaText = document.getElementById('previewCtaText');
const previewStatus = document.getElementById('previewStatus');
const previewTimestamp = document.getElementById('previewTimestamp');
const copyCaptionBtn = document.getElementById('copyCaptionBtn');
const quickApproveBtn = document.getElementById('quickApproveBtn');
const quickRejectBtn = document.getElementById('quickRejectBtn');

// Review Station Elements
const draftsTableBody = document.getElementById('draftsTableBody');
const refreshDraftsBtn = document.getElementById('refreshDraftsBtn');

// Knowledge Base Elements
const knowledgeGrid = document.getElementById('knowledgeGrid');
const openNewKnowledgeModalBtn = document.getElementById('openNewKnowledgeModalBtn');
const knowledgeModal = document.getElementById('knowledgeModal');
const closeKnowledgeModal = document.getElementById('closeKnowledgeModal');
const saveKnowledgeBtn = document.getElementById('saveKnowledgeBtn');
const kbTitleInput = document.getElementById('kbTitleInput');
const kbCategoryInput = document.getElementById('kbCategoryInput');
const kbContentInput = document.getElementById('kbContentInput');

// Settings Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const n8nWebhookInput = document.getElementById('n8nWebhookInput');
const directGeminiKeyInput = document.getElementById('directGeminiKeyInput');

// 1. Initialize App
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupTopicChips();
  setupSettings();
  loadDrafts();
  loadKnowledge();

  // Load saved settings from localStorage
  n8nWebhookInput.value = localStorage.getItem('cs_n8n_webhook') || '';
  directGeminiKeyInput.value = localStorage.getItem('cs_gemini_key') || '';
});

// 2. Navigation Tabs
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');

      if (targetTab === 'draftsTab') loadDrafts();
      if (targetTab === 'ragTab') loadKnowledge();
    });
  });
}

// 3. Topic Chips Handler
function setupTopicChips() {
  topicChips.forEach(chip => {
    chip.addEventListener('click', () => {
      topicInput.value = chip.getAttribute('data-topic');
      showToast(`Topic updated: "${topicInput.value}"`, 'info');
    });
  });

  platformSelect.addEventListener('change', () => {
    previewPlatformBadge.textContent = platformSelect.value;
  });
}

// 4. Form Submission & Generation
campaignForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    topic: topicInput.value.trim(),
    platform: platformSelect.value,
    audience: audienceInput.value.trim(),
    tone: toneSelect.value,
    useRag: useRagToggle.checked,
    webhookUrl: n8nWebhookInput.value.trim(),
    directApiKey: directGeminiKeyInput.value.trim()
  };

  // UI Loading State
  generateBtn.disabled = true;
  btnSpinner.style.display = 'inline-block';
  btnText.textContent = payload.useRag ? 'Querying RAG & Generating...' : 'Synthesizing Draft...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success && data.draft) {
      currentDraft = data.draft;
      updateLivePreview(data.draft);
      showToast(`Draft generated successfully via ${data.provider}!`, 'success');
      loadDrafts(); // Refresh audit table
    } else {
      showToast('Generation failed. Check logs.', 'error');
    }
  } catch (err) {
    console.error('Generation Error:', err);
    showToast('Failed to connect to backend server.', 'error');
  } finally {
    generateBtn.disabled = false;
    btnSpinner.style.display = 'none';
    btnText.textContent = '⚡ Synthesize Social Draft';
  }
});

// 5. Update Live Preview Frame
function updateLivePreview(draft) {
  previewPlatformBadge.textContent = draft.platform || 'Social Post';
  previewCaptionText.textContent = draft.caption || 'No caption generated.';
  previewHashtagsText.textContent = draft.hashtags || '';
  previewCtaText.textContent = draft.call_to_action || '';
  previewLocation.textContent = draft.audience.includes('Addis') ? 'Addis Ababa, Ethiopia' : 'Global Audience';
  previewTimestamp.textContent = `Generated: ${new Date(draft.created_at).toLocaleTimeString()}`;

  updateStatusPill(previewStatus, draft.status);
}

function updateStatusPill(element, status) {
  element.textContent = status;
  element.className = 'status-pill';
  if (status.includes('Approved')) element.classList.add('status-approved');
  else if (status.includes('Rejected')) element.classList.add('status-rejected');
  else element.classList.add('status-draft');
}

// 6. Quick Preview Actions
copyCaptionBtn.addEventListener('click', () => {
  const fullText = `${previewCaptionText.textContent}\n\n${previewHashtagsText.textContent}\n\n${previewCtaText.textContent}`;
  navigator.clipboard.writeText(fullText).then(() => {
    showToast('Full post copied to clipboard!', 'success');
  });
});

quickApproveBtn.addEventListener('click', async () => {
  if (!currentDraft) return showToast('No draft currently selected', 'info');
  await updateDraftStatus(currentDraft.id, 'Approved');
});

quickRejectBtn.addEventListener('click', async () => {
  if (!currentDraft) return showToast('No draft currently selected', 'info');
  await updateDraftStatus(currentDraft.id, 'Rejected');
});

// 7. Load & Render Drafts
async function loadDrafts() {
  try {
    const res = await fetch('/api/drafts');
    allDrafts = await res.json();
    draftCountBadge.textContent = allDrafts.length;

    if (allDrafts.length > 0 && !currentDraft) {
      currentDraft = allDrafts[0];
      updateLivePreview(currentDraft);
    }

    renderDraftsTable(allDrafts);
  } catch (err) {
    console.error('Failed to load drafts:', err);
  }
}

function renderDraftsTable(drafts) {
  draftsTableBody.innerHTML = '';
  if (drafts.length === 0) {
    draftsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 30px;">No drafts generated yet. Synthesize your first post!</td></tr>`;
    return;
  }

  drafts.forEach(draft => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-size: 0.78rem; color: var(--text-dim);">
        ${new Date(draft.created_at).toLocaleString()}
      </td>
      <td>
        <strong>${escapeHtml(draft.topic)}</strong><br>
        <span class="badge">${escapeHtml(draft.platform)}</span>
      </td>
      <td>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(draft.audience)}</span><br>
        <em style="font-size: 0.75rem; color: var(--text-dim);">${escapeHtml(draft.tone)}</em>
      </td>
      <td>
        <div class="truncate-text" title="${escapeHtml(draft.caption)}">
          ${escapeHtml(draft.caption)}
        </div>
      </td>
      <td>
        <span class="status-pill ${draft.status.includes('Approved') ? 'status-approved' : draft.status.includes('Rejected') ? 'status-rejected' : 'status-draft'}">
          ${escapeHtml(draft.status)}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="previewSelectedDraft('${draft.id}')">View</button>
          <button class="btn btn-success btn-sm" onclick="updateDraftStatus('${draft.id}', 'Approved')">✓</button>
          <button class="btn btn-danger btn-sm" onclick="updateDraftStatus('${draft.id}', 'Rejected')">✕</button>
        </div>
      </td>
    `;
    draftsTableBody.appendChild(tr);
  });
}

window.previewSelectedDraft = function(id) {
  const d = allDrafts.find(item => item.id === id);
  if (d) {
    currentDraft = d;
    updateLivePreview(d);
    document.getElementById('tabStudio').click();
    showToast(`Loaded draft: ${d.topic}`, 'info');
  }
};

window.updateDraftStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Status updated to: ${newStatus}`, 'success');
      loadDrafts();
      if (currentDraft && currentDraft.id === id) {
        currentDraft.status = newStatus;
        updateStatusPill(previewStatus, newStatus);
      }
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
};

refreshDraftsBtn.addEventListener('click', loadDrafts);

// 8. Load & Render Brand Knowledge Base (RAG)
async function loadKnowledge() {
  try {
    const res = await fetch('/api/knowledge');
    knowledgeDocs = await res.json();
    renderKnowledgeGrid(knowledgeDocs);
  } catch (err) {
    console.error('Failed to load knowledge:', err);
  }
}

function renderKnowledgeGrid(docs) {
  knowledgeGrid.innerHTML = '';
  if (docs.length === 0) {
    knowledgeGrid.innerHTML = `<p style="color: var(--text-dim);">No knowledge documents found.</p>`;
    return;
  }

  docs.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'kb-card';
    card.innerHTML = `
      <span class="kb-category">${escapeHtml(doc.category)}</span>
      <h3 class="kb-title">${escapeHtml(doc.title)}</h3>
      <p class="kb-content">${escapeHtml(doc.content)}</p>
      <div class="kb-footer">
        <span>Updated: ${new Date(doc.updated_at).toLocaleDateString()}</span>
        <button class="btn btn-danger btn-sm" onclick="deleteKnowledgeDoc('${doc.id}')">Delete</button>
      </div>
    `;
    knowledgeGrid.appendChild(card);
  });
}

window.deleteKnowledgeDoc = async function(id) {
  if (!confirm('Delete this knowledge document?')) return;
  try {
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
    showToast('Knowledge doc deleted', 'info');
    loadKnowledge();
  } catch (err) {
    showToast('Failed to delete doc', 'error');
  }
};

// 9. Add Knowledge Modal Handlers
openNewKnowledgeModalBtn.addEventListener('click', () => knowledgeModal.style.display = 'flex');
closeKnowledgeModal.addEventListener('click', () => knowledgeModal.style.display = 'none');
saveKnowledgeBtn.addEventListener('click', async () => {
  const title = kbTitleInput.value.trim();
  const category = kbCategoryInput.value;
  const content = kbContentInput.value.trim();

  if (!title || !content) return showToast('Please fill out all required fields', 'error');

  try {
    const res = await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, content })
    });
    if (res.ok) {
      showToast('New Brand Knowledge added for RAG!', 'success');
      knowledgeModal.style.display = 'none';
      kbTitleInput.value = '';
      kbContentInput.value = '';
      loadKnowledge();
    }
  } catch (err) {
    showToast('Error saving knowledge doc', 'error');
  }
});

// 10. Settings Modal Handlers
openSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
closeSettingsModal.addEventListener('click', () => settingsModal.style.display = 'none');
saveSettingsBtn.addEventListener('click', () => {
  localStorage.setItem('cs_n8n_webhook', n8nWebhookInput.value.trim());
  localStorage.setItem('cs_gemini_key', directGeminiKeyInput.value.trim());
  showToast('Settings saved successfully!', 'success');
  settingsModal.style.display = 'none';
});

// 11. Toast Notifications Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${escapeHtml(message)}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
