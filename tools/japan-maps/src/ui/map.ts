import type { AppState, Piece, ProjectedShape } from '../types';

export function renderMap(state: AppState, shapes: Map<string, ProjectedShape>): string {
  const background = [...shapes.values()]
    .map((shape) => `<path class="prefecture-boundary" d="${shape.path}" vector-effect="non-scaling-stroke" />`)
    .join('');
  const pieces = [...state.pieces]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((piece) => renderPiece(piece, shapes.get(piece.prefectureId)!, state.selectedPieceId))
    .join('');
  return `
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
}

function renderPiece(piece: Piece, shape: ProjectedShape, selectedPieceId: string | null): string {
  const selected = piece.id === selectedPieceId;
  const [cx] = shape.center;
  const handleY = shape.bounds[0][1] - 32;
  return `
    <g class="piece${selected ? ' is-selected' : ''}" data-piece-id="${piece.id}" data-testid="piece"
      transform="${pieceTransform(piece, shape)}">
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

export function pieceTransform(piece: Piece, shape: ProjectedShape): string {
  return `translate(${piece.x} ${piece.y}) rotate(${piece.rotation} ${shape.center[0]} ${shape.center[1]})`;
}
