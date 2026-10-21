'use client';

import React, { useState, useEffect } from 'react';

interface Draft {
  id: string;
  created_at: string;
  topic: string;
  platform: string;
  audience: string;
  tone: string;
  caption: string;
  hashtags: string;
  call_to_action: string;
  status: 'Draft - Review Required' | 'Approved' | 'Rejected';
  source?: string;
  usedRag?: boolean;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function HomePage() {
  // Tabs
  const [activeTab, setActiveTab] = useState<'studio' | 'drafts' | 'rag'>('studio');

  // Form State
  const [topic, setTopic] = useState('New pizza promotion');
  const [platform, setPlatform] = useState('Instagram');
  const [audience, setAudience] = useState('Young adults in Addis Ababa');
  const [tone, setTone] = useState('Friendly and engaging');
  const [useRag, setUseRag] = useState(true);
  const [loading, setLoading] = useState(false);

  // Data State
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeDoc[]>([]);

  // Modals & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [n8nWebhook, setN8nWebhook] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  // New Knowledge Form
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbCategory, setNewKbCategory] = useState('Tone & Cultural Resonance');
  const [newKbContent, setNewKbContent] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchDrafts();
    fetchKnowledge();
    const savedWebhook = localStorage.getItem('cs_n8n_webhook') || '';
    const savedKey = localStorage.getItem('cs_gemini_key') || '';
    setN8nWebhook(savedWebhook);
    setGeminiKey(savedKey);
  }, []);

  const fetchDrafts = async () => {
    try {
      const res = await fetch('/api/drafts');
      if (res.ok) {
        const data: Draft[] = await res.json();
        setDrafts(data);
        if (data.length > 0 && !currentDraft) {
          setCurrentDraft(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      if (res.ok) {
        const data: KnowledgeDoc[] = await res.json();
        setKnowledge(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platform,
          audience,
          tone,
          useRag,
          webhookUrl: n8nWebhook,
          directApiKey: geminiKey
        })
      });

      const data = await res.json();
      if (data.success && data.draft) {
        setCurrentDraft(data.draft);
        addToast(`Draft generated via ${data.provider}`, 'success');
        fetchDrafts();
      } else {
        addToast('Generation request failed.', 'error');
      }
    } catch (err) {
      addToast('Error communicating with backend service.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: 'Draft - Review Required' | 'Approved' | 'Rejected') => {
    try {
      const res = await fetch('/api/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        addToast(`Draft marked as ${newStatus}`, 'success');
        fetchDrafts();
        if (currentDraft && currentDraft.id === id) {
          setCurrentDraft({ ...currentDraft, status: newStatus });
        }
      }
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (id: string) => {
    try {
      await fetch(`/api/drafts?id=${id}`, { method: 'DELETE' });
      addToast('Draft removed from pipeline', 'info');
      fetchDrafts();
    } catch (err) {
      addToast('Error deleting draft', 'error');
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    if (!currentDraft) return;
    const text = `${currentDraft.caption}\n\n${currentDraft.hashtags}\n\n${currentDraft.call_to_action}`;
    navigator.clipboard.writeText(text);
    addToast('Post text copied to clipboard', 'success');
  };

  // Add Knowledge Doc
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbTitle || !newKbContent) return addToast('Please complete all required fields', 'error');

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newKbTitle,
          category: newKbCategory,
          content: newKbContent
        })
      });

      if (res.ok) {
        addToast('Brand knowledge document added', 'success');
        setShowAddKnowledge(false);
        setNewKbTitle('');
        setNewKbContent('');
        fetchKnowledge();
      }
    } catch (err) {
      addToast('Failed to save knowledge document', 'error');
    }
  };

  // Delete Knowledge Doc
  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Are you sure you want to remove this knowledge document?')) return;
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      addToast('Knowledge document deleted', 'info');
      fetchKnowledge();
    } catch (err) {
      addToast('Error deleting document', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    localStorage.setItem('cs_n8n_webhook', n8nWebhook.trim());
    localStorage.setItem('cs_gemini_key', geminiKey.trim());
    setShowSettings(false);
    addToast('Configuration settings updated', 'success');
  };

  return (
    <>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand">
            <div>
              <h1 className="brand-title">
                ContentStudio<span className="gradient-text">.AI</span>
              </h1>
              <p className="brand-subtitle">Automated Content Pipeline & Human-in-the-Loop Governance</p>
            </div>
          </div>

          <div className="header-actions">
            <div className="status-indicator">
              <span className="pulse-dot"></span>
              <span>System Online</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="btn btn-secondary btn-sm">
              Settings & Integrations
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs-wrapper">
        <div className="tabs-container">
          <button
            className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            Campaign Studio
          </button>
          <button
            className={`nav-tab ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Review Station <span className="badge">{drafts.length}</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            Brand Knowledge Base
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="app-main">
        {/* TAB 1: STUDIO */}
        {activeTab === 'studio' && (
          <div className="studio-grid">
            {/* Form */}
            <div className="glass-card">
              <div className="card-header">
                <h2>Campaign Generator</h2>
                <p>Define parameters to generate localized, on-brand marketing copy</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Campaign Topic / Objective</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. New pizza promotion"
                    required
                  />
                  <div className="topic-chips">
                    <span className="chip" onClick={() => setTopic('New pizza promotion')}>Pizza Promotion</span>
                    <span className="chip" onClick={() => setTopic('Addis Specialty Coffee Tasting')}>Coffee Tasting</span>
                    <span className="chip" onClick={() => setTopic('Weekend Student Discount')}>Student Discount</span>
                    <span className="chip" onClick={() => setTopic('Late Night Delivery Service')}>Late Night Delivery</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Target Platform</label>
                    <select value={platform} onChange={e => setPlatform(e.target.value)} required>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Facebook">Facebook</option>
                      <option value="X (Twitter)">X (Twitter)</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label>Brand Tone</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} required>
                      <option value="Friendly and engaging">Friendly & Engaging</option>
                      <option value="Professional & Authoritative">Professional & Authoritative</option>
                      <option value="Punchy, Viral & High-Energy">Punchy & High-Energy</option>
                      <option value="Humorous & Relatable">Humorous & Relatable</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Target Audience & Location</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                    placeholder="e.g. Young adults in Addis Ababa"
                    required
                  />
                </div>

                {/* RAG Switch */}
                <div className="rag-switch-card">
                  <div className="switch-info">
                    <div className="switch-title">
                      <span className="rag-badge">RAG</span>
                      <strong>Brand Knowledge Retrieval</strong>
                    </div>
                    <p className="switch-desc">
                      Enrich generation with stored brand voice guidelines, local cultural references, and legal compliance.
                    </p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={useRag}
                      onChange={e => setUseRag(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                  {loading ? (
                    <>
                      <span className="btn-spinner"></span> Generating Draft...
                    </>
                  ) : (
                    'Generate Draft'
                  )}
                </button>
              </form>
            </div>

            {/* Live Social Preview */}
            <div className="glass-card">
              <div className="card-header space-between">
                <div>
                  <h2>Post Preview</h2>
                  <p>Rendered post draft layout</p>
                </div>
                <div className="badge">{platform}</div>
              </div>

              <div className="social-mockup-frame">
                <div className="mockup-header">
                  <div className="user-avatar-monogram">AP</div>
                  <div className="user-meta">
                    <div className="user-handle">
                      addis_brand <span className="verified-dot">●</span>
                    </div>
                    <div className="post-location">
                      {audience.includes('Addis') ? 'Addis Ababa, Ethiopia' : 'Target Region'}
                    </div>
                  </div>
                  <span className="more-dots">•••</span>
                </div>

                <div className="mockup-media">
                  <div className="media-placeholder">
                    <span className="media-tag">Campaign Creative Asset</span>
                  </div>
                </div>

                <div className="mockup-body">
                  <div className="social-interactions">
                    <span>2,419 Likes</span>
                    <span>188 Comments</span>
                    <span>340 Shares</span>
                    <span
                      className={`status-pill ${
                        currentDraft?.status.includes('Approved')
                          ? 'status-approved'
                          : currentDraft?.status.includes('Rejected')
                          ? 'status-rejected'
                          : 'status-draft'
                      }`}
                    >
                      {currentDraft?.status || 'Draft - Review Required'}
                    </span>
                  </div>

                  <div className="post-caption-box">
                    <p>
                      {currentDraft?.caption ||
                        "Pizza lovers of Addis, assemble! Our new promotion just dropped. From cheesy classics to spicy local twists, we're serving up the city's favorite slices at a special price. Perfect for your next gathering with friends."}
                    </p>
                  </div>

                  <div className="post-hashtags-box">
                    <p>
                      {currentDraft?.hashtags ||
                        '#AddisFoodie #PizzaAddis #AddisAbaba #PizzaLover #HabeshaEats #NewInAddis'}
                    </p>
                  </div>

                  <div className="post-cta-banner">
                    <strong>Call to Action:</strong>{' '}
                    <span>{currentDraft?.call_to_action || 'Tap the link in our bio to order today!'}</span>
                  </div>
                </div>

                <div className="mockup-footer">
                  <span className="timestamp-label">
                    {currentDraft?.created_at
                      ? `Generated: ${new Date(currentDraft.created_at).toLocaleString()}`
                      : 'Generated recently'}
                  </span>
                </div>
              </div>

              <div className="preview-actions">
                <button onClick={handleCopy} className="btn btn-secondary btn-sm">
                  Copy Text
                </button>
                {currentDraft && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(currentDraft.id, 'Approved')}
                      className="btn btn-success btn-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(currentDraft.id, 'Rejected')}
                      className="btn btn-danger btn-sm"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REVIEW STATION */}
        {activeTab === 'drafts' && (
          <div className="glass-card">
            <div className="card-header space-between">
              <div>
                <h2>Content Governance & Audit Pipeline</h2>
                <p>All AI-generated drafts are staged here for human verification before external distribution.</p>
              </div>
              <button onClick={fetchDrafts} className="btn btn-secondary btn-sm">
                Refresh
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Topic & Platform</th>
                    <th>Audience & Tone</th>
                    <th>Caption Preview</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                        No drafts recorded yet. Generate your first campaign draft.
                      </td>
                    </tr>
                  ) : (
                    drafts.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          {new Date(d.created_at).toLocaleString()}
                        </td>
                        <td>
                          <strong>{d.topic}</strong>
                          <br />
                          <span className="badge">{d.platform}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.audience}</span>
                          <br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{d.tone}</span>
                        </td>
                        <td>
                          <div className="truncate-text" title={d.caption}>
                            {d.caption}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              d.status.includes('Approved')
                                ? 'status-approved'
                                : d.status.includes('Rejected')
                                ? 'status-rejected'
                                : 'status-draft'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setCurrentDraft(d);
                                setActiveTab('studio');
                              }}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleUpdateStatus(d.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteDraft(d.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BRAND KNOWLEDGE BASE (RAG) */}
        {activeTab === 'rag' && (
          <div className="glass-card">
            <div className="card-header space-between">
              <div>
                <h2>Brand Knowledge Base (RAG)</h2>
                <p>Ground generative models with persistent brand guidelines, local cultural context, and compliance standards.</p>
              </div>
              <button onClick={() => setShowAddKnowledge(true)} className="btn btn-primary btn-sm">
                + Add Knowledge Document
              </button>
            </div>

            <div className="knowledge-grid">
              {knowledge.map(doc => (
                <div key={doc.id} className="kb-card">
                  <div>
                    <span className="kb-category">{doc.category}</span>
                    <h3 className="kb-title">{doc.title}</h3>
                    <p className="kb-content">{doc.content}</p>
                  </div>
                  <div className="kb-footer">
                    <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDeleteKnowledge(doc.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>System Settings & Integrations</h3>
              <button className="close-modal-btn" onClick={() => setShowSettings(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>n8n Cloud Webhook URL (Optional)</label>
                <input
                  type="url"
                  value={n8nWebhook}
                  onChange={e => setN8nWebhook(e.target.value)}
                  placeholder="https://your-n8n.app.n8n.cloud/webhook/generate-content"
                />
                <small className="helper-text">Directly route generation tasks to your n8n workflow pipeline.</small>
              </div>

              <div className="form-group">
                <label>Google Gemini API Key (Direct Fallback)</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
                <small className="helper-text">Used if n8n Cloud is unreachable or webhook is unconfigured.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleSaveSettings} className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Knowledge Modal */}
      {showAddKnowledge && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Brand Knowledge Document</h3>
              <button className="close-modal-btn" onClick={() => setShowAddKnowledge(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddKnowledge}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={newKbTitle}
                    onChange={e => setNewKbTitle(e.target.value)}
                    placeholder="e.g. Bole Branch Weekend Offer Rules"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newKbCategory}
                    onChange={e => setNewKbCategory(e.target.value)}
                  >
                    <option value="Tone & Cultural Resonance">Tone & Cultural Resonance</option>
                    <option value="Platform Rules">Platform Rules</option>
                    <option value="Compliance">Compliance & Legal</option>
                    <option value="Product Specs">Product Specs</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Content / Guidelines</label>
                  <textarea
                    rows={4}
                    value={newKbContent}
                    onChange={e => setNewKbContent(e.target.value)}
                    placeholder="Enter brand rules, regional cultural context, or compliance requirements..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
