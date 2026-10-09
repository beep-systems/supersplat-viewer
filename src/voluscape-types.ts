import type { Entity } from 'playcanvas';
export type Bounds = { min: number[]; max: number[] };
export type FrameOptions = { bounds?: Bounds | null; direction?: number[]; padding?: number; immediate?: boolean };
export type SurfaceHit = { position: number[]; normal?: number[] };
export type ScreenPoint = { x: number; y: number; depth: number };
export type VisibilityPoint = { x: number; y: number; depth: number };
export type MarkerOptions = SurfaceHit & { height: number; color?: number[] };
export type MarkerVisual = {
    entity: Entity;
    anchor: { componentIndex: number; position: number[]; normal: number[] };
    alignToSceneUp(): void;
    setColor(color: number[]): void;
    moveTo(hit: SurfaceHit): void;
    setSelected(selected: boolean): void;
    screenPosition(): ScreenPoint | null;
    destroy(): void;
};
export type MarkerConnectionOptions = { from: MarkerVisual; to: MarkerVisual; height: number; color?: number[] };
export type MarkerConnection = {
    entity: Entity;
    update(): void;
    setColor(color: number[]): void;
    screenSegment(): {
        a: ScreenPoint & { position: number[] };
        b: ScreenPoint & { position: number[] };
        perspective: boolean;
    } | null;
    destroy(): void;
};
export type PointInteraction = (x: number, y: number) => void;
