import React, { useState, useEffect, useRef } from 'react';
import { Sutra, AppConfig, ThemeType, FontType, TracingColor } from './types';
import { THEMES, DEFAULT_CONFIG } from './constants';
import { Download, Music, Calendar, Clock, Info, ChevronLeft, ChevronRight, Settings, Play, Pause, CheckCircle2, Search, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDatabase } from './contexts/DatabaseContext';
import { generatePDF } from './pdfGenerator';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Font loading utility
const loadFont = (fontFamily: string, fontWeight: string = 'normal'): Promise<FontFace> => {
  return new Promise((resolve, reject) => {
    const fontPath = 
      fontFamily === 'serif' ? '/fonts/NotoSerifTC-Regular.ttf' :
      fontFamily === 'ming' ? '/fonts/NotoSerifTC-Bold.ttf' :
      '/fonts/LXGWWenKai-Regular.ttf';
    
    const font = new FontFace(fontFamily, `url(${fontPath})`, {
      weight: fontWeight,
      style: 'normal',
      display: 'swap'
    });
    
    font.load().then(() => {
      document.fonts.add(font);
      resolve(font);
    }).catch(reject);
  });
};

export default function App() {
  const { sutras, loading, error, getSutra } = useDatabase();
  const [selectedSutra, setSelectedSutra] = useState<Sutra | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<'home' | 'detail' | 'checkin' | 'about'>('home');
  const [previewPage, setPreviewPage] = useState(1);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [bgImages, setBgImages] = useState<Record<string, string>>({});
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add search state
  const [searchQuery, setSearchQuery] = useState('');

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Promise.all([
          loadFont('serif', '400'),
          loadFont('ming', '700'),
          loadFont('kai', '400')
        ]);
        setFontsLoaded(true);
        console.log('All fonts loaded successfully');
      } catch (error) {
        console.error('Font loading failed:', error);
        // Still set to true to show content even if fonts fail
        setFontsLoaded(true);
      }
    };
    
    loadFonts();
  }, []);

  // Load background images
  useEffect(() => {
    const images: Record<string, string> = {};
    Object.keys(THEMES).forEach((theme) => {
      images[theme] = THEMES[theme as ThemeType].patternUrl;
    });
    setBgImages(images);
  }, []);

  // Load custom background from localStorage
  useEffect(() => {
    const savedCustomBg = localStorage.getItem('yuanbao_custom_bg');
    if (savedCustomBg) {
      setCustomBgImage(savedCustomBg);
    }
  }, []);

  // Save custom background to localStorage
  useEffect(() => {
    if (customBgImage) {
      localStorage.setItem('yuanbao_custom_bg', customBgImage);
    } else {
      localStorage.removeItem('yuanbao_custom_bg');
    }
  }, [customBgImage]);

  // Load stats from localStorage - YES, calendar check-in uses localStorage!
  useEffect(() => {
    const saved = localStorage.getItem('yuanbao_daily_stats');
    if (saved) {
      try {
        setDailyStats(JSON.parse(saved));
        console.log('Loaded check-in stats from localStorage:', JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse check-in stats', e);
      }
    }
  }, []);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(dailyStats).length > 0) {
      localStorage.setItem('yuanbao_daily_stats', JSON.stringify(dailyStats));
      console.log('Saved check-in stats to localStorage:', dailyStats);
    }
  }, [dailyStats]);

  // Filter sutras based on search query
  const filteredSutras = sutras.filter(sutra => 
    sutra.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sutra.translator.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sutra.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCheckin = (dateStr: string) => {
    setDailyStats(prev => {
      const newStats = { ...prev };
      if (dateStr in newStats) {
        delete newStats[dateStr];
      } else {
        newStats[dateStr] = 0; 
      }
      return newStats;
    });
  };

  useEffect(() => {
    const audio = new Audio('https://image2url.com/r2/default/audio/1771842333499-16cc915a-3164-4515-afe0-67909b9da6d6.mp3');
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.play().catch(err => {
          console.error("Audio playback failed:", err);
          setIsMusicPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMusicPlaying]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        const todayStr = getLocalDateString();
        setDailyStats(prev => ({
          ...prev,
          [todayStr]: (prev[todayStr] || 0) + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const todayStr = getLocalDateString();
  const todayTime = dailyStats[todayStr] || 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!selectedSutra) return;
    setIsDownloading(true);
    try {
      const pdfBytes = await generatePDF(selectedSutra, config, customBgImage);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSutra.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('PDF generation error:', error);
      alert(`PDF 生成失敗: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案');
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('圖片檔案不能超過 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomBgImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomBg = () => {
    setCustomBgImage(null);
  };

  const currentBgImage = customBgImage || bgImages[config.theme];

  // Get font family based on config
  const getFontFamily = () => {
    switch(config.font) {
      case 'serif': return 'serif, "Noto Serif TC", "思源宋體", "宋體", serif';
      case 'ming': return 'ming, "Noto Serif TC", "思源明體", "明體", serif';
      case 'kai': return 'kai, "LXGW WenKai", "楷體", "標楷體", cursive';
      default: return 'serif, "Noto Serif TC", serif';
    }
  };

  // Get font weight based on config
  const getFontWeight = () => {
    return config.font === 'ming' ? '700' : '400';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Add font preloading indicator (optional) */}
      {!fontsLoaded && (
        <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-center py-1 text-sm z-50">
          載入字體中...
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Navigation */}
      <nav className="h-16 border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-xl">元</div>
          <h1 className="text-xl font-bold tracking-widest">元宝抄經</h1>
        </div>
        
        <div className="flex items-center gap-8 text-sm font-medium uppercase tracking-widest">
          <button onClick={() => setView('home')} className={cn("hover:text-amber-600 transition-colors", view === 'home' && "text-amber-600")}>經文庫</button>
          <button onClick={() => setView('checkin')} className={cn("hover:text-amber-600 transition-colors", view === 'checkin' && "text-amber-600")}>修行打卡</button>
          <button onClick={() => setView('about')} className={cn("hover:text-amber-600 transition-colors", view === 'about' && "text-amber-600")}>關於</button>
          <button 
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            {isMusicPlaying ? <Music className="w-5 h-5 text-amber-600" /> : <Music className="w-5 h-5 opacity-40" />}
          </button>
        </div>
      </nav>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-8 py-16"
            >
              <header className="mb-16 text-center">
                <h2 className="text-5xl font-bold mb-4 tracking-[0.2em]">清心抄經，福慧雙增</h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                  提供高品質繁體佛經抄寫模板，支持自定義主題與描紅，<br></br>助您在筆尖流轉間尋得片刻寧靜。
                </p>
              </header>

              {/* Search Bar Section */}
              <div className="max-w-2xl mx-auto mb-12">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋經文名稱、譯者或描述..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-6 py-4 pl-14 text-lg border border-black/10 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all bg-white shadow-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
                    >
                      清除
                    </button>
                  )}
                </div>
                
                {/* Search Results Count */}
                <div className="mt-3 text-sm text-gray-500 text-right">
                  找到 {filteredSutras.length} 部經文
                </div>
              </div>

              {/* Sutras Grid */}
              {filteredSutras.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredSutras.map(sutra => (
                    <div 
                      key={sutra.id}
                      className="group bg-white border border-black/5 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                      onClick={() => {
                        setSelectedSutra(sutra);
                        setPreviewPage(1);
                        setView('detail');
                      }}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 -mr-12 -mt-12 rotate-45 group-hover:bg-amber-100 transition-colors" />
                      <h3 className="text-2xl font-bold mb-2 tracking-widest">{sutra.title}</h3>
                      <p className="text-amber-700 text-sm mb-4 font-medium">{sutra.translator}</p>
                      <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed mb-6">{sutra.description}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                        <span className="text-xs text-gray-400 uppercase tracking-widest">{sutra.word_count} 字</span>
                        <span className="text-xs font-bold uppercase tracking-widest group-hover:text-amber-600 transition-colors">立即定製 →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // No results message
                <div className="text-center py-16">
                  <p className="text-xl text-gray-400 mb-4">沒有找到符合「{searchQuery}」的經文</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    清除搜尋
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'detail' && selectedSutra && (
            <motion.div 
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-[calc(100vh-64px)] overflow-hidden"
            >
              {/* Left: Preview */}
              <div className="flex-1 bg-[#E5E5E0] p-12 overflow-auto flex flex-col items-center gap-8">
                <div className="relative group" ref={previewRef}>
                  <div 
                    style={{
                      width: '1122.5px',
                      height: '793.7px',
                      padding: '53.3px',
                      transform: 'scale(0.7)',
                      transformOrigin: 'top center',
                      position: 'relative',
                      backgroundColor: THEMES[config.theme].bg,
                      fontFamily: getFontFamily(),
                      fontWeight: getFontWeight(),
                    }}
                    className={cn(
                      "shadow-2xl transition-all duration-500 flex flex-col relative overflow-hidden shrink-0",
                      "border-[1px]",
                      THEMES[config.theme].border
                    )}
                  >
                    {/* Background image with opacity */}
                    {currentBgImage && (
                      <div 
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                          backgroundImage: `url(${currentBgImage})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          opacity: 0.15,
                        }}
                      />
                    )}
                    
                    {config.theme === 'golden' && <div className="absolute inset-0 golden-shine pointer-events-none opacity-30 z-0" />}

                    {/* Corner Ornaments */}
                    <div className={cn("absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 opacity-40 z-20", THEMES[config.theme].border.replace('border-', 'border-'))} />
                    <div className={cn("absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 opacity-40 z-20", THEMES[config.theme].border.replace('border-', 'border-'))} />
                    <div className={cn("absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 opacity-40 z-20", THEMES[config.theme].border.replace('border-', 'border-'))} />
                    <div className={cn("absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 opacity-40 z-20", THEMES[config.theme].border.replace('border-', 'border-'))} />

                    {/* Grid Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ padding: '53.3px' }}>
                      <g opacity="0.4" stroke={config.theme === 'golden' ? '#D4AF37' : config.theme === 'blue' ? '#1E3A8A' : '#4B5563'}>
                        {Array.from({ length: 21 }).map((_, i) => (
                          <line key={`v-${i}`} x1={`${(i * 100) / 20}%`} y1="0" x2={`${(i * 100) / 20}%`} y2="100%" strokeWidth="0.5" />
                        ))}
                        {Array.from({ length: 16 }).map((_, i) => (
                          <line key={`h-${i}`} x1="0" y1={`${(i * 100) / 15}%`} x2="100%" y2={`${(i * 100) / 15}%`} strokeWidth="0.5" />
                        ))}
                      </g>
                    </svg>

                    {/* Content Preview */}
                    <div className="relative z-30 grid grid-flow-col grid-cols-20 grid-rows-15 h-full w-full" style={{ direction: 'rtl' }}>
                      {selectedSutra.content_full.replace(/[\s\n]/g, '').split('').slice((previewPage - 1) * 300, previewPage * 300).map((char, i) => (
                        <div key={i} className="flex items-center justify-center relative">
                          <span 
                            style={{ 
                              opacity: config.tracingOpacity / 100,
                              color: config.tracingColor === 'red' ? '#EF4444' : config.tracingColor === 'gold' ? '#B8860B' : '#2D2D2D',
                              transform: '，。；：！？'.includes(char) ? 'translate(12px, 12px)' : 'none',
                              fontSize: '32px',
                              fontWeight: getFontWeight(),
                              fontFamily: getFontFamily(),
                              textShadow: '0 1px 2px rgba(255,255,255,0.5)'
                            }}
                          >
                            {char}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[12px] opacity-50 tracking-widest uppercase z-30 bg-white/30 px-3 py-1 rounded-full"
                      style={{ color: '#2D2D2D', fontFamily: getFontFamily() }}
                    >
                      元宝抄經 · {selectedSutra.title} · 第 {previewPage} 頁
                    </div>
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-6 bg-white/50 backdrop-blur-sm px-6 py-3 rounded-full border border-black/5 shadow-sm">
                  <button 
                    disabled={previewPage === 1}
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    className="p-2 hover:bg-black/5 rounded-full disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                    <span className="text-amber-600">{previewPage}</span>
                    <span className="opacity-20">/</span>
                    <span>{Math.ceil(selectedSutra.content_full.replace(/[\s\n]/g, '').length / 300)}</span>
                  </div>
                  <button 
                    disabled={previewPage >= Math.ceil(selectedSutra.content_full.replace(/[\s\n]/g, '').length / 300)}
                    onClick={() => setPreviewPage(p => p + 1)}
                    className="p-2 hover:bg-black/5 rounded-full disabled:opacity-20 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Right: Config */}
              <div className="w-96 bg-white border-l border-black/5 p-8 flex flex-col">
                <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-8 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> 返回經文庫
                </button>

                <h3 className="text-2xl font-bold mb-8 tracking-widest" style={{ fontFamily: getFontFamily() }}>{selectedSutra.title}</h3>

                <div className="space-y-8 flex-1 overflow-auto pr-2">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">主題系統</label>
                      <div className="flex items-center gap-2">
                        {customBgImage && (
                          <button
                            onClick={handleRemoveCustomBg}
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-black/10 hover:border-black/30 rounded transition-all text-gray-500 hover:text-black flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            移除自訂
                          </button>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 border border-black/10 hover:border-black/30 rounded-full transition-all"
                          title="上傳自訂背景圖片"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(THEMES) as ThemeType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => {
                            setConfig({ ...config, theme: t });
                            // Don't clear custom bg when selecting theme
                          }}
                          className={cn(
                            "h-12 border transition-all flex items-center justify-center text-[10px] font-bold uppercase tracking-tighter",
                            config.theme === t && !customBgImage ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30"
                          )}
                        >
                          {THEMES[t].name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                    {customBgImage && (
                      <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        已使用自訂背景圖片
                      </p>
                    )}
                  </section>

                  <section>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">字體選擇</label>
                    <div className="space-y-2">
                      {(['serif', 'ming', 'kai'] as FontType[]).map(f => (
                        <button
                          key={f}
                          onClick={() => setConfig({ ...config, font: f })}
                          className={cn(
                            "w-full h-10 px-4 border text-left text-sm transition-all flex items-center justify-between",
                            config.font === f ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30"
                          )}
                          style={{ 
                            fontFamily: f === 'serif' ? 'serif, "Noto Serif TC"' : 
                                      f === 'ming' ? 'ming, "Noto Serif TC"' : 
                                      'kai, "LXGW WenKai"'
                          }}
                        >
                          {f === 'serif' ? '思源宋體' : f === 'ming' ? '思源明體' : '楷體'}
                          <span className="text-[10px] opacity-50 uppercase">{f}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">摹寫設置</label>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">摹寫顏色</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['red', 'gold', 'gray'] as TracingColor[]).map(c => (
                            <button
                              key={c}
                              onClick={() => setConfig({ ...config, tracingColor: c })}
                              className={cn(
                                "h-10 border transition-all flex items-center justify-center text-[10px] font-bold uppercase",
                                config.tracingColor === c ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30"
                              )}
                            >
                              {c === 'red' ? '硃砂紅' : c === 'gold' ? '金墨' : '淡墨灰'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">摹寫透明度</p>
                          <span className="text-[10px] font-mono font-bold">{config.tracingOpacity}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={config.tracingOpacity}
                          onChange={(e) => setConfig({ ...config, tracingOpacity: parseInt(e.target.value) })}
                          className="w-full h-1 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black mb-4"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          {[{ label: '透明', value: 0 }, { label: '標準', value: 40 }, { label: '全色', value: 100 }].map(preset => (
                            <button
                              key={preset.label}
                              onClick={() => setConfig({ ...config, tracingOpacity: preset.value })}
                              className={cn(
                                "py-1.5 border text-[9px] font-bold uppercase transition-all",
                                config.tracingOpacity === preset.value ? "border-black bg-black text-white" : "border-black/5 hover:border-black/20 text-gray-400"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="pt-8 border-t border-black/5">
                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-black text-white py-4 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className={cn("w-5 h-5", isDownloading && "animate-bounce")} /> 
                    {isDownloading ? '正在生成 PDF...' : '下載摹寫 PDF 模板'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'checkin' && (
            <motion.div 
              key="checkin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto px-8 py-16"
            >
              {/* Check-in content */}
              <div className="bg-white border border-black/5 p-12 shadow-xl">
                <header className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4 tracking-widest">修行打卡</h2>
                  <p className="text-gray-500">記錄每日抄經時長，積累福德資糧</p>
                </header>

                {/* Timer Section */}
                <div className="bg-amber-50 border border-amber-100 p-8 mb-12">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-mono font-bold text-amber-900 mb-4">{formatTime(todayTime)}</div>
                    <p className="text-sm uppercase tracking-widest text-amber-700">今日修行時長</p>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className={cn(
                        "px-8 py-4 font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
                        isTimerRunning 
                          ? "bg-amber-600 text-white hover:bg-amber-700" 
                          : "bg-black text-white hover:bg-zinc-800"
                      )}
                    >
                      {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      {isTimerRunning ? '暫停修行' : '開始修行'}
                    </button>
                  </div>
                </div>

                {/* Calendar Section */}
                <div>
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> 修行記錄
                  </h3>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - 27 + i);
                      const dateStr = getLocalDateString(date);
                      const isChecked = dateStr in dailyStats;
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => toggleCheckin(dateStr)}
                          className={cn(
                            "aspect-square border transition-all flex flex-col items-center justify-center p-1",
                            isChecked 
                              ? "bg-amber-100 border-amber-300 text-amber-900" 
                              : "border-black/5 hover:border-amber-300 hover:bg-amber-50"
                          )}
                        >
                          <span className="text-xs font-bold">{date.getDate()}</span>
                          {isChecked && <CheckCircle2 className="w-3 h-3 text-amber-600" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    點擊日期切換打卡狀態
                  </p>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    ✓ 打卡記錄已自動儲存至瀏覽器
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        {view === 'about' && (
          <motion.div 
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto px-8 py-24"
          >
            <div className="prose prose-zinc max-w-none">
              <h1 className="text-4xl font-bold mb-8 tracking-widest">關於元寶抄經</h1>
              
              <div className="mb-12">
                <img 
                  src="/patterns/space.jpg" 
                  alt="禪意空間"
                  className="w-full h-64 object-cover mb-8 rounded-lg shadow-md"
                />
              </div>

              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  <strong>元寶抄經</strong> 是一個致力於推廣佛經抄寫文化的數位平台。我們相信，在快速變遷的現代生活中，抄經不僅是一種宗教修行，更是一種讓心靈沉澱、回歸內在平靜的途徑。
                </p>

                <p>
                  平台名稱「元寶」寓意「回歸本元之心，如獲至寶」。我們希望透過提供高品質、可自訂的抄經模板，讓更多人能夠方便地接觸並實踐抄經文化，在筆墨流轉間體會專注與寧靜。
                </p>

                <h2 className="text-2xl font-bold text-black mt-12 mb-6">設計理念</h2>
                <p>
                  每一份抄經模板都經過精心設計，從字體選擇、版面編排到背景主題，皆考量傳統美學與現代印刷技術的結合。我們提供多種主題（金色法界、墨藍禪水、禪意素麻）與摹寫選項（硃砂紅、金墨、淡墨灰），讓使用者能依照個人偏好，定製專屬的抄經體驗。
                </p>

                <h2 className="text-2xl font-bold text-black mt-12 mb-6">發心與願景</h2>
                <p>
                  元寶抄經平台秉持非營利之心，希望能透過數位工具，讓珍貴的佛經法寶跨越紙本限制，以更現代、更親切的方式流通於世，接引更多有緣人前來靜心抄經。平台所有經文內容皆來自公共領域或已取得合法授權，功能也將持續開發完善。歡迎您來此駐足，也期待您的指教與鼓勵。
                </p>

                <div className="border-l-4 border-amber-600 pl-6 py-4 my-12 bg-amber-50/50">
                  <p className="text-lg italic text-amber-900">
                    「一筆落紙，福慧雙修；一念清淨，即入佛智。」
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

<footer className="py-12 border-t border-black/5 bg-white text-center">
  <div className="max-w-7xl mx-auto px-8">
    <div className="w-16 h-16 bg-black text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4">元</div>
    <p className="text-sm text-gray-400 mb-2">© 2026 元寶抄經 · 清心自在</p>
    <p className="text-xs text-gray-300 mb-4">願以此功德，莊嚴佛淨土。若有見聞者，悉發菩提心。</p>
    
    <div className="flex items-center justify-center gap-6">
      <a 
        href="mailto:enthongy2@gmail.com" 
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span>電子信箱</span>
      </a>
      
      <a 
        href="https://github.com/enthongy/yuanbao-sutra-copying" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
    </div>
  </div>
</footer>
    </div>
  );
}
