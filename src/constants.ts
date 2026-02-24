import { ThemeType, AppConfig } from './types';

export const THEMES: Record<ThemeType, { 
  name: string; 
  bg: string; 
  border: string; 
  text: string; 
  line: string; 
  pattern: string;
  patternUrl: string;
}> = {
  golden: {
    name: '金色法界',
    bg: '#FDFCF5',
    border: 'border-[#D4AF37]',
    text: 'text-[#5C4033]',
    line: 'border-[#D4AF37]/30',
    pattern: 'cloud',
    patternUrl: '/patterns/golden.jpg' 
  },
  blue: {
    name: '墨藍禪水',
    bg: '#F5F5F5', 
    border: 'border-[#1E3A8A]',
    text: 'text-[#1E293B]',
    line: 'border-[#1E3A8A]/20',
    pattern: 'ink',
    patternUrl: '/patterns/blue.jpg'  
  },
  zen: {
    name: '禪意素麻',
    bg: '#FAF9F6', 
    border: 'border-[#4B5563]',
    text: 'text-[#111827]',
    line: 'border-[#9CA3AF]/20',
    pattern: 'minimal',
    patternUrl: '/patterns/bamboo.jpg'  
  }
};

export const DEFAULT_CONFIG: AppConfig = {
  theme: 'golden',
  font: 'serif',
  tracingColor: 'gray',
  tracingOpacity: 40
};