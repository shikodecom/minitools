import { PREFECTURES } from '../data/prefectures';
import { VIEWBOX } from '../geo/projection';

export function renderLayout(): string {
  const choices = PREFECTURES.map(([id, name]) => ({ id, name }));
  return `
  <header class="hero">
    <div class="step-list" aria-label="遊び方">
      <span class="step-chip step-one"><b>1</b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19h14M12 4v11m-4-4 4 4 4-4" /></svg>出す</span>
      <span class="step-chip step-two"><b>2</b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v12m0 0-3-3m3 3 3-3m5-5v12m0-12-3 3m3-3 3 3" /></svg>動かす</span>
      <span class="step-chip step-three"><b>3</b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 7-4 7 4-7 4-7-4Zm0 4 7 4 7-4m-14 4 7 4 7-4" /></svg>重ねる</span>
    </div>
    <div class="title-row">
      <div>
        <h1>都道府県移動まっぷす</h1>
        <p class="hero-copy">好きな県を出して、動かして、重ねてみよう！</p>
      </div>
      <svg class="map-friend" viewBox="0 0 100 100" role="img" aria-label="地図のキャラクター">
        <path d="M24 17 53 10l24 14-5 27 10 18-24 17-26-8-13-24 8-17-3-20Z" />
        <circle cx="43" cy="47" r="3" /><circle cx="59" cy="47" r="3" />
        <path class="friend-mouth" d="M46 57q6 6 12 0" /><circle class="friend-cheek" cx="67" cy="56" r="4" />
        <path class="friend-wave" d="M24 50q-13-9-15 3m67-14q12-9 16 0" />
      </svg>
    </div>
  </header>
  <main class="layout">
    <section class="controls" aria-label="地図の操作">
      <h2><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.3 7-12A7 7 0 1 0 5 9c0 5.7 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>どの都道府県を出す？</h2>
      <div class="select-row">
        <label class="prefecture-picker" for="prefecture">
          <svg id="prefecture-preview" class="prefecture-preview" aria-hidden="true"></svg>
          <span class="select-label">都道府県</span>
          <select id="prefecture" aria-label="都道府県">${choices.map((choice) => `<option value="${choice.id}">${choice.name}</option>`).join('')}</select>
          <svg class="select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>
        </label>
        <button id="add" class="primary"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>地図に出す</button>
      </div>
      <div class="action-row">
        <button id="delete" class="danger-action" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>消す</button>
        <button id="undo" class="undo-action" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" /></svg>1つ戻す</button>
        <button id="share" class="share-action" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4m-7.5 6.8 7.5 4.4" /></svg>シェア</button>
      </div>
      <p class="panel-note"><span aria-hidden="true"></span>都道府県は何個でも出せるよ<span aria-hidden="true"></span></p>
    </section>
    <div class="map-area">
      <section class="map-card" aria-label="日本地図キャンバス">
        <div id="loading" class="loading">地図を準備しています…</div>
        <svg id="map" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" role="img" aria-label="都道府県を移動できる日本地図" tabindex="0"></svg>
        <button id="reset" class="map-reset" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>リセット</button>
        <div id="first-guide" class="first-guide is-hidden" aria-live="polite">ドラッグして、好きな場所に重ねてみよう</div>
        <div class="map-zoom" aria-label="地図の拡大縮小">
          <button id="zoom-in" type="button" aria-label="地図を拡大">＋</button>
          <button id="zoom-out" type="button" aria-label="地図を縮小">−</button>
          <button id="zoom-reset" class="zoom-fit" type="button" aria-label="地図を全体表示"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" /></svg><span>全体</span></button>
        </div>
        <div id="share-error" class="share-error" role="alert" hidden>共有画像を作れませんでした。もう一度お試しください。</div>
      </section>
    </div>
  </main>
  <footer>
    <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">地図データ: Natural Earth</a>
  </footer>
`;
}
