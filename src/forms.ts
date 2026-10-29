import { escapeHtml, icon } from './ui';

const fieldNames: Record<string, string> = {
  name: 'Имя', company: 'Организация', email: 'Email', phone: 'Телефон',
  inn: 'ИНН организации', kpp: 'КПП', debtorInn: 'ИНН должника', amount: 'Сумма задолженности', message: 'Задача',
};

/** No network submission: the visitor reviews an email draft and sends it themselves. */
export function mountRequestForms(app: HTMLElement, notify: (text: string) => void): () => void {
  const abort = new AbortController();
  const { signal } = abort;
  const drafts = new WeakMap<HTMLFormElement, string>();

  for (const form of app.querySelectorAll<HTMLFormElement>('[data-request-form]')) {
    form.addEventListener('input', (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.setCustomValidity('');
      const status = form.querySelector<HTMLElement>('.request__status');
      if (status && !status.hidden) { status.hidden = true; status.replaceChildren(); drafts.delete(form); }
    }, { signal });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      for (const field of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="checkbox"]), textarea')) {
        field.value = field.value.trim();
        field.setCustomValidity('');
        if (field.required && !field.value) field.setCustomValidity('Заполните это поле.');
      }
      const phone = form.elements.namedItem('phone');
      if (phone instanceof HTMLInputElement && phone.value.replace(/\D/gu, '').length < 10) phone.setCustomValidity('Укажите номер с кодом страны или города: не менее 10 цифр.');
      const amount = form.elements.namedItem('amount');
      if (amount instanceof HTMLInputElement) {
        const value = Number(amount.value.replace(/[\s\u00a0₽]/gu, '').replace(',', '.'));
        if (!Number.isFinite(value) || value < 500000) amount.setCustomValidity('Укажите сумму от 500 000 ₽.');
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
      const recipient = form.dataset.kind === 'receivables' ? 'debt@debtprice.market' : form.dataset.kind === 'portfolio' ? 'sales@debtprice.market' : 'v@debtprice.market';
      const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const status = form.querySelector<HTMLElement>('.request__status');
      if (!status) return;
      status.innerHTML = `<h3>Заявка готова к отправке</h3><p>Проверьте данные. Кнопка откроет письмо на <strong>${recipient}</strong> в вашей почтовой программе.</p><pre class="request__draft">${escapeHtml(lines.join('\n'))}</pre><div class="request__review-actions"><a class="button button--dark" href="${escapeHtml(mailto)}">Открыть письмо ${icon('mail')}</a><button class="text-link" type="button" data-copy-request>Скопировать текст ${icon('document')}</button></div><small>Письмо отправляется вами из почты. Если почтовая программа не настроена, скопируйте текст и отправьте его на указанный адрес.</small>`;
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
