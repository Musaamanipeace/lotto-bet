import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import { DEFAULT_TEMPLATES, type FilterTemplate } from '@/lib/template-store.ts';
import { ensureUserSettingsTables } from '@/lib/pg-schema.ts';
import { queryAsUser } from '@/lib/pg-store.ts';

export const dynamic = 'force-dynamic';

// In-memory per-user templates store fallback (strictly scoped by authenticated userId)
const g = globalThis as unknown as { __lottoUserTemplatesMap?: Map<string, FilterTemplate[]> };
const userTemplatesMap = (g.__lottoUserTemplatesMap ??= new Map<string, FilterTemplate[]>());
const usePg = () => Boolean(process.env.DATABASE_URL);

async function loadCustomTemplates(userId: string): Promise<FilterTemplate[]> {
  if (!usePg()) return userTemplatesMap.get(userId) ?? [];
  await ensureUserSettingsTables();
  const r = await queryAsUser<{ custom_templates: unknown }>(
    userId,
    `SELECT custom_templates FROM user_settings WHERE user_id = $1`,
    [userId],
  );
  const raw = r.rows[0]?.custom_templates;
  return Array.isArray(raw) ? (raw as FilterTemplate[]) : [];
}

async function saveCustomTemplates(userId: string, list: FilterTemplate[]): Promise<void> {
  if (!usePg()) {
    userTemplatesMap.set(userId, list);
    return;
  }
  await ensureUserSettingsTables();
  await queryAsUser(
    userId,
    `INSERT INTO user_settings (user_id, custom_templates, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET
       custom_templates = EXCLUDED.custom_templates,
       updated_at = now()`,
    [userId, JSON.stringify(list)],
  );
}

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    const list = user ? await loadCustomTemplates(user.id) : [];
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
      name: body.name.trim().slice(0, 60),
      description: typeof body.description === 'string' ? body.description.trim().slice(0, 200) : undefined,
      bookmaker: body.bookmaker === 'betpawa' ? 'betpawa' : 'sportybet',
      withinHours: body.withinHours !== undefined ? body.withinHours : null,
      leagues: Array.isArray(body.leagues) ? body.leagues : [],
      cards: body.cards,
      userId: user.id,
      createdAt: Date.now(),
      isDefault: false,
    };

    const cur = await loadCustomTemplates(user.id);
    await saveCustomTemplates(user.id, [newTemplate, ...cur.slice(0, 49)]);

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

    const cur = await loadCustomTemplates(user.id);
    const next = cur.filter((t) => t.id !== id && t.userId === user.id);
    await saveCustomTemplates(user.id, next);

    return Response.json({ ok: true, deletedId: id });
  } catch (e) {
    return jsonError(`Failed to delete template: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
