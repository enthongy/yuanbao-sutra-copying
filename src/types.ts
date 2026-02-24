export interface Sutra {
  id: number;
  title: string;
  translator: string;
  word_count: number;
  content_full: string;
  description: string;
}

export type ThemeType = 'golden' | 'blue' | 'zen';
export type FontType = 'serif' | 'ming' | 'kai';
export type TracingColor = 'red' | 'gold' | 'gray';

export interface AppConfig {
  theme: ThemeType;
  font: FontType;
  tracingColor: TracingColor;
  tracingOpacity: number;
}
