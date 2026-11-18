import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db.ts';
import { stellenanzeige } from '#lib/server/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(params.id)) {
    error(404, 'Stellenanzeige nicht gefunden');
  }

  const [anzeige] = await getDb()
    .select({
      title: stellenanzeige.title,
      description: stellenanzeige.description
    })
    .from(stellenanzeige)
    .where(
      and(eq(stellenanzeige.id, params.id), eq(stellenanzeige.status, 'open'))
    );
  if (!anzeige) error(404, 'Stellenanzeige nicht gefunden');

  return { anzeige };
};
