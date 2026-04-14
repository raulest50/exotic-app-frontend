import type { FloatingLinesProps } from './FloatingLines.tsx';

export const loginFloatingLinesPreset: FloatingLinesProps = {
  linesGradient: ['#244A73', '#3B6E94', '#4F8C95', '#8FC3C8'],
  baseColor: '#f1f6f8',
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
