export function readText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';
}

export function validateText(
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
