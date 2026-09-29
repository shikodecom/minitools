import './styles.css';
import { createMapGestures } from './ui/gestures';
import { renderLayout } from './ui/layout';
import { pieceTransform, renderMap } from './ui/map';
import { setupIframeHeightMessaging } from './ui/iframe';
import { addPiece, createInitialState, deleteSelectedPiece, PIECE_LIMIT, selectPiece, updatePiece } from './app/state';
import { cameraFromAnchor, cameraViewBox, constrainCamera, createInitialCamera, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM } from './app/camera';
import { WorkspaceHistory } from './app/history';
import { clearWorkspace, loadWorkspace, saveWorkspace } from './app/storage';
import { shareMap } from './export/share';
import { clientToSvg, constrainTranslation, projectShapes, VIEWBOX } from './geo/projection';
import type { AppState, JapanGeoJson, OnboardingStage, Point, PrefectureId, ProjectedShape, WorkspaceSnapshot } from './types';
import { PREFECTURES } from './data/prefectures';

let state: AppState = createInitialState();
let shapes = new Map<string, ProjectedShape>();
let camera = createInitialCamera();
let onboardingStage: OnboardingStage = 'ready';
const history = new WorkspaceHistory();

document.querySelector<HTMLDivElement>('#app')!.innerHTML = renderLayout();

setupIframeHeightMessaging();

const select = document.querySelector<HTMLSelectElement>('#prefecture')!;
const addButton = document.querySelector<HTMLButtonElement>('#add')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete')!;
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;
const shareButton = document.querySelector<HTMLButtonElement>('#share')!;
const shareButtonMarkup = shareButton.innerHTML;
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!;
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!;
const zoomResetButton = document.querySelector<HTMLButtonElement>('#zoom-reset')!;
const previewSvg = document.querySelector<SVGSVGElement>('#prefecture-preview')!;
const svg = document.querySelector<SVGSVGElement>('#map')!;
svg.addEventListener('pointerdown', onCanvasPointerDown);
const gestures = createMapGestures(svg, {
  getCamera: () => camera,
  setCamera,
  setCameraFromAnchor,
});

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
      state = createInitialState();
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
  for (const [id] of PREFECTURES) {
    if (!availableIds.has(id)) throw new Error(`Missing ${id}`);
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
    shareButton.innerHTML = shareButtonMarkup;
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
  svg.innerHTML = renderMap(state, shapes);
  bindPieceInteractions();
  updateControls();
  persistWorkspace();
}

function bindPieceInteractions(): void {
  svg.querySelectorAll<SVGGElement>('[data-piece-id]').forEach((group) => {
    group.addEventListener('pointerdown', onPiecePointerDown);
  });
  svg.querySelector<SVGCircleElement>('[data-rotate-handle]')?.addEventListener('pointerdown', onRotatePointerDown);
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
  gestures.beginPieceGesture(event.pointerId, (move) => {
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
  gestures.beginPieceGesture(event.pointerId, (move) => {
    if (!historyRecorded) { pushHistory(beforeGesture); historyRecorded = true; }
    markInteracted();
    const point = clientToSvg(svg, move.clientX, move.clientY);
    const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
    state = updatePiece(state, id, { rotation: originRotation + angle - startAngle });
    updatePieceTransform(id);
  }, () => render());
}

function updatePieceTransform(id: string): void {
  const piece = state.pieces.find((item) => item.id === id)!;
  const shape = shapes.get(piece.prefectureId)!;
  svg.querySelector<SVGGElement>(`[data-piece-id="${id}"]`)?.setAttribute(
    'transform', pieceTransform(piece, shape),
  );
}

function updateControls(): void {
  deleteButton.disabled = !state.selectedPieceId;
  undoButton.disabled = history.length === 0;
  shareButton.hidden = state.pieces.length === 0;
  shareButton.disabled = state.pieces.length === 0;
  addButton.disabled = shapes.size === 0 || state.pieces.length >= PIECE_LIMIT;
  select.value = state.selectedPrefectureId;
  zoomInButton.disabled = camera.zoom >= MAX_ZOOM;
  zoomOutButton.disabled = camera.zoom <= MIN_ZOOM;
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

function deleteSelection(): void {
  if (!state.selectedPieceId) return;
  pushHistory();
  state = deleteSelectedPiece(state);
  render();
}

function resetEverything(): void {
  pushHistory();
  clearWorkspace();
  state = createInitialState();
  onboardingStage = 'ready';
  updateFirstGuide();
  setCamera(VIEWBOX.width / 2, VIEWBOX.height / 2, INITIAL_ZOOM);
  render();
}

function historyEntry(): WorkspaceSnapshot {
  return {
    state: structuredClone(state),
    camera: { ...camera },
    onboardingStage,
  };
}

function pushHistory(entry = historyEntry()): void {
  history.push(entry);
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

function setCameraFromAnchor(nextZoom: number, anchor: Point, clientX: number, clientY: number): void {
  const next = cameraFromAnchor(nextZoom, anchor, { x: clientX, y: clientY }, svg.getBoundingClientRect());
  setCamera(next.centerX, next.centerY, next.zoom);
}

function setCamera(centerX: number, centerY: number, zoom: number): void {
  camera = constrainCamera({ centerX, centerY, zoom });
  svg.setAttribute('viewBox', cameraViewBox(camera));
  updateControls();
  if (shapes.size > 0) persistWorkspace();
}

function notify(message: string): void {
  console.info(message);
}

function showShareError(): void {
  const error = document.querySelector<HTMLDivElement>('#share-error')!;
  error.hidden = false;
  window.setTimeout(() => { error.hidden = true; }, 5000);
}
