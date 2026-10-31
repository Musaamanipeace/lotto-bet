import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import { DEFAULT_TEMPLATES, type FilterTemplate } from '@/lib/template-store.ts';

export const dynamic = 'force-dynamic';

// In-memory per-user templates store (mirrored with client localStorage)
const userTemplatesMap = new Map<string, FilterTemplate[]>();

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    const userId = user?.id ?? '__anon__';
    const list = userTemplatesMap.get(userId) ?? [];
    return Response.json({
      ok: true,
      templates: [...DEFAULT_TEMPLATES, ...list],
      user: user ?? null,
    });
  } catch (e) {
    return jsonError(`Failed to fetch templates: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

let serverTemplateClock = 0;

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  try {
    const user = await currentUser(req);
    const body = await req.json();
    if (!body || typeof body.name !== 'string' || !body.cards) {
      return jsonError('Template name and filter cards are required', 400);
    }

    const userId = user?.id ?? '__anon__';
    const newTemplate: FilterTemplate = {
      id: `tpl-${Date.now()}-${++serverTemplateClock}`,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      bookmaker: body.bookmaker || 'sportybet',
      withinHours: body.withinHours !== undefined ? body.withinHours : null,
      leagues: Array.isArray(body.leagues) ? body.leagues : [],
      cards: body.cards,
      userId: user?.id ?? null,
      createdAt: Date.now(),
      isDefault: false,
    };

    const cur = userTemplatesMap.get(userId) ?? [];
    userTemplatesMap.set(userId, [newTemplate, ...cur.slice(0, 50)]);

    return Response.json({ ok: true, template: newTemplate });
  } catch (e) {
    return jsonError(`Failed to save template: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

export async function DELETE(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  try {
    const user = await currentUser(req);
    const body = await req.json();
    const id = body?.id;
    if (typeof id !== 'string') return jsonError('Template ID is required', 400);

    const userId = user?.id ?? '__anon__';
    const cur = userTemplatesMap.get(userId) ?? [];
    const next = cur.filter((t) => t.id !== id);
    userTemplatesMap.set(userId, next);

    return Response.json({ ok: true, deletedId: id });
  } catch (e) {
    return jsonError(`Failed to delete template: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
