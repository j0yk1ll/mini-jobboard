import { fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { getAuth, requireRecruiter } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { bewerbung, stellenanzeige } from '#lib/server/schema.ts';
import { readStellenanzeige } from '#lib/server/stellenanzeige.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const recruiter = await requireRecruiter(request);
  const db = getDb();
  const stellenanzeigen = await db
    .select({
      id: stellenanzeige.id,
      title: stellenanzeige.title,
      status: stellenanzeige.status,
      bewerbungsanzahl: db.$count(
        bewerbung,
        eq(bewerbung.stellenanzeigeId, stellenanzeige.id)
      )
    })
    .from(stellenanzeige)
    .where(eq(stellenanzeige.recruiterId, recruiter.id))
    .orderBy(asc(stellenanzeige.title), asc(stellenanzeige.id));

  return { email: recruiter.email, stellenanzeigen };
};

export const actions: Actions = {
  veroeffentlichen: async ({ request }) => {
    const recruiter = await requireRecruiter(request);
    const { title, description, titleError, descriptionError } =
      readStellenanzeige(await request.formData());
    if (titleError || descriptionError) {
      return fail(400, { title, description, titleError, descriptionError });
    }

    await getDb()
      .insert(stellenanzeige)
      .values({ recruiterId: recruiter.id, title, description });
    redirect(303, '/recruiter');
  },
  abmelden: async ({ request }) => {
    await getAuth().api.signOut({ headers: request.headers });
    redirect(303, '/anmelden');
  }
};
