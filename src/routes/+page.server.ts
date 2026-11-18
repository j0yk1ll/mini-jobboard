import { asc, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db.ts';
import { stellenanzeige } from '#lib/server/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const stellenanzeigen = await getDb()
    .select({ id: stellenanzeige.id, title: stellenanzeige.title })
    .from(stellenanzeige)
    .where(eq(stellenanzeige.status, 'open'))
    .orderBy(asc(stellenanzeige.title), asc(stellenanzeige.id));

  return { stellenanzeigen };
};
