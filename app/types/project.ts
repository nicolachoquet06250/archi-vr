export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  walls: Wall[];
}

export interface ProjectState {
  layers: Layer[];
  currentLayerId: string | null;
}
