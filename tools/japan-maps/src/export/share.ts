import type { Piece, PrefectureId } from '../types';
import { createPng, downloadPng } from './png';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export const SHARE_URL = 'https://www.shikode.com/thinking-design/moving-maps/';

export async function shareMap(svg: SVGSVGElement, prefectureId: PrefectureId, pieces: Piece[]): Promise<ShareResult> {
  const { blob, filename } = await createPng(svg, prefectureId, pieces);
  const file = new File([blob], filename, { type: 'image/png' });
  const shareData: ShareData = {
    title: '都道府県移動まっぷす',
    text: `#都道府県移動まっぷす\n${SHARE_URL}`,
    files: [file],
  };

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  downloadPng(blob, filename);
  return 'downloaded';
}
