import fs from 'fs';
import path from 'path';

export interface Draft {
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

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  updated_at: string;
}

function resolveDataDir(): string {
  // Check if root data exists, else frontend data
  const rootData = path.resolve(process.cwd(), '..', 'data');
  if (fs.existsSync(rootData)) return rootData;
  const localData = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(localData)) {
    fs.mkdirSync(localData, { recursive: true });
  }
  return localData;
}

export function getDrafts(): Draft[] {
  const dir = resolveDataDir();
  const file = path.join(dir, 'drafts.json');
  try {
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading drafts:', err);
    return [];
  }
}

export function saveDrafts(drafts: Draft[]): boolean {
  const dir = resolveDataDir();
  const file = path.join(dir, 'drafts.json');
  try {
    fs.writeFileSync(file, JSON.stringify(drafts, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving drafts:', err);
    return false;
  }
}

export function getKnowledge(): KnowledgeDoc[] {
  const dir = resolveDataDir();
  const file = path.join(dir, 'knowledge.json');
  try {
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading knowledge:', err);
    return [];
  }
}

export function saveKnowledge(docs: KnowledgeDoc[]): boolean {
  const dir = resolveDataDir();
  const file = path.join(dir, 'knowledge.json');
  try {
    fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving knowledge:', err);
    return false;
  }
}
