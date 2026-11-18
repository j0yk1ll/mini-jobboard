import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH
} from '#lib/stellenanzeige.ts';
import { readText, validateText } from './form';

export function readStellenanzeige(form: FormData) {
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
  return { title, description, titleError, descriptionError };
}
