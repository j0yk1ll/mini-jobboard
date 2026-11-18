import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { BEWERBUNGSSTATUS } from '#lib/bewerbung.ts';
import { requireRecruiter } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { isUuid } from '#lib/server/form.ts';
import { bewerbung, stellenanzeige } from '#lib/server/schema.ts';
import { readStellenanzeige } from '#lib/server/stellenanzeige.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function ownershipFilter(request: Request, id: string) {
  const recruiter = await requireRecruiter(request);
  if (!isUuid(id)) {
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
  const anzeige = await loadStellenanzeige(filter);
  const bewerbungen = await getDb()
    .select({
      id: bewerbung.id,
      name: bewerbung.name,
      email: bewerbung.email,
      text: bewerbung.text,
      status: bewerbung.status
    })
    .from(bewerbung)
    .innerJoin(
      stellenanzeige,
      eq(bewerbung.stellenanzeigeId, stellenanzeige.id)
    )
    .where(filter)
    .orderBy(bewerbung.name, bewerbung.id);
  return { anzeige, bewerbungen };
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
  oeffnen: (event) => setStatus(event, 'open'),
  bewerbungsstatus: async ({ request, params, url }) => {
    const filter = await ownershipFilter(request, params.id);
    const fields = await request.formData();
    const bewerbungId = fields.get('bewerbungId');
    if (!isUuid(bewerbungId)) error(404, 'Bewerbung nicht gefunden');

    const db = getDb();
    const bewerbungFilter = and(
      eq(bewerbung.id, bewerbungId),
      inArray(
        bewerbung.stellenanzeigeId,
        db.select({ id: stellenanzeige.id }).from(stellenanzeige).where(filter)
      )
    );
    const submittedStatus = fields.get('status');
    const status = BEWERBUNGSSTATUS.find((value) => value === submittedStatus);
    if (!status) {
      const [found] = await db
        .select({ id: bewerbung.id })
        .from(bewerbung)
        .where(bewerbungFilter);
      if (!found) error(404, 'Bewerbung nicht gefunden');
      return fail(400, {
        bewerbungId: found.id,
        statusError: 'Wähle einen gültigen Bewerbungsstatus.'
      });
    }

    const [updated] = await db
      .update(bewerbung)
      .set({ status })
      .where(bewerbungFilter)
      .returning({ id: bewerbung.id });
    if (!updated) error(404, 'Bewerbung nicht gefunden');
    redirect(303, url.pathname);
  }
};
