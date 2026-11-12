const callingCodes: Record<string, string> = {
  RU: '7', KZ: '7', US: '1', CA: '1', BY: '375', UA: '380', AM: '374',
  GE: '995', AZ: '994', KG: '996', UZ: '998', TJ: '992', TM: '993',
  GB: '44', DE: '49', FR: '33', IT: '39', ES: '34', PT: '351', PL: '48',
  NL: '31', CH: '41', AT: '43', SE: '46', NO: '47', DK: '45', FI: '358',
  TR: '90', AE: '971', IL: '972', CN: '86', IN: '91', JP: '81', KR: '82',
  AU: '61', NZ: '64', BR: '55', MX: '52',
};
const codes = [...new Set(Object.values(callingCodes))].sort((a, b) => b.length - a.length);

/** A browser preference is only a hint; the visitor can always replace +country. */
export function defaultCallingCode(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (/^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Ulyanovsk|Kirov|Astrakhan)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Novokuznetsk|Tomsk|Barnaul|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Vladivostok|Khandyga|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr|Almaty|Qostanay|Qyzylorda|Aqtobe|Aqtau|Atyrau|Oral))$/u.test(zone)) return '7';
  for (const language of navigator.languages) {
    try {
      const region = new Intl.Locale(language).maximize().region;
      if (region && callingCodes[region]) return callingCodes[region]!;
    } catch { /* An unknown locale leaves the international field editable. */ }
  }
  return '';
}

export function normalizePhone(value: string, countryCode = ''): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/gu, '');
  if (!digits) return trimmed.startsWith('+') ? '+' : '';
  if (trimmed.startsWith('+')) return '+' + digits;
  if (trimmed.startsWith('00')) return '+' + digits.slice(2);
  if (countryCode === '7' && digits.length === 11 && digits.startsWith('8')) return '+7' + digits.slice(1);
  if (['7', '1'].includes(countryCode) && digits.length === 11 && digits.startsWith(countryCode)) return '+' + digits;
  return '+' + countryCode + digits;
}

export function formatPhone(value: string, countryCode = ''): string {
  const normalized = normalizePhone(value, countryCode);
  const digits = normalized.slice(1);
  const code = codes.find((candidate) => digits.startsWith(candidate));
  if (!code || digits.length <= code.length) return normalized;
  const local = digits.slice(code.length);
  if (code === '7' || code === '1') {
    const first = local.slice(0, 3), second = local.slice(3, 6), last = local.slice(6);
    return '+' + code + ' (' + first + (first.length === 3 ? ')' : '') +
      (second ? ' ' + second : '') + (last ? '-' + (code === '7' ? last.slice(0, 2) + (last.length > 2 ? '-' + last.slice(2) : '') : last) : '');
  }
  return '+' + code + ' ' + (local.match(/.{1,3}/gu) ?? []).join(' ');
}

export function phoneValidationMessage(value: string): string {
  const normalized = normalizePhone(value);
  const digits = normalized.slice(1);
  const code = codes.find((candidate) => digits.startsWith(candidate));
  const local = code ? digits.slice(code.length) : digits;
  if (!/^\+[1-9]\d{7,14}$/u.test(normalized) ||
      ((code === '7' || code === '1') && local.length !== 10) ||
      /^(.)\1{5,}$/u.test(local)) {
    return 'Укажите полный номер с кодом страны. Например: +7 (915) 972-41-01. Для другой страны измените код после +.';
  }
  return '';
}

export function mountPhoneInput(input: HTMLInputElement, signal: AbortSignal): void {
  const countryCode = defaultCallingCode();
  input.inputMode = 'tel';
  input.autocomplete = 'tel';
  input.maxLength = 32;
  input.placeholder = countryCode === '7' ? '+7 (___) ___-__-__' : countryCode ? '+' + countryCode + ' ___ ___ ____' : '+код страны и номер';
  input.title = 'Код страны можно изменить: введите + и нужный код.';
  const format = (): void => {
    const raw = input.value;
    const cursor = input.selectionStart ?? raw.length;
    const before = raw.slice(0, cursor).replace(/\D/gu, '').length;
    const next = formatPhone(raw, countryCode);
    const added = next.replace(/\D/gu, '').length - raw.replace(/\D/gu, '').length;
    input.value = next;
    let remaining = Math.max(0, before + added), position = next.startsWith('+') ? 1 : 0;
    while (position < next.length && remaining > 0) {
      if (/\d/u.test(next[position]!)) remaining--;
      position++;
    }
    input.setSelectionRange(position, position);
  };
  input.addEventListener('focus', () => {
    if (!input.value && countryCode) input.value = '+' + countryCode;
  }, { signal });
  input.addEventListener('input', format, { signal });
  input.addEventListener('beforeinput', (event) => {
    if (!(event instanceof InputEvent) || !['deleteContentBackward', 'deleteContentForward'].includes(event.inputType) ||
        input.selectionStart !== input.selectionEnd) return;
    const backwards = event.inputType === 'deleteContentBackward';
    let position = (input.selectionStart ?? 0) - (backwards ? 1 : 0);
    if (position < 0 || position >= input.value.length || /\d/u.test(input.value[position]!)) return;
    while (position >= 0 && position < input.value.length && !/\d/u.test(input.value[position]!)) position += backwards ? -1 : 1;
    if (position < 0 || position >= input.value.length) return;
    event.preventDefault();
    input.setRangeText('', position, position + 1, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, { signal });
  if (input.value) format();
}
