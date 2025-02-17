export interface User {
  id: string;
  nickname: string;
  isActive: boolean;
  lastSeen: Date;
}

export interface MediaElement {
  id: string;
  type: 'image' | 'webcam' | 'screen';
  url: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  stream?: MediaStream;
  chromaKey?: {
    enabled: boolean;
    color: 'green' | 'blue';
    sensitivity: number;
  };
}

export interface BoardState {
  id: string;
  elements: MediaElement[];
  users: User[];
  zoom: number;
  pan: { x: number; y: number };
}