import { NextResponse } from 'next/server';
import { getDrafts, saveDrafts, Draft } from '@/lib/dataStore';

export async function GET() {
  const drafts = getDrafts();
  drafts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json(drafts);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const drafts = getDrafts();
    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'Draft - Review Required',
      ...body
    };
    drafts.push(newDraft);
    saveDrafts(drafts);
    return NextResponse.json(newDraft, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    const drafts = getDrafts();
    const index = drafts.findIndex(d => d.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    if (status) {
      drafts[index].status = status;
    }
    Object.assign(drafts[index], body);
    saveDrafts(drafts);

    return NextResponse.json(drafts[index]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    let drafts = getDrafts();
    drafts = drafts.filter(d => d.id !== id);
    saveDrafts(drafts);

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
