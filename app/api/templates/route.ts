import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import { DEFAULT_TEMPLATES, type FilterTemplate } from '@/lib/template-store.ts';

export const dynamic = 'force-dynamic';

// In-memory per-user templates store (strictly scoped by authenticated userId)
const userTemplatesMap = new Map<string, FilterTemplate[]>();

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    const list = user ? (userTemplatesMap.get(user.id) ?? []) : [];
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
    if (!user) return jsonError('Sign in to save templates to your account', 401);
    const body = await req.json();
    if (!body || typeof body.name !== 'string' || !body.cards) {
      return jsonError('Template name and filter cards are required', 400);
    }

    const newTemplate: FilterTemplate = {
      id: `tpl-${Date.now()}-${++serverTemplateClock}`,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      bookmaker: body.bookmaker || 'sportybet',
      withinHours: body.withinHours !== undefined ? body.withinHours : null,
      leagues: Array.isArray(body.leagues) ? body.leagues : [],
      cards: body.cards,
      userId: user.id,
      createdAt: Date.now(),
      isDefault: false,
    };

    const cur = userTemplatesMap.get(user.id) ?? [];
    userTemplatesMap.set(user.id, [newTemplate, ...cur.slice(0, 50)]);

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
    if (!user) return jsonError('Sign in to delete templates', 401);
    const body = await req.json();
    const id = body?.id;
    if (typeof id !== 'string') return jsonError('Template ID is required', 400);

    const cur = userTemplatesMap.get(user.id) ?? [];
    const next = cur.filter((t) => t.id !== id && t.userId === user.id);
    userTemplatesMap.set(user.id, next);

    return Response.json({ ok: true, deletedId: id });
  } catch (e) {
    return jsonError(`Failed to delete template: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
