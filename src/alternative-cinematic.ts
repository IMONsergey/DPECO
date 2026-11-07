import { renderEcosystem, renderFormats, renderJournalPreview, renderLotsSection, renderProcess, renderRequestForm } from './sections';

/**
 * Variant 02 — cinematic institutional narrative.
 * Uses original typography, CSS geometry and DPECO's verified product content.
 * No fabricated market metrics, partner claims, new lots, or fake CRM submissions.
 */
export function renderCinematicHome(): string {
  return [
    '<div class="cinema-site">',
    '  <section class="cinema-hero" id="top" aria-labelledby="hero-title">',
    '    <div class="cinema-hero__film" aria-hidden="true"><span class="cinema-hero__beam beam-a"></span><span class="cinema-hero__beam beam-b"></span><span class="cinema-hero__beam beam-c"></span><span class="cinema-hero__arc"></span></div>',
    '    <div class="container cinema-hero__inner">',
    '      <div class="cinema-hero__overline"><span class="cinema-hero__live"></span><span>DEBTPRICE / ЭЛЕКТРОННАЯ ТОРГОВАЯ ПЛОЩАДКА</span><span class="cinema-hero__edition">НАПРАВЛЕНИЕ 02 / 20</span></div>',
    '      <div class="cinema-hero__main"><p class="cinema-hero__chapter">ПЛОЩАДКА ДЛЯ РЫНКА ДОЛГОВЫХ АКТИВОВ</p><h1 id="hero-title">У каждого актива<br>есть <span>своя цена.</span></h1><p class="cinema-hero__deck">DEBTPRICE соединяет продавцов и покупателей прав требования. Выбирайте формат торгов, изучайте предложения и готовьте сделки на специализированной площадке.</p>',
    '        <div class="cinema-hero__actions"><a class="cinema-action cinema-action--primary" href="#/sellers/portfeli">Разместить актив <span aria-hidden="true">↗</span></a><a class="cinema-action cinema-action--ghost" href="#/buyers">Выбрать актив <span aria-hidden="true">↗</span></a></div>',
    '      </div>',
    '      <div class="cinema-hero__footer"><span>ПРОДАВЦАМ / ПОКУПАТЕЛЯМ / УЧАСТНИКАМ РЫНКА</span><a href="#cinema-purpose" data-scroll="cinema-purpose">Знакомство с платформой <span aria-hidden="true">↓</span></a></div>',
    '    </div>',
    '  </section>',
    '  <section class="cinema-purpose" id="cinema-purpose" aria-labelledby="cinema-purpose-title"><div class="container cinema-purpose__layout">',
    '    <div class="cinema-purpose__aside"><span class="cinema-index">01 — ЗАДАЧА ПЛАТФОРМЫ</span><span class="cinema-purpose__notation">РЫНОК ПРАВ ТРЕБОВАНИЯ</span></div>',
    '    <div class="cinema-purpose__copy"><h2 id="cinema-purpose-title">Сложный актив.<br><em>Понятный процесс.</em></h2><p>Продажа долга требует прозрачной информации, подходящего формата торгов и ясных условий. Мы выстраиваем путь от первого обращения до договора уступки.</p><a class="cinema-underlink" href="#cinema-routes" data-scroll="cinema-routes">Выбрать свой сценарий <span aria-hidden="true">↘</span></a></div>',
    '  </div></section>',
    '  <section class="cinema-routes" id="cinema-routes" aria-labelledby="cinema-routes-title"><div class="container">',
    '    <div class="cinema-routes__heading"><p class="cinema-index">02 — СЦЕНАРИИ</p><h2 id="cinema-routes-title">Две стороны.<br><span>Одна площадка.</span></h2></div>',
    '    <div class="cinema-routes__grid">',
    '      <article class="cinema-route cinema-route--seller"><div class="cinema-route__head"><span>01 / ПРОДАВЦАМ</span><span class="cinema-route__arrow" aria-hidden="true">↗</span></div><div class="cinema-route__illustration" aria-hidden="true"><span class="cinema-route__folio">01</span><span class="cinema-route__track"></span><span class="cinema-route__disc"></span></div><div class="cinema-route__bottom"><h3>Найти покупателя<br>для актива</h3><p>Долговые портфели и дебиторская задолженность. Выберите подходящий способ размещения и обсудите условия.</p><div class="cinema-route__links"><a href="#/sellers/portfeli">Долговые портфели <span aria-hidden="true">↗</span></a><a href="#/sellers/debitorka">Дебиторская задолженность <span aria-hidden="true">↗</span></a></div></div></article>',
    '      <article class="cinema-route cinema-route--buyer"><div class="cinema-route__head"><span>02 / ПОКУПАТЕЛЯМ</span><span class="cinema-route__arrow" aria-hidden="true">↗</span></div><div class="cinema-route__illustration" aria-hidden="true"><span class="cinema-route__folio">02</span><span class="cinema-route__track"></span><span class="cinema-route__disc"></span></div><div class="cinema-route__bottom"><h3>Выбрать актив<br>для покупки</h3><p>Изучайте состав и условия лотов, определяйте интересные предложения и переходите к участию в торгах.</p><div class="cinema-route__links"><a href="#/buyers">Предложения покупателям <span aria-hidden="true">↗</span></a><a href="https://my.debtprice.market/site/login" target="_blank" rel="noopener noreferrer">Личный кабинет ЭТП <span aria-hidden="true">↗</span></a></div></div></article>',
    '    </div>',
    '  </div></section>',
    '  <section class="cinema-manifest" aria-labelledby="cinema-manifest-title"><div class="container cinema-manifest__layout"><span class="cinema-index">03 — НАШ ПОДХОД</span><div><h2 id="cinema-manifest-title">Не просто витрина лотов.<br><span>Инструмент для сделки.</span></h2><p>От выбора категории актива до оформления уступки — участникам важны конкретные действия, а не обещания. Поэтому каждый этап показан последовательно.</p></div></div></section>',
    renderLotsSection(),
    '  <div class="cinema-native-sections">',
    renderFormats(),
    renderProcess('home'),
    '  </div>',
    '  <section class="cinema-cta" aria-labelledby="cinema-cta-title"><div class="container cinema-cta__content"><p class="cinema-index">04 — НАЧАЛО ДИАЛОГА</p><h2 id="cinema-cta-title">Есть актив<br>для продажи?</h2><p>Расскажите о портфеле. Начнем с состава задолженности, документов и подходящего формата размещения.</p><a class="cinema-action cinema-action--primary" href="#request" data-scroll="request">Обсудить размещение <span aria-hidden="true">↗</span></a></div></section>',
    renderRequestForm('portfolio'),
    '  <div class="cinema-native-sections cinema-native-sections--end">',
    renderEcosystem(),
    renderJournalPreview(),
    '  </div>',
    '</div>'
  ].join('');
}
