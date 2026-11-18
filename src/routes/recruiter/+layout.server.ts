import { redirect } from '@sveltejs/kit';
import { getAuth } from '#lib/server/auth.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, setHeaders }) => {
  setHeaders({ 'cache-control': 'no-store' });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) redirect(303, '/anmelden');

  return { email: session.user.email };
};
