import { error, fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { eq } from 'drizzle-orm';
import { readBewerbung } from '#lib/server/bewerbung.ts';
import { getDb } from '#lib/server/db.ts';
import { bewerbung, stellenanzeige } from '#lib/server/schema.ts';
import { isStellenanzeigeId } from '#lib/server/stellenanzeige.ts';
import type { Actions, PageServerLoad } from './$types';

function rejectClosedStellenanzeige(): never {
  error(
    409,
    'Diese Stellenanzeige ist geschlossen. Du kannst dich nicht mehr bewerben.'
  );
}

export const load: PageServerLoad = async ({ params, request, setHeaders }) => {
  if (request.method !== 'POST') setHeaders({ 'cache-control': 'no-cache' });
  if (!isStellenanzeigeId(params.id)) {
    error(404, 'Stellenanzeige nicht gefunden');
  }

  const [anzeige] = await getDb()
    .select({
      title: stellenanzeige.title,
      description: stellenanzeige.description,
      status: stellenanzeige.status
    })
    .from(stellenanzeige)
    .where(eq(stellenanzeige.id, params.id));
  if (!anzeige) error(404, 'Stellenanzeige nicht gefunden');
  if (anzeige.status === 'closed') {
    if (request.method === 'POST') rejectClosedStellenanzeige();
    error(404, 'Stellenanzeige nicht gefunden');
  }

  return {
    anzeige: { title: anzeige.title, description: anzeige.description }
  };
};

export const actions: Actions = {
  bewerben: async ({ request, params, setHeaders }) => {
    setHeaders({ 'cache-control': 'no-store' });
    if (!isStellenanzeigeId(params.id)) {
      error(404, 'Stellenanzeige nicht gefunden');
    }

    const fields = readBewerbung(await request.formData());
    const validationFailure = await getDb().transaction(async (tx) => {
      // FOR SHARE holds the listing open until this transaction commits.
      // The recruiter's UPDATE waits for this lock before changing the status.
      const [anzeige] = await tx
        .select({ status: stellenanzeige.status })
        .from(stellenanzeige)
        .where(eq(stellenanzeige.id, params.id))
        .for('share');
      if (!anzeige) error(404, 'Stellenanzeige nicht gefunden');
      if (anzeige.status === 'closed') rejectClosedStellenanzeige();
      if (fields.nameError || fields.emailError || fields.textError) {
        return fail(400, fields);
      }

      await tx
        .insert(bewerbung)
        .values({
          stellenanzeigeId: params.id,
          name: fields.name,
          email: fields.email.toLowerCase(),
          text: fields.text
        })
        .onConflictDoNothing({
          target: [bewerbung.stellenanzeigeId, bewerbung.email]
        });
    });
    if (validationFailure) return validationFailure;
    redirect(303, resolve('/bewerbung-bestaetigt'));
  }
};
