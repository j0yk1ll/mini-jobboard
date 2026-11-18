import { redirect } from '@sveltejs/kit';
import { getAuth } from '#lib/server/auth.ts';
import type { Actions } from './$types';

export const actions: Actions = {
  abmelden: async ({ request }) => {
    await getAuth().api.signOut({ headers: request.headers });
    redirect(303, '/anmelden');
  }
};
