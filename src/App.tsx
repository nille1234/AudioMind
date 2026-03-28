import React, { useState, useRef } from 'react';
import { 
  Mic, Settings, Play, Pause, Download, Loader2, ExternalLink, 
  FileText, Volume2, ChevronRight, RefreshCw, Clock
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generatePodcastScript, generateSpeech, PodcastScript, GroundingSource } from './services/gemini';
import { pcmToWav } from './lib/audioUtils';

type Language = 'Dansk' | 'Engelsk' | 'Tysk' | 'Fransk' | 'Spansk' | 'Svensk';
type Depth = 'Resume' | 'Diskussion' | 'Deepdive';

export default function App() {
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('Dansk');
  const [depth, setDepth] = useState<Depth>('Resume');
  const [duration, setDuration] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    setScript(null);
    setAudioUrl(null);
    setIsPlaying(false);
    try {
      const { script: generatedScript, sources: generatedSources } = await generatePodcastScript(input, language, depth, duration);
      setScript(generatedScript);
      setSources(generatedSources);
      const base64Audio = await generateSpeech(generatedScript.content.substring(0, 15000)); 
      const wavBlob = pcmToWav(base64Audio);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Der opstod en fejl under genereringen.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadScript = () => {
    if (!script) return;
    const element = document.createElement("a");
    const file = new Blob([`${script.title}\n\nVært: ${script.hostName}\n\n${script.content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${script.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-12 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-background"><Mic size={28} /></div>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight">AudioMind</h1>
        </motion.div>
        <p className="text-foreground/60 max-w-lg mx-auto italic">Forvandl dine tanker til professionelle podcasts med AI-drevet indsigt.</p>
      </header>
      <main className="w-full max-w-4xl space-y-8">
        <section className="bg-white border border-accent/10 rounded-[32px] p-8 shadow-sm">
          <div className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold text-accent mb-3">Dit Emne eller Rå Tekst</label>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Indtast et emne, en artikel eller dine egne noter her..." className="w-full h-40 bg-background border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent/20 transition-all resize-none text-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-accent mb-3 flex items-center gap-2"><Settings size={14} /> Sprog</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="w-full bg-background border-none rounded-xl p-3 focus:ring-2 focus:ring-accent/20">
                  <option>Dansk</option><option>Svensk</option><option>Engelsk</option><option>Tysk</option><option>Fransk</option><option>Spansk</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-accent mb-3 flex items-center gap-2"><Volume2 size={14} /> Dybde</label>
                <div className="flex p-1 bg-background rounded-xl gap-1">
                  {(['Resume', 'Diskussion', 'Deepdive'] as Depth[]).map((d) => (
                    <button key={d} onClick={() => setDepth(d)} className={cn("flex-1 py-2 text-xs rounded-lg transition-all", depth === d ? "bg-accent text-background shadow-md" : "hover:bg-accent/5")}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-semibold text-accent mb-3 flex items-center gap-2"><Clock size={14} /> Varighed</label>
                <div className="flex p-1 bg-background rounded-xl gap-1">
                  {[1, 2, 5, 10, 20].map((m) => (
                    <button key={m} onClick={() => setDuration(m)} className={cn("flex-1 py-2 text-xs rounded-lg transition-all", duration === m ? "bg-accent text-background shadow-md" : "hover:bg-accent/5")}>{m}m</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !input.trim()} className="w-full bg-accent text-background py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20">
              {isLoading ? <><Loader2 className="animate-spin" /> Genererer din podcast...</> : <><RefreshCw size={20} /> Byg Podcast</>}
            </button>
          </div>
        </section>
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-center">{error}</div>}
        <AnimatePresence>
          {script && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20">
              {audioUrl && (
                <div className="bg-accent text-background rounded-[32px] p-8 shadow-xl flex flex-col md:flex-row items-center gap-8">
                  <button onClick={togglePlay} className="w-20 h-20 bg-background text-accent rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg">
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} className="ml-1" fill="currentColor" />}
                  </button>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-serif mb-1">{script.title}</h3>
                    <p className="text-background/70 text-sm uppercase tracking-widest">Host: {script.hostName}</p>
                    <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                  <div className="flex gap-3">
                    <a href={audioUrl} download={`${script.title.replace(/\s+/g, '_')}.wav`} className="p-4 bg-background/10 rounded-2xl hover:bg-background/20 transition-colors" title="Download Lyd"><Download size={24} /></a>
                    <button onClick={downloadScript} className="p-4 bg-background/10 rounded-2xl hover:bg-background/20 transition-colors" title="Download Manuskript"><FileText size={24} /></button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-accent/10 rounded-[32px] p-8 shadow-sm">
                  <h3 className="text-xs uppercase tracking-widest font-semibold text-accent mb-6">Manuskript</h3>
                  <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-accent"><Markdown>{script.content}</Markdown></div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white border border-accent/10 rounded-[32px] p-8 shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-accent mb-6">Kilder</h3>
                    <div className="space-y-4">
                      {sources.length > 0 ? sources.map((source, i) => (
                        <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors border border-transparent hover:border-accent/10">
                          <div className="mt-1 text-accent"><ExternalLink size={14} /></div>
                          <div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">{source.title}</p><p className="text-[10px] text-foreground/40 truncate">{source.uri}</p></div>
                        </a>
                      )) : <p className="text-sm text-foreground/40 italic">Ingen eksterne kilder fundet.</p>}
                    </div>
                  </div>
                  <div className="bg-accent/5 rounded-[32px] p-8 border border-accent/10">
                    <h4 className="font-serif text-accent mb-2">Om AudioMind</h4>
                    <p className="text-xs text-foreground/60 leading-relaxed">Genereret med Gemini 3.1 Pro for dybdegående analyse og Gemini 2.5 Flash for krystalklar tale. Alle kilder er verificeret via Google Search.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <footer className="mt-auto pt-12 text-foreground/30 text-xs uppercase tracking-widest">&copy; 2026 AudioMind &bull; Powered by Google AI</footer>
    </div>
  );
}
