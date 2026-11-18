import { MAX_BEWERBUNGSTEXT_LENGTH, MAX_NAME_LENGTH } from '#lib/bewerbung.ts';
import { readText, validateText } from './form';

const emailFormat =
  /^[a-z\d!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-z\d!#$%&'*+\-/=?^_`{|}~]+)*@(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i;

export function readBewerbung(form: FormData) {
  const name = readText(form, 'name');
  const email = readText(form, 'email');
  const text = readText(form, 'text');
  return {
    name,
    email,
    text,
    nameError: validateText(
      name,
      MAX_NAME_LENGTH,
      'Der Name',
      'Gib deinen Namen ein.'
    ),
    emailError: validateEmail(email),
    textError: validateText(
      text,
      MAX_BEWERBUNGSTEXT_LENGTH,
      'Der Bewerbungstext',
      'Gib einen Bewerbungstext ein.'
    )
  };
}

function validateEmail(email: string) {
  if (!email) return 'Gib deine E-Mail-Adresse ein.';
  if (
    email.length > 254 ||
    email.indexOf('@') > 64 ||
    !emailFormat.test(email)
  ) {
    return 'Gib eine gültige E-Mail-Adresse ein.';
  }
}
