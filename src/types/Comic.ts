export interface Comic {
  id: string;
  title: string;
  description?: string;
  panels: Panel[];
  createdAt: string;
  updatedAt?: string;
}

export interface Panel {
  id: string;
  elements: ComicElement[];
  animations?: Animation[];
  audio?: AudioConfig | null;
  transitions?: Transition[];
  panelWidth?: number;
  panelHeight?: number;
  backgroundImage?: string;
  backgroundColor?: string;
  filters?: MediaFilter[];
}

export interface ComicElement {
  id: string;
  type: 'text' | 'brush' | 'shape' | 'image' | 'gif' | 'video' | 'line' | 'arrow' | 'sticker';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  fontSize?: number;
  strokeWidth?: number;
  path?: Point[];
  shape?: 'rectangle' | 'circle' | 'triangle';
  imageUrl?: string;
  videoUrl?: string;
  gifUrl?: string;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  startTime?: number;
  endTime?: number;
  playbackSpeed?: number;
  filters?: MediaFilter[];
  visible?: boolean;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  appearanceOrder?: number;
  entranceAnimation?: ElementAnimation;
  exitAnimation?: ElementAnimation;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  opacity?: number;
  lineStart?: Point;
  lineEnd?: Point;
  stickerType?: string;
}

export interface MediaFilter {
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'sepia' | 'grayscale';
  value: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Animation {
  type: 'fadeIn' | 'slideIn' | 'rotateIn' | 'bounce' | 'typewriter';
  duration: number;
  delay: number;
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  elementId?: string;
}

export interface ElementAnimation {
  type: 'fadeIn' | 'slideIn' | 'zoomIn' | 'bounceIn' | 'rotateIn' | 'typewriter' | 'fadeOut' | 'slideOut' | 'zoomOut' | 'bounceOut' | 'rotateOut';
  duration: number;
  delay?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface AudioConfig {
  backgroundMusic?: {
    url: string;
    volume: number;
    loop: boolean;
  } | null;
  soundEffects?: SoundEffect[];
}

export interface SoundEffect {
  id: string;
  url: string;
  trigger: 'onLoad' | 'onClick' | 'onHover';
  volume: number;
  element?: string;
}

export interface Transition {
  type: 'fade' | 'slide' | 'zoom' | 'flip';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface DrawingStroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}