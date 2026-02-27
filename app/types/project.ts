export interface Point {
  x: number;
  y: number;
}

export type OpeningType = 'door' | 'window';
export type OpeningVariant = 'simple' | 'double' | 'square' | 'rectangular';

export interface Opening {
  id: string;
  type: OpeningType;
  variant: OpeningVariant;
  position: number; // Position le long du mur (0 à 1)
  width: number; // Largeur en mètres
  flipped: boolean; // Inverser le sens d'ouverture
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
  openings: Opening[];
}

export type StairType = 'straight' | 'corner' | 'spiral';

export interface Stair {
  id: string;
  type: StairType;
  position: Point;
  rotation: number;
  width: number;
  length: number;
  height: number;
  steps: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  walls: Wall[];
  stairs: Stair[];
}

export interface ProjectState {
  layers: Layer[];
  currentLayerId: string | null;
}
