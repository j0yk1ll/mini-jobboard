import { submitCredentials } from '#lib/server/credentials.ts';
import type { Actions } from './$types';

export const actions: Actions = {
  default: (event) => submitCredentials(event, 'sign-in')
};
