import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH
} from '#lib/stellenanzeige.ts';

export function isStellenanzeigeId(id: string) {
  return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id);
}

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

function readText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

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
