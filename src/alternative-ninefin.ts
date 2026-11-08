import { lots } from './data/lots';
import { renderEcosystem, renderFormats, renderJournalPreview, renderLotsSection, renderProcess, renderRequestForm } from './sections';
import { escapeHtml, rubles } from './ui';
import './alternative-ninefin.css';

/**
 * Direction 05. Original DEBTPRICE interpretation of 9fin.com's product-led
 * information hierarchy. Data below is the public 29.10.2026 ARCHIVE,
 * never a representation of live or available inventory.
 */
export function renderNinefinHome(): string {
  const archival = lots.filter((lot) => lot.kind !== 'sold').slice(0, 4);
  const rows = archival.map((lot) => `<tr>
    <td><a href="#/?lot=${encodeURIComponent(lot.id)}">${escapeHtml(lot.name)} <span aria-hidden="true">↗</span></a></td>
    <td><span class="ninefin-category">${lot.category === 'receivables' ? 'Дебиторская задолженность' : 'Портфель физлиц'}</span></td>
    <td class="ninefin-value">${rubles(lot.debt)}</td>
  </tr>`).join('');
  return `
  <div class="ninefin-site">
    <section class="ninefin-hero" id="top" aria-labelledby="hero-title">
      <div class="container ninefin-hero__layout">
        <div class="ninefin-hero__copy">
          <p class="ninefin-kicker"><span class="ninefin-pip"></span> ПЛАТФОРМА ДОЛГОВЫХ АКТИВОВ</p>
          <h1 id="hero-title">Решения начинаются<br>с <em>ясной картины.</em></h1>
          <p class="ninefin-hero__lead">Продажа и покупка прав требования без лишних предположений. Изучите типы активов, условия торгов и последовательность сделки.</p>
          <div class="ninefin-hero__actions">
            <a class="ninefin-button ninefin-button--primary" href="#/buyers">Изучить предложения <span aria-hidden="true">↗</span></a>
            <a class="ninefin-button ninefin-button--secondary" href="#/sellers/portfeli">Разместить актив <span aria-hidden="true">↗</span></a>
          </div>
          <div class="ninefin-hero__note"><span>ДЛЯ ПОКУПАТЕЛЕЙ И ПРОДАВЦОВ</span><span>АКТИВЫ / ТОРГИ / ДОКУМЕНТЫ</span></div>
        </div>
        <div class="ninefin-product" aria-label="Пример архивного каталога лотов DEBTPRICE">
          <div class="ninefin-product__top"><span class="ninefin-product__mark">DP<span> / </span>АРХИВ</span><span class="ninefin-product__date">Срез от 29.10.2026</span></div>
          <div class="ninefin-product__intro"><div><small>ПОСЛЕДОВАТЕЛЬНОСТЬ ВЫБОРА</small><h2>Сначала данные.<br>Затем решение.</h2></div><div class="ninefin-product__index">01<span>/03</span></div></div>
          <div class="ninefin-product__toolbar"><span>АРХИВНЫЙ СПИСОК ЛОТОВ</span><span>${archival.length} записи</span></div>
          <div class="ninefin-product__scroll"><table class="ninefin-product__table"><caption class="sr-only">Исторические данные из публичного каталога DEBTPRICE на 29 октября 2026 года</caption><thead><tr><th scope="col">Актив</th><th scope="col">Категория</th><th scope="col">Номинал</th></tr></thead><tbody>${rows}</tbody></table></div>
          <div class="ninefin-product__foot"><p>Исторический пример интерфейса. Эти записи не подтверждают текущую доступность активов.</p><a href="#lots" data-scroll="lots">Подробнее об архиве <span aria-hidden="true">↗</span></a></div>
        </div>
      </div>
      <div class="container ninefin-hero__foot"><span>АРХИТЕКТУРА ПОНЯТНОЙ СДЕЛКИ</span><a href="#ninefin-advantage" data-scroll="ninefin-advantage">Дальше <span aria-hidden="true">↓</span></a></div>
    </section>
    <section class="ninefin-advantage" id="ninefin-advantage" aria-labelledby="ninefin-advantage-title">
      <div class="container ninefin-advantage__layout">
        <div class="ninefin-advantage__fixed"><p class="ninefin-label">01 / КАК УСТРОЕНА ПЛОЩАДКА</p><h2 id="ninefin-advantage-title">Меньше неопределенности.<br><span>Больше предметных шагов.</span></h2><p>Не обещаем неизвестных результатов. Показываем, какие действия потребуются участнику до сделки.</p></div>
        <ol class="ninefin-advantage__list">
          <li><span class="ninefin-advantage__number">01</span><div><h3>Выберите тип актива</h3><p>Портфели физических лиц и дебиторская задолженность требуют разных входных данных и документов.</p><a href="#/sellers/debitorka">О дебиторской задолженности <span aria-hidden="true">↗</span></a></div></li>
          <li><span class="ninefin-advantage__number">02</span><div><h3>Сравните условия размещения</h3><p>Формат торгов определяет, как собираются предложения, устанавливается цена и выбирается покупатель.</p><a href="#formats" data-scroll="formats">Форматы торгов <span aria-hidden="true">↗</span></a></div></li>
          <li><span class="ninefin-advantage__number">03</span><div><h3>Перейдите к документам</h3><p>Условия уступки и состав пакета документов согласуются в процессе сделки.</p><a href="#/docs">Документы и реквизиты <span aria-hidden="true">↗</span></a></div></li>
        </ol>
      </div>
    </section>
    <section class="ninefin-roles" id="ninefin-roles" aria-labelledby="ninefin-roles-title">
      <div class="container"><header class="ninefin-roles__header"><p class="ninefin-label">02 / ДВА СЦЕНАРИЯ</p><h2 id="ninefin-roles-title">Ваш следующий шаг<br>зависит от задачи.</h2></header>
        <div class="ninefin-roles__lines">
          <article class="ninefin-role"><span class="ninefin-role__index">01 / ПРОДАВЦАМ</span><div><h3>Подготовить актив<br>к размещению</h3><p>Определите структуру портфеля или отдельного права требования и передайте необходимые сведения.</p></div><div class="ninefin-role__links"><a href="#/sellers/portfeli">Продажа портфелей <span aria-hidden="true">↗</span></a><a href="#/sellers/debitorka">Продажа дебиторки <span aria-hidden="true">↗</span></a></div></article>
          <article class="ninefin-role"><span class="ninefin-role__index">02 / ПОКУПАТЕЛЯМ</span><div><h3>Оценить предложение<br>перед участием</h3><p>Изучите состав лота, документы и предусмотренный формат торгов до принятия решения.</p></div><div class="ninefin-role__links"><a href="#/buyers">Раздел покупателя <span aria-hidden="true">↗</span></a><a href="https://my.debtprice.market/site/login" target="_blank" rel="noopener noreferrer">Личный кабинет ЭТП <span aria-hidden="true">↗</span></a></div></article>
        </div>
      </div>
    </section>
    <div class="ninefin-archive"><div class="container ninefin-archive__intro"><p class="ninefin-label">03 / ИСТОРИЧЕСКИЕ ПРИМЕРЫ</p><div><h2>Лоты из архива.</h2><p>Ниже показан срез от 29 октября 2026 года. Актуальность лотов и условия участия проверяются в действующей ЭТП.</p></div></div>${renderLotsSection()}</div>
    <div class="ninefin-native"><div class="container ninefin-native__intro"><p class="ninefin-label">04 / ПРАВИЛА РЫНКА</p><h2>Формат влияет<br>на результат.</h2></div>${renderFormats()}${renderProcess('home')}</div>
    <section class="ninefin-cta" aria-labelledby="ninefin-cta-title"><div class="container ninefin-cta__layout"><p class="ninefin-label">05 / НАЧАТЬ</p><div><h2 id="ninefin-cta-title">Есть актив?<br><span>Разберем задачу.</span></h2><p>Опишите тип задолженности и вашу цель. Форма подготовит письмо, которое вы проверите и отправите самостоятельно.</p><a class="ninefin-button ninefin-button--primary" href="#request" data-scroll="request">Подготовить обращение <span aria-hidden="true">↗</span></a></div></div></section>
    ${renderRequestForm('portfolio')}
    <div class="ninefin-end">${renderEcosystem()}${renderJournalPreview()}</div>
  </div>`;
}
