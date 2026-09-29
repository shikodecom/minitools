import { clientToSvg, VIEWBOX } from '../geo/projection';
import type { Camera, Point } from '../types';

type CameraControls = {
  getCamera: () => Camera;
  setCamera: (centerX: number, centerY: number, zoom: number) => void;
  setCameraFromAnchor: (zoom: number, anchor: Point, clientX: number, clientY: number) => void;
};

// Own pointer capture and gesture hand-off so a pinch can finish a piece drag safely.
export function createMapGestures(svg: SVGSVGElement, controls: CameraControls) {
  const { getCamera, setCamera, setCameraFromAnchor } = controls;
  const activePointers = new Map<number, Point>();
  let cameraPan: { pointerId: number; startX: number; startY: number; centerX: number; centerY: number } | null = null;
  let pinch: { distance: number; anchor: Point; pointerIds: [number, number] } | null = null;
  let cancelActivePieceGesture: (() => void) | null = null;

  svg.addEventListener('pointerdown', onViewportPointerDown, { capture: true });
  svg.addEventListener('pointermove', onViewportPointerMove, { capture: true });
  svg.addEventListener('pointerup', onViewportPointerEnd, { capture: true });
  svg.addEventListener('pointercancel', onViewportPointerEnd, { capture: true });

  return { beginPieceGesture };

  function onViewportPointerDown(event: PointerEvent): void {
    const camera = getCamera();
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
    const camera = getCamera();
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

  function pointerDistance(first: Point, second: Point): number {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function pointerMidpoint(first: Point, second: Point): Point {
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  }

  function beginPieceGesture(pointerId: number, move: (event: PointerEvent) => void, end: () => void): void {
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
}
