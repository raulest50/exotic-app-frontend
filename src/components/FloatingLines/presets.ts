import type { FloatingLinesProps } from './FloatingLines.tsx';

export const loginFloatingLinesPreset: FloatingLinesProps = {
  linesGradient: ['#6d4dff', '#cf4f9c', '#1976ea', '#7a52f4'],
  baseColor: '#f4f7fb',
  lineBoost: 1.2,
  lineOpacity: 0.68,
  lineCount: [9, 13, 10],
  lineDistance: [11, 9, 10],
  animationSpeed: 0.9,
  interactive: true,
  parallax: false,
  enabledWaves: ['top', 'middle', 'bottom'],
  bottomWavePosition: { x: 2.0, y: -0.7, rotate: -1 },
};
