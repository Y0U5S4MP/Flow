// Interfaz principal que representa un cómic completo
export interface Comic {
  id: string;
  title: string;
  description?: string;
  panels: Panel[]; // Array de paneles que componen el cómic
  createdAt: string;
  updatedAt?: string;
  backgroundMusic?: AudioConfig;
}

// Interfaz que representa un panel individual en el cómic
export interface Panel {
  id: string;
  imageUrl?: string;
  elements: ComicElement[]; // Elementos contenidos en el panel
  animations?: Animation[]; // Animaciones del panel
  audio?: AudioConfig | null;
  transitions?: Transition[]; // Transiciones a otros paneles
  panelWidth?: number; // Ancho del panel en píxeles
  panelHeight?: number; // Alto del panel en píxeles
  backgroundImage?: string; // URL de la imagen de fondo
  backgroundColor?: string; // Color de fondo del panel
  filters?: MediaFilter[]; // Filtros visuales aplicados
  entranceTransition?: PanelTransition; // Transición de entrada
  exitTransition?: PanelTransition; // Transición de salida
  transitionToNext?: PanelTransition; // Transición al siguiente panel
}

// Interfaz que representa un elemento dentro de un panel
// Puede ser texto, imagen, video, forma, dibujo, etc.
export interface ComicElement {
  id: string;
  type: 'text' | 'brush' | 'shape' | 'image' | 'gif' | 'video' | 'line' | 'arrow' | 'sticker'; // Tipo de elemento
  x: number; // Posición X en el panel
  y: number; // Posición Y en el panel
  width?: number; // Ancho del elemento
  height?: number; // Alto del elemento
  content?: string; // Contenido de texto
  color?: string; // Color del elemento
  fontSize?: number; // Tamaño de fuente (para texto)
  strokeWidth?: number; // Ancho del trazo (para dibujos)
  path?: Point[]; // Puntos del trazo (para dibujos libres)
  shape?: 'rectangle' | 'circle' | 'triangle'; // Forma geométrica
  imageUrl?: string; // URL de imagen
  videoUrl?: string; // URL de video
  gifUrl?: string; // URL de GIF
  autoplay?: boolean; // Reproducción automática
  loop?: boolean; // Reproducción en bucle
  volume?: number; // Volumen de audio
  startTime?: number; // Tiempo de inicio (video)
  endTime?: number; // Tiempo de fin (video)
  playbackSpeed?: number; // Velocidad de reproducción
  filters?: MediaFilter[]; // Filtros aplicados
  visible?: boolean; // Visibilidad del elemento
  fontWeight?: string; // Peso de fuente
  fontStyle?: string; // Estilo de fuente
  textAlign?: string; // Alineación de texto
  appearanceOrder?: number; // Orden de aparición
  entranceAnimation?: ElementAnimation; // Animación de entrada
  exitAnimation?: ElementAnimation; // Animación de salida
  rotation?: number; // Rotación en grados
  flipHorizontal?: boolean; // Volteo horizontal
  flipVertical?: boolean; // Volteo vertical
  opacity?: number; // Opacidad (0-1)
  lineStart?: Point; // Punto de inicio de línea
  lineEnd?: Point; // Punto de fin de línea
  stickerType?: string; // Tipo de pegatina
  soundEffect?: string; // Efecto de sonido
  appearanceDelay?: number; // Retraso de aparición
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

export interface PanelTransition {
  type: 'none' | 'fade' | 'slide' | 'zoom' | 'flip' | 'wipe' | 'dissolve';
  duration: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export interface DrawingStroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
}