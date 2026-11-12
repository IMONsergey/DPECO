import { escapeHtml, icon } from './ui';
import { mountPhoneInput, phoneValidationMessage } from './phone-input';

const fieldNames: Record<string, string> = {
  name: 'Имя', company: 'Организация', email: 'Email', phone: 'Телефон',
  interest: 'Направление', inn: 'ИНН организации', kpp: 'КПП', debtorInn: 'ИНН должника', amount: 'Сумма задолженности', message: 'Задача',
};


type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function validateField(field: Field): void {
  field.setCustomValidity('');
  if (field.disabled || (field instanceof HTMLInputElement && field.type === 'hidden')) return;
  const value = field.value.trim();
  let error = '';
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    if (field.required && !field.checked) error = 'Подтвердите согласие на обработку персональных данных.';
  } else if (field.required && !value) error = 'Заполните это поле.';
  else if (value) {
    if (field.name === 'name' && ((value.match(/\p{L}/gu)?.length ?? 0) < 2 || !/^[\p{L}\p{M}\s.'’ʼ-]+$/u.test(value) || value.length > 120)) {
      error = 'Укажите имя буквами, от 2 до 120 символов. Можно использовать пробел, дефис и апостроф.';
    } else if (field.name === 'company' && (value.length < 2 || value.length > 180 || !/\p{L}/u.test(value) || /[<>\u0000-\u001f]/u.test(value))) {
      error = 'Укажите полное название организации, от 2 до 180 символов.';
    } else if (field.name === 'email' && (field.validity.typeMismatch || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>.]+$/u.test(value) || value.includes('..') || value.length > 254)) {
      error = 'Укажите email в формате name@company.ru.';
    } else if (field.name === 'phone') error = phoneValidationMessage(value);
    else if (['inn', 'debtorInn'].includes(field.name) && !/^(?:\d{10}|\d{12})$/u.test(value)) error = 'Укажите ИНН: 10 или 12 цифр.';
    else if (field.name === 'kpp' && !/^\d{9}$/u.test(value)) error = 'Укажите КПП: 9 цифр.';
    else if (field.name === 'amount') {
      const amount = Number(value.replace(/[\s\u00a0₽]/gu, '').replace(',', '.'));
      if (!Number.isFinite(amount) || amount < 500000) error = 'Укажите сумму от 500 000 ₽.';
    } else if (field.name === 'message' && value.length > 2000) error = 'Сократите описание до 2000 символов.';
  }
  field.setCustomValidity(error);
  field.setAttribute('aria-invalid', field.validity.valid ? 'false' : 'true');
}

/** The form only prepares a local draft; it never submits or opens another app. */
export function mountRequestForms(app: HTMLElement, notify: (text: string) => void): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const drafts = new WeakMap<HTMLFormElement, string>();

  for (const form of app.querySelectorAll<HTMLFormElement>('[data-request-form]')) {
    const fields = [...form.querySelectorAll<Field>('input, textarea, select')];
    form.noValidate = true;
    for (const field of fields) {
      if (['name', 'company', 'email', 'phone', 'consent'].includes(field.name)) field.required = true;
      if (field instanceof HTMLInputElement && field.name === 'phone') mountPhoneInput(field, signal);
      field.addEventListener('blur', () => validateField(field), { signal });
    }
    form.addEventListener('input', (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
        input.setCustomValidity('');
        if (input.hasAttribute('aria-invalid')) validateField(input);
      }
      const status = form.querySelector<HTMLElement>('.request__status');
      if (status && !status.hidden) { status.hidden = true; status.replaceChildren(); drafts.delete(form); }
    }, { signal });

    form.addEventListener('reset', () => {
      for (const field of fields) { field.setCustomValidity(''); field.removeAttribute('aria-invalid'); }
      const status = form.querySelector<HTMLElement>('.request__status');
      if (status) { status.hidden = true; status.replaceChildren(); }
      drafts.delete(form);
    }, { signal });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      for (const field of fields) {
        if (!(field instanceof HTMLInputElement && ['checkbox', 'hidden'].includes(field.type))) field.value = field.value.trim();
        validateField(field);
      }
      if (!form.reportValidity()) return;

      const subjects: Record<string, string> = { general: 'Заявка с сайта DEBTPRICE', portfolio: 'Оценка портфеля физических лиц', receivables: 'Оценка дебиторской задолженности', buyer: 'Подбор долгового актива' };
      const subject = subjects[form.dataset.kind ?? 'general'] ?? subjects.general!;
      const lines: string[] = [];
      for (const [name, rawValue] of new FormData(form)) {
        if (name === 'consent' || typeof rawValue !== 'string' || !rawValue.trim()) continue;
        lines.push(`${fieldNames[name] ?? name}: ${rawValue.trim()}`);
      }
      const body = `${subject}\n\n${lines.join('\n')}\n\nСогласие на обработку персональных данных подтверждено в форме сайта.`;
      drafts.set(form, body);
      const status = form.querySelector<HTMLElement>('.request__status');
      if (!status) return;
      status.innerHTML = `<h3>Черновик заявки</h3><p>Проверьте данные и скопируйте текст. Заявка не отправлена.</p><pre class="request__draft">${escapeHtml(lines.join('\n'))}</pre><div class="request__review-actions"><button class="text-link" type="button" data-copy-request>Скопировать текст ${icon('document')}</button></div>`;
      status.hidden = false;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) status.animate([{ opacity: .5, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
      status.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
    }, { signal });

    form.addEventListener('click', async (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-copy-request]') : null;
      if (!target) return;
      const draft = drafts.get(form);
      if (!draft) return;
      try { await navigator.clipboard.writeText(draft); if (!signal.aborted) notify('Текст заявки скопирован'); }
      catch { if (!signal.aborted) notify('Выделите и скопируйте текст заявки из блока выше'); }
    }, { signal });
  }
  return () => abort.abort();
}
