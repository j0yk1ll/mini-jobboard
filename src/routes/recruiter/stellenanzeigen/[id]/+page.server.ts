import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { requireRecruiter } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { stellenanzeige } from '#lib/server/schema.ts';
import {
  isStellenanzeigeId,
  readStellenanzeige
} from '#lib/server/stellenanzeige.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function ownershipFilter(request: Request, id: string) {
  const recruiter = await requireRecruiter(request);
  if (!isStellenanzeigeId(id)) {
    error(404, 'Stellenanzeige nicht gefunden');
  }

  return and(
    eq(stellenanzeige.id, id),
    eq(stellenanzeige.recruiterId, recruiter.id)
  );
}

async function loadStellenanzeige(
  filter: Awaited<ReturnType<typeof ownershipFilter>>
) {
  const [anzeige] = await getDb()
    .select({
      title: stellenanzeige.title,
      description: stellenanzeige.description,
      status: stellenanzeige.status
    })
    .from(stellenanzeige)
    .where(filter);
  if (!anzeige) error(404, 'Stellenanzeige nicht gefunden');

  return anzeige;
}

export const load: PageServerLoad = async ({ request, params, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const filter = await ownershipFilter(request, params.id);
  return { anzeige: await loadStellenanzeige(filter) };
};

async function updateStellenanzeige(
  filter: Awaited<ReturnType<typeof ownershipFilter>>,
  changes:
    | Pick<typeof stellenanzeige.$inferInsert, 'title' | 'description'>
    | {
        status: typeof stellenanzeige.$inferSelect.status;
      },
  pathname: string
) {
  const [updated] = await getDb()
    .update(stellenanzeige)
    .set(changes)
    .where(filter)
    .returning({ id: stellenanzeige.id });
  if (!updated) error(404, 'Stellenanzeige nicht gefunden');

  redirect(303, pathname);
}

async function setStatus(
  { request, params, url }: RequestEvent,
  status: typeof stellenanzeige.$inferSelect.status
) {
  const filter = await ownershipFilter(request, params.id);
  return updateStellenanzeige(filter, { status }, url.pathname);
}

export const actions: Actions = {
  bearbeiten: async ({ request, params, url }) => {
    const filter = await ownershipFilter(request, params.id);
    const fields = readStellenanzeige(await request.formData());
    if (fields.titleError || fields.descriptionError) {
      await loadStellenanzeige(filter);
      return fail(400, fields);
    }

    return updateStellenanzeige(
      filter,
      { title: fields.title, description: fields.description },
      url.pathname
    );
  },
  schliessen: (event) => setStatus(event, 'closed'),
  oeffnen: (event) => setStatus(event, 'open')
};
