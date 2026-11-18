import { fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { getAuth } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { stellenanzeige } from '#lib/server/schema.ts';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH
} from '#lib/stellenanzeige.ts';
import type { Actions, PageServerLoad } from './$types';

async function requireRecruiter(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) redirect(303, '/anmelden');

  return session.user;
}

export const load: PageServerLoad = async ({ request, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const recruiter = await requireRecruiter(request);
  const stellenanzeigen = await getDb()
    .select({
      id: stellenanzeige.id,
      title: stellenanzeige.title,
      status: stellenanzeige.status
    })
    .from(stellenanzeige)
    .where(eq(stellenanzeige.recruiterId, recruiter.id))
    .orderBy(asc(stellenanzeige.title), asc(stellenanzeige.id));

  return { email: recruiter.email, stellenanzeigen };
};

function readText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

export const actions: Actions = {
  veroeffentlichen: async ({ request }) => {
    const recruiter = await requireRecruiter(request);
    const form = await request.formData();
    const title = readText(form, 'title');
    const description = readText(form, 'description');
    const titleError = validateText(
      title,
      MAX_TITLE_LENGTH,
      'Der Titel',
      'Gib einen Titel ein.'
    );
    const descriptionError = validateText(
      description,
      MAX_DESCRIPTION_LENGTH,
      'Die Beschreibung',
      'Gib eine Beschreibung ein.'
    );
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

function validateText(
  value: string,
  maxLength: number,
  label: string,
  requiredMessage: string
) {
  if (!value) return requiredMessage;
  if (value.includes('\0')) return `${label} enthält ein ungültiges Zeichen.`;
  if ([...value].length > maxLength) {
    return `${label} darf höchstens ${maxLength} Zeichen haben.`;
  }
}
