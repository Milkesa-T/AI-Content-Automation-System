import { NextResponse } from 'next/server';
import { getKnowledge, saveKnowledge, KnowledgeDoc } from '@/lib/dataStore';

export async function GET() {
  const docs = getKnowledge();
  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const docs = getKnowledge();
    const newDoc: KnowledgeDoc = {
      id: `kb-${Date.now()}`,
      title: body.title || 'Brand Guideline Document',
      category: body.category || 'General',
      content: body.content || '',
      updated_at: new Date().toISOString()
    };
    docs.push(newDoc);
    saveKnowledge(docs);
    return NextResponse.json(newDoc, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let docs = getKnowledge();
    docs = docs.filter(d => d.id !== id);
    saveKnowledge(docs);

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
