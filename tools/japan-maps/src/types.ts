import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { PREFECTURES } from './data/prefectures';

export type PrefectureId = (typeof PREFECTURES)[number][0];

export type Piece = {
  id: string;
  prefectureId: PrefectureId;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
};

export type AppState = {
  selectedPrefectureId: PrefectureId;
  selectedPieceId: string | null;
  pieces: Piece[];
};

export type Point = { x: number; y: number };

export type Camera = { zoom: number; centerX: number; centerY: number };

export type OnboardingStage = 'ready' | 'placed' | 'done';

export type WorkspaceSnapshot = {
  state: AppState;
  camera: Camera;
  onboardingStage: OnboardingStage;
};

export type PrefectureProperties = {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
};

export type JapanFeature = Feature<Geometry, PrefectureProperties>;
export type JapanGeoJson = FeatureCollection<Geometry, PrefectureProperties>;

export type ProjectedShape = {
  id: string;
  name: string;
  slug: string;
  path: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
};
