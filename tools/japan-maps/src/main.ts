import './styles.css';
import { addPiece, createInitialState, deleteSelectedPiece, PIECE_LIMIT, selectPiece, updatePiece } from './app/state';
import { clearWorkspace, loadWorkspace, saveWorkspace } from './app/storage';
import { shareMap } from './export/share';
import { clientToSvg, constrainTranslation, projectShapes, VIEWBOX } from './geo/projection';
import type { AppState, JapanGeoJson, Piece, PrefectureId, ProjectedShape } from './types';
import { PREFECTURES } from './data/prefectures';

const choices: Array<{ id: PrefectureId; name: string }> = PREFECTURES.map(([id, name]) => ({ id, name }));
const INITIAL_ZOOM = 1.1;

let state: AppState = createInitialState();
let shapes = new Map<string, ProjectedShape>();
let svg: SVGSVGElement;
const camera = { zoom: INITIAL_ZOOM, centerX: VIEWBOX.width / 2, centerY: VIEWBOX.height / 2 };
const activePointers = new Map<number, { x: number; y: number }>();
let cameraPan: { pointerId: number; startX: number; startY: number; centerX: number; centerY: number } | null = null;
let pinch: { distance: number; anchor: { x: number; y: number }; pointerIds: [number, number] } | null = null;
let cancelActivePieceGesture: (() => void) | null = null;
type OnboardingStage = 'ready' | 'placed' | 'done';
let onboardingStage: OnboardingStage = 'ready';
type HistoryEntry = { state: AppState; camera: typeof camera; onboardingStage: OnboardingStage };
const history: HistoryEntry[] = [];
const HISTORY_LIMIT = 50;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
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

setupIframeHeightMessaging();

const select = document.querySelector<HTMLSelectElement>('#prefecture')!;
const addButton = document.querySelector<HTMLButtonElement>('#add')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete')!;
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;
const shareButton = document.querySelector<HTMLButtonElement>('#share')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
const zoomResetButton = document.querySelector<HTMLButtonElement>('#zoom-reset')!;
const previewSvg = document.querySelector<SVGSVGElement>('#prefecture-preview')!;
svg = document.querySelector<SVGSVGElement>('#map')!;
svg.addEventListener('pointerdown', onViewportPointerDown, { capture: true });
svg.addEventListener('pointermove', onViewportPointerMove, { capture: true });
svg.addEventListener('pointerup', onViewportPointerEnd, { capture: true });
svg.addEventListener('pointercancel', onViewportPointerEnd, { capture: true });

void initialize();

async function initialize(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/japan-prefectures.geojson`);
    if (!response.ok) throw new Error(`GeoJSON: ${response.status}`);
    const data = await response.json() as JapanGeoJson;
    validateData(data);
    shapes = projectShapes(data);
    const saved = loadWorkspace();
    if (saved) {
      state = saved.state;
      onboardingStage = saved.onboardingStage ?? (state.pieces.length === 0 ? 'ready' : 'done');
      updateFirstGuide();
      setCamera(saved.camera.centerX, saved.camera.centerY, saved.camera.zoom);
    } else {
      state = createDefaultState();
      onboardingStage = 'ready';
      updateFirstGuide();
      setCamera(VIEWBOX.width / 2, VIEWBOX.height / 2, INITIAL_ZOOM);
    }
    document.querySelector('#loading')?.remove();
    render();
  } catch (error) {
    console.error(error);
    document.querySelector('#loading')!.textContent = '地図を読み込めませんでした。ページを再読み込みしてください。';
    addButton.disabled = true;
  }
}

function validateData(data: JapanGeoJson): void {
  if (data.type !== 'FeatureCollection' || data.features.length !== 47) throw new Error('Expected 47 prefecture features');
  const availableIds = new Set(data.features.map((feature) => feature.properties.id));
  for (const choice of choices) {
    if (!availableIds.has(choice.id)) throw new Error(`Missing ${choice.id}`);
  }
}

select.addEventListener('change', () => {
  const nextId = select.value as PrefectureId;
  state = { ...state, selectedPrefectureId: nextId, selectedPieceId: null };
  render();
});

addButton.addEventListener('click', () => {
  const isFirstPlacement = onboardingStage === 'ready' && state.pieces.length === 0 && state.selectedPrefectureId === 'JP-01';
  if (!isFirstPlacement) markInteracted();
  if (state.pieces.length >= PIECE_LIMIT) return notify('ピースは20個まで追加できます。');
  const shape = shapes.get(state.selectedPrefectureId);
  if (!shape) return;
  pushHistory();
  state = addPiece(state, state.selectedPrefectureId, {
    x: camera.centerX - shape.center[0],
    y: camera.centerY - shape.center[1],
  });
  if (isFirstPlacement) {
    onboardingStage = 'placed';
    updateFirstGuide();
  }
  render();
});

deleteButton.addEventListener('click', deleteSelection);
undoButton.addEventListener('click', undoLastOperation);

shareButton.addEventListener('click', async () => {
  shareButton.disabled = true;
    shareButton.textContent = '準備中…';
  try {
    const result = await shareMap(svg, state.selectedPrefectureId, state.pieces);
    if (result === 'shared') notify('共有シートを開きました。');
    if (result === 'downloaded') notify('画像共有に対応していないため、PNGを保存しました。');
  } catch (error) {
    console.error(error);
    showShareError();
  } finally {
    shareButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.4m-7.5 6.8 7.5 4.4" /></svg>シェア';
    updateControls();
  }
});

resetButton.addEventListener('click', resetEverything);

zoomInButton.addEventListener('click', () => zoomCameraAt(camera.zoom * 1.35));
zoomOutButton.addEventListener('click', () => zoomCameraAt(camera.zoom / 1.35));
for (const button of [zoomInButton, zoomOutButton, zoomResetButton]) {
  button.addEventListener('dblclick', (event) => event.preventDefault());
}
zoomResetButton.addEventListener('click', () => {
  setCamera(VIEWBOX.width / 2, VIEWBOX.height / 2, INITIAL_ZOOM);
});
svg.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoomCameraAt(camera.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12), event.clientX, event.clientY);
}, { passive: false });

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  const target = event.target as HTMLElement;
  if (target.matches('input, select, textarea, [contenteditable="true"]')) return;
  if (!state.selectedPieceId) return;
  event.preventDefault();
  deleteSelection();
});

function render(): void {
  const background = [...shapes.values()]
    .map((shape) => `<path class="prefecture-boundary" d="${shape.path}" vector-effect="non-scaling-stroke" />`)
    .join('');
  const pieces = [...state.pieces]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((piece) => renderPiece(piece, shapes.get(piece.prefectureId)!))
    .join('');
  svg.innerHTML = `
    <rect class="map-background" width="1000" height="760" rx="24" />
    <g class="map-decor" aria-hidden="true">
      <g class="cloud cloud-a"><path d="M74 145c0-18 15-32 33-32 13 0 24 7 29 18 5-4 12-6 19-6 17 0 31 13 31 30H74Z" /></g>
      <g class="plane"><path d="m188 190 54-19 13 8-43 27-9 24-8-2 1-21-25 4-6-6 23-15Z"/><path class="trail" d="M165 211C105 235 62 274 28 320" /></g>
      <g class="sparkles"><path d="m154 444 5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12Zm687-243 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Zm34 352 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" /></g>
      <path class="travel-route" d="M735 515c74-20 102-73 76-130" />
    </g>
    <g class="japan-background">${background}</g>
    <g id="pieces">${pieces}</g>
  `;
  svg.addEventListener('pointerdown', onCanvasPointerDown);
  bindPieceInteractions();
  updateControls();
  persistWorkspace();
}

function renderPiece(piece: Piece, shape: ProjectedShape): string {
  const selected = piece.id === state.selectedPieceId;
  const [cx, cy] = shape.center;
  const handleY = shape.bounds[0][1] - 32;
  return `
    <g class="piece${selected ? ' is-selected' : ''}" data-piece-id="${piece.id}" data-testid="piece"
      transform="translate(${piece.x} ${piece.y}) rotate(${piece.rotation} ${cx} ${cy})">
      <path class="piece-hit-area" data-export="exclude" d="${shape.path}" vector-effect="non-scaling-stroke" />
      <path class="piece-shape" d="${shape.path}" vector-effect="non-scaling-stroke" />
      ${selected ? `<g data-export="exclude" class="selection-ui">
        <rect class="selection-box" x="${shape.bounds[0][0]}" y="${shape.bounds[0][1]}" width="${shape.bounds[1][0] - shape.bounds[0][0]}" height="${shape.bounds[1][1] - shape.bounds[0][1]}" rx="6" />
        <line class="handle-line" x1="${cx}" y1="${shape.bounds[0][1]}" x2="${cx}" y2="${handleY}" />
        <circle class="rotation-handle" data-rotate-handle cx="${cx}" cy="${handleY}" r="18" />
        <text class="rotation-icon" x="${cx}" y="${handleY + 7}" text-anchor="middle">↻</text>
      </g>` : ''}
    </g>`;
}

function bindPieceInteractions(): void {
  svg.querySelectorAll<SVGGElement>('[data-piece-id]').forEach((group) => {
    group.addEventListener('pointerdown', onPiecePointerDown);
  });
  svg.querySelector<SVGCircleElement>('[data-rotate-handle]')?.addEventListener('pointerdown', onRotatePointerDown);
}

function onViewportPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  try { svg.setPointerCapture(event.pointerId); } catch { /* Capture is best-effort on older Safari. */ }

  if (activePointers.size >= 2) {
    event.preventDefault();
    event.stopImmediatePropagation();
    cancelActivePieceGesture?.();
    cameraPan = null;
    const entries = [...activePointers.entries()].slice(0, 2);
    const midpoint = pointerMidpoint(entries[0][1], entries[1][1]);
    pinch = {
      distance: pointerDistance(entries[0][1], entries[1][1]),
      anchor: clientToSvg(svg, midpoint.x, midpoint.y),
      pointerIds: [entries[0][0], entries[1][0]],
    };
    document.body.classList.add('is-interacting');
    return;
  }

  const target = event.target as Element;
  if (!target.closest('[data-piece-id]')) {
    event.preventDefault();
    cameraPan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centerX: camera.centerX,
      centerY: camera.centerY,
    };
    document.body.classList.add('is-interacting');
  }
}

function onViewportPointerMove(event: PointerEvent): void {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pinch) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const first = activePointers.get(pinch.pointerIds[0]);
    const second = activePointers.get(pinch.pointerIds[1]);
    if (!first || !second) return;
    const midpoint = pointerMidpoint(first, second);
    const nextZoom = camera.zoom * (pointerDistance(first, second) / Math.max(1, pinch.distance));
    pinch.distance = pointerDistance(first, second);
    setCameraFromAnchor(nextZoom, pinch.anchor, midpoint.x, midpoint.y);
    pinch.anchor = clientToSvg(svg, midpoint.x, midpoint.y);
    return;
  }

  if (cameraPan?.pointerId === event.pointerId) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = svg.getBoundingClientRect();
    const worldPerPixel = (VIEWBOX.width / camera.zoom) / rect.width;
    setCamera(
      cameraPan.centerX - (event.clientX - cameraPan.startX) * worldPerPixel,
      cameraPan.centerY - (event.clientY - cameraPan.startY) * worldPerPixel,
      camera.zoom,
    );
  }
}

function onViewportPointerEnd(event: PointerEvent): void {
  activePointers.delete(event.pointerId);
  if (pinch) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activePointers.size < 2) {
      pinch = null;
      activePointers.clear();
      cameraPan = null;
    }
  }
  if (cameraPan?.pointerId === event.pointerId) cameraPan = null;
  if (!pinch && !cameraPan && !cancelActivePieceGesture) document.body.classList.remove('is-interacting');
}

function pointerDistance(first: { x: number; y: number }, second: { x: number; y: number }): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerMidpoint(first: { x: number; y: number }, second: { x: number; y: number }): { x: number; y: number } {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function onCanvasPointerDown(event: PointerEvent): void {
  if (event.target === svg || (event.target as Element).classList.contains('map-background') || (event.target as Element).classList.contains('prefecture-boundary')) {
    state = selectPiece(state, null);
    render();
  }
}

function onPiecePointerDown(event: PointerEvent): void {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  if ((event.target as Element).hasAttribute('data-rotate-handle')) return;
  event.preventDefault();
  event.stopPropagation();
  const group = event.currentTarget as SVGGElement;
  const id = group.dataset.pieceId!;
  const beforeGesture = historyEntry();
  let historyRecorded = false;
  state = selectPiece(state, id);
  render();
  const piece = state.pieces.find((item) => item.id === id)!;
  const shape = shapes.get(piece.prefectureId)!;
  const start = clientToSvg(svg, event.clientX, event.clientY);
  const origin = { x: piece.x, y: piece.y };
  beginPointerGesture(event.pointerId, (move) => {
    if (!historyRecorded) { pushHistory(beforeGesture); historyRecorded = true; }
    markInteracted();
    svg.querySelector<SVGGElement>(`[data-piece-id="${id}"]`)?.classList.add('is-dragging');
    const point = clientToSvg(svg, move.clientX, move.clientY);
    const constrained = constrainTranslation(origin.x + point.x - start.x, origin.y + point.y - start.y, shape.bounds);
    state = updatePiece(state, id, constrained);
    updatePieceTransform(id);
  }, () => render());
}

function onRotatePointerDown(event: PointerEvent): void {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  event.stopPropagation();
  const id = state.selectedPieceId;
  if (!id) return;
  const piece = state.pieces.find((item) => item.id === id)!;
  const shape = shapes.get(piece.prefectureId)!;
  const center = { x: shape.center[0] + piece.x, y: shape.center[1] + piece.y };
  const startPoint = clientToSvg(svg, event.clientX, event.clientY);
  const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x) * 180 / Math.PI;
  const originRotation = piece.rotation;
  const beforeGesture = historyEntry();
  let historyRecorded = false;
  beginPointerGesture(event.pointerId, (move) => {
    if (!historyRecorded) { pushHistory(beforeGesture); historyRecorded = true; }
    markInteracted();
    const point = clientToSvg(svg, move.clientX, move.clientY);
    const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
    state = updatePiece(state, id, { rotation: originRotation + angle - startAngle });
    updatePieceTransform(id);
  }, () => render());
}

function beginPointerGesture(pointerId: number, move: (event: PointerEvent) => void, end: () => void): void {
  document.body.classList.add('is-interacting');
  try { svg.setPointerCapture(pointerId); } catch { /* Older Safari can reject capture during DOM updates. */ }
  let pendingEvent: PointerEvent | null = null;
  let animationFrame = 0;
  const applyPendingMove = () => {
    animationFrame = 0;
    if (pendingEvent) {
      move(pendingEvent);
      pendingEvent = null;
    }
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    pendingEvent = event;
    if (!animationFrame) animationFrame = requestAnimationFrame(applyPendingMove);
  };
  const finish = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    applyPendingMove();
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerup', onEnd);
    svg.removeEventListener('pointercancel', onEnd);
    try {
      if (svg.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
    } catch { /* Capture may already have been released by the browser. */ }
    cancelActivePieceGesture = null;
    document.body.classList.remove('is-interacting');
    end();
  };
  const onEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    finish();
  };
  cancelActivePieceGesture?.();
  cancelActivePieceGesture = finish;
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onEnd);
  svg.addEventListener('pointercancel', onEnd);
}

function updatePieceTransform(id: string): void {
  const piece = state.pieces.find((item) => item.id === id)!;
  const shape = shapes.get(piece.prefectureId)!;
  svg.querySelector<SVGGElement>(`[data-piece-id="${id}"]`)?.setAttribute(
    'transform', `translate(${piece.x} ${piece.y}) rotate(${piece.rotation} ${shape.center[0]} ${shape.center[1]})`,
  );
}

function updateControls(): void {
  deleteButton.disabled = !state.selectedPieceId;
  undoButton.disabled = history.length === 0;
  shareButton.hidden = state.pieces.length === 0;
  shareButton.disabled = state.pieces.length === 0;
  addButton.disabled = shapes.size === 0 || state.pieces.length >= PIECE_LIMIT;
  select.value = state.selectedPrefectureId;
  zoomInButton.disabled = camera.zoom >= 30;
  zoomOutButton.disabled = camera.zoom <= 1;
  updatePrefecturePreview();
}

function updatePrefecturePreview(): void {
  const shape = shapes.get(state.selectedPrefectureId);
  if (!shape) return;
  const [[minX, minY], [maxX, maxY]] = shape.bounds;
  const padding = Math.max(maxX - minX, maxY - minY) * .12;
  previewSvg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`);
  previewSvg.innerHTML = `<path d="${shape.path}" />`;
}

function markInteracted(): void {
  if (onboardingStage === 'done') return;
  onboardingStage = 'done';
  updateFirstGuide();
}

function updateFirstGuide(): void {
  document.querySelector('#first-guide')?.classList.toggle('is-hidden', onboardingStage !== 'placed');
}

function createDefaultState(): AppState {
  return createInitialState();
}

function deleteSelection(): void {
  if (!state.selectedPieceId) return;
  pushHistory();
  state = deleteSelectedPiece(state);
  render();
}

function resetEverything(): void {
  pushHistory();
  clearWorkspace();
  state = createDefaultState();
  onboardingStage = 'ready';
  updateFirstGuide();
  setCamera(VIEWBOX.width / 2, VIEWBOX.height / 2, INITIAL_ZOOM);
  render();
}

function historyEntry(): HistoryEntry {
  return {
    state: structuredClone(state),
    camera: { ...camera },
    onboardingStage,
  };
}

function pushHistory(entry = historyEntry()): void {
  history.push(entry);
  if (history.length > HISTORY_LIMIT) history.shift();
  updateControls();
}

function undoLastOperation(): void {
  const previous = history.pop();
  if (!previous) return;
  state = structuredClone(previous.state);
  onboardingStage = previous.onboardingStage;
  setCamera(previous.camera.centerX, previous.camera.centerY, previous.camera.zoom);
  updateFirstGuide();
  render();
}

function persistWorkspace(): void {
  saveWorkspace({
    version: 1,
    state,
    camera: { zoom: camera.zoom, centerX: camera.centerX, centerY: camera.centerY },
    onboardingStage,
  });
}

function zoomCameraAt(nextZoom: number, clientX?: number, clientY?: number): void {
  if (clientX === undefined || clientY === undefined) {
    setCamera(camera.centerX, camera.centerY, nextZoom);
    return;
  }
  const anchor = clientToSvg(svg, clientX, clientY);
  setCameraFromAnchor(nextZoom, anchor, clientX, clientY);
}

function setCameraFromAnchor(nextZoom: number, anchor: { x: number; y: number }, clientX: number, clientY: number): void {
  const zoom = Math.min(30, Math.max(1, nextZoom));
  const rect = svg.getBoundingClientRect();
  const width = VIEWBOX.width / zoom;
  const offsetX = clientX - (rect.left + rect.width / 2);
  const offsetY = clientY - (rect.top + rect.height / 2);
  const worldPerPixel = width / rect.width;
  setCamera(anchor.x - offsetX * worldPerPixel, anchor.y - offsetY * worldPerPixel, zoom);
}

function setCamera(centerX: number, centerY: number, zoom: number): void {
  camera.zoom = Math.min(30, Math.max(1, zoom));
  const width = VIEWBOX.width / camera.zoom;
  const height = VIEWBOX.height / camera.zoom;
  const horizontal = cameraRange(56, 944, width, VIEWBOX.width / 2);
  const vertical = cameraRange(44, 704, height, VIEWBOX.height / 2);
  camera.centerX = Math.min(horizontal.max, Math.max(horizontal.min, centerX));
  camera.centerY = Math.min(vertical.max, Math.max(vertical.min, centerY));
  svg.setAttribute('viewBox', `${camera.centerX - width / 2} ${camera.centerY - height / 2} ${width} ${height}`);
  updateControls();
  if (shapes.size > 0) persistWorkspace();
}

function cameraRange(min: number, max: number, viewportSize: number, fallbackCenter: number): { min: number; max: number } {
  if (viewportSize >= max - min) return { min: fallbackCenter, max: fallbackCenter };
  return { min: min + viewportSize / 2, max: max - viewportSize / 2 };
}

function notify(message: string): void {
  console.info(message);
}

function showShareError(): void {
  const error = document.querySelector<HTMLDivElement>('#share-error')!;
  error.hidden = false;
  window.setTimeout(() => { error.hidden = true; }, 5000);
}

function setupIframeHeightMessaging(): void {
  if (window.parent === window) return;
  let lastHeight = 0;
  const sendHeight = () => {
    const height = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    if (height === lastHeight) return;
    lastHeight = height;
    window.parent.postMessage({ type: 'japan-maps-height', height }, 'https://www.shikode.com');
  };
  const observer = new ResizeObserver(sendHeight);
  observer.observe(document.documentElement);
  observer.observe(document.body);
  window.addEventListener('resize', sendHeight);
  requestAnimationFrame(sendHeight);
}
