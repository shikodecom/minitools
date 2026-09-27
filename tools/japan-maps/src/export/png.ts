import type { Piece, PrefectureId } from '../types';
import { PREFECTURE_INFO } from '../data/prefectures';

const CANVAS_SIZE = 1200;
const MAP_WIDTH = 1060;
const MAP_HEIGHT = 700;

const palette = {
  ivory: '#fbf6e9', paper: '#fffdf7', green: '#0d5549', coral: '#f56f5d', coralDark: '#cf5144',
  mustard: '#efa929', mint: '#8fcdb8', sky: '#dff4f7', boundary: '#72aa9d', cream: '#fff7e6', teal: '#2f8d7c',
} as const;

export function shareMessage(pieces: Piece[]): string {
  const unique = [...new Set(pieces.map((piece) => piece.prefectureId))];
  return unique.length === 1
    ? `${PREFECTURE_INFO[unique[0]].name}を、実際の縮尺のまま動かしました。`
    : '都道府県を、実際の縮尺のまま動かして遊びました。';
}

export function pngFilename(prefectureId: PrefectureId, date = new Date()): string {
  const stamp = [
    date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'), '-',
    String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0'),
  ].join('');
  return `prefecture-map-${PREFECTURE_INFO[prefectureId].slug}-${stamp}.png`;
}

export async function createPng(svg: SVGSVGElement, prefectureId: PrefectureId, pieces: Piece[]): Promise<{ blob: Blob; filename: string }> {
  await document.fonts?.ready;
  const clone = prepareMapClone(svg);
  clone.setAttribute('viewBox', contentViewBox(svg));
  const serialized = new XMLSerializer().serializeToString(clone);
  const source = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    drawShareCard(context, image, shareMessage(pieces));
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG conversion failed'))), 'image/png'),
    );
    return { blob: png, filename: pngFilename(prefectureId) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function contentViewBox(svg: SVGSVGElement): string {
  const selectionUi = [...svg.querySelectorAll<SVGGraphicsElement>('.selection-ui')];
  selectionUi.forEach((node) => node.setAttribute('display', 'none'));
  try {
    const japan = svg.querySelector<SVGGraphicsElement>('.japan-background')?.getBBox();
    const pieces = svg.querySelector<SVGGraphicsElement>('#pieces')?.getBBox();
    if (!japan) return svg.getAttribute('viewBox') ?? '0 0 1000 760';
    const bounds = unionBounds(japan, pieces && pieces.width > 0 && pieces.height > 0 ? pieces : null);
    return fitBoundsToViewport(bounds, MAP_WIDTH, MAP_HEIGHT, 40).join(' ');
  } finally {
    selectionUi.forEach((node) => node.removeAttribute('display'));
  }
}

export function fitBoundsToViewport(
  bounds: { x: number; y: number; width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  safeMargin: number,
): [number, number, number, number] {
  const usableWidth = viewportWidth - safeMargin * 2;
  const usableHeight = viewportHeight - safeMargin * 2;
  const scale = Math.min(usableWidth / Math.max(1, bounds.width), usableHeight / Math.max(1, bounds.height));
  const width = viewportWidth / scale;
  const height = viewportHeight / scale;
  return [bounds.x + bounds.width / 2 - width / 2, bounds.y + bounds.height / 2 - height / 2, width, height];
}

function unionBounds(first: DOMRect, second: DOMRect | null): { x: number; y: number; width: number; height: number } {
  if (!second) return { x: first.x, y: first.y, width: first.width, height: first.height };
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);
  return { x, y, width: right - x, height: bottom - y };
}

function prepareMapClone(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export="exclude"]').forEach((node) => node.remove());
  clone.querySelectorAll<SVGRectElement>('.map-background').forEach((node) => node.setAttribute('fill', 'transparent'));
  clone.querySelectorAll<SVGPathElement>('.prefecture-boundary').forEach((node) => setAttributes(node, {
    fill: '#dceee3', stroke: palette.boundary, 'stroke-width': '1.35',
  }));
  clone.querySelectorAll<SVGPathElement>('.piece-shape').forEach((node) => setAttributes(node, {
    fill: palette.coral, 'fill-opacity': '.88', stroke: palette.cream, 'stroke-width': '8',
    'paint-order': 'stroke fill', filter: 'url(#share-piece-shadow)',
  }));
  clone.querySelectorAll<SVGPathElement>('.cloud path').forEach((node) => node.setAttribute('fill', '#ffffffc9'));
  clone.querySelectorAll<SVGPathElement>('.plane path:first-child').forEach((node) => setAttributes(node, {
    fill: '#72b9d0', stroke: '#fffdf7', 'stroke-width': '2',
  }));
  clone.querySelectorAll<SVGPathElement>('.plane .trail').forEach((node) => setAttributes(node, {
    fill: 'none', stroke: '#63afd0', 'stroke-width': '3', 'stroke-dasharray': '10 10', 'stroke-linecap': 'round',
  }));
  clone.querySelectorAll<SVGPathElement>('.sparkles path').forEach((node) => node.setAttribute('fill', '#65c4b6'));
  clone.querySelectorAll<SVGPathElement>('.travel-route').forEach((node) => setAttributes(node, {
    fill: 'none', stroke: '#fb9a7e', 'stroke-width': '4', 'stroke-dasharray': '8 11', 'stroke-linecap': 'round',
  }));
  clone.insertAdjacentHTML('afterbegin', '<defs><filter id="share-piece-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#6b3b2b" flood-opacity=".28"/></filter></defs>');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(MAP_WIDTH));
  clone.setAttribute('height', String(MAP_HEIGHT));
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return clone;
}

function drawShareCard(context: CanvasRenderingContext2D, map: HTMLImageElement, message: string): void {
  context.fillStyle = palette.ivory;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawPaperTexture(context);
  drawStepChip(context, 54, 34, 190, palette.coral, '1', '出す');
  drawStepChip(context, 258, 34, 210, palette.mustard, '2', '動かす');
  drawStepChip(context, 482, 34, 220, palette.teal, '3', '重ねる');
  context.fillStyle = palette.green;
  context.font = '900 66px ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif';
  context.fillText('都道府県移動まっぷす', 54, 166);
  drawMapFriend(context, 1000, 105, 1.08);

  context.save();
  context.shadowColor = 'rgba(65,72,54,.14)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  roundRect(context, 38, 190, 1124, 740, 38);
  const gradient = context.createLinearGradient(38, 190, 1162, 930);
  gradient.addColorStop(0, '#dff5fa'); gradient.addColorStop(.48, '#eef8f0'); gradient.addColorStop(1, '#fff9e9');
  context.fillStyle = gradient; context.fill();
  context.restore();
  context.save();
  roundRect(context, 38, 190, 1124, 740, 38);
  context.clip();
  context.drawImage(map, 70, 210, MAP_WIDTH, MAP_HEIGHT);
  context.restore();
  context.strokeStyle = '#9bc9bd'; context.lineWidth = 2;
  roundRect(context, 38, 190, 1124, 740, 38); context.stroke();

  context.fillStyle = palette.green;
  context.font = '800 30px ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif';
  drawCenteredWrappedText(context, message, 600, 970, 1050, 42);

  context.save();
  context.shadowColor = 'rgba(202,75,59,.2)'; context.shadowBlur = 18; context.shadowOffsetY = 7;
  roundRect(context, 210, 1010, 780, 88, 44); context.fillStyle = palette.coral; context.fill(); context.restore();
  context.fillStyle = '#fffdf7'; context.font = '900 35px ui-rounded, "Hiragino Maru Gothic ProN", "Yu Gothic", system-ui, sans-serif';
  context.textAlign = 'center'; context.fillText('あなたも都道府県を動かしてみよう！', 600, 1067);
  context.fillStyle = palette.green; context.font = '800 25px system-ui, sans-serif';
  context.fillText('shikode.com', 600, 1148); context.textAlign = 'start';
}

function drawStepChip(context: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, number: string, label: string): void {
  context.save(); context.strokeStyle = color; context.lineWidth = 2.5; context.fillStyle = '#fffdf799';
  roundRect(context, x, y, width, 58, 29); context.fill(); context.stroke();
  context.beginPath(); context.arc(x + 31, y + 29, 20, 0, Math.PI * 2); context.fillStyle = color; context.fill();
  context.textAlign = 'center'; context.fillStyle = '#fff'; context.font = '800 22px system-ui, sans-serif'; context.fillText(number, x + 31, y + 37);
  context.fillStyle = palette.green; context.font = '800 25px ui-rounded, "Yu Gothic", system-ui, sans-serif'; context.fillText(label, x + 116, y + 38);
  context.restore();
}

function drawMapFriend(context: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  context.save(); context.translate(x, y); context.scale(scale, scale); context.translate(-50, -50);
  const body = new Path2D('M24 17 53 10l24 14-5 27 10 18-24 17-26-8-13-24 8-17-3-20Z');
  context.fillStyle = '#bfe2c7'; context.strokeStyle = '#6da98e'; context.lineWidth = 3; context.fill(body); context.stroke(body);
  context.fillStyle = palette.green;
  for (const cx of [43, 59]) { context.beginPath(); context.arc(cx, 47, 3, 0, Math.PI * 2); context.fill(); }
  context.strokeStyle = palette.green; context.lineWidth = 3; context.lineCap = 'round'; context.beginPath(); context.moveTo(46, 57); context.quadraticCurveTo(52, 63, 58, 57); context.stroke();
  context.fillStyle = '#ff9e87'; context.beginPath(); context.arc(67, 56, 4, 0, Math.PI * 2); context.fill(); context.restore();
}

function drawCenteredWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  const lines: string[] = []; let line = '';
  for (const character of text) {
    if (context.measureText(line + character).width > maxWidth && line) { lines.push(line); line = character; } else line += character;
  }
  if (line) lines.push(line);
  context.textAlign = 'center'; lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight)); context.textAlign = 'start';
}

function drawPaperTexture(context: CanvasRenderingContext2D): void {
  context.save(); context.fillStyle = 'rgba(48,108,91,.035)';
  for (let y = 5; y < CANVAS_SIZE; y += 11) for (let x = 5 + (y % 3); x < CANVAS_SIZE; x += 13) context.fillRect(x, y, 1, 1);
  context.restore();
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath(); context.roundRect(x, y, width, height, radius);
}

function setAttributes(node: Element, attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
}

export function downloadPng(blob: Blob, filename: string): void {
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('SVG image loading failed')); image.src = url;
  });
}
