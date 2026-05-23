import { useState, useEffect } from 'react';

const CARDS = [
  {
    title: "Intelligent Workspace",
    description: "Welcome to Peblo Sync. We've completely reimagined note-taking by seamlessly integrating state-of-the-art AI into every corner of your workflow.",
    icon: "temp_preferences_custom",
  },
  {
    title: "Context-Aware AI Assistant",
    description: "Your personal sidekick. The AI Chat panel automatically reads your open notes and can instantly answer questions, summarize, or brainstorm with you.",
    icon: "forum",
  },
  {
    title: "Inline Content Actions",
    description: "Simply highlight any text in your editor. The floating AI toolbar lets you rewrite, expand, shorten, or flawlessly translate your content in real-time.",
    icon: "magic_button",
  },
  {
    title: "Smart Audio Transcripts",
    description: "Record your meetings and lectures directly in the app. The AI listens, generates a flawless transcript, and automatically extracts key action items.",
    icon: "mic_double",
  },
  {
    title: "Semantic & Web Search",
    description: "Search notes by meaning, not just keywords. Need external facts? The AI can scrape the live web to provide real-time, up-to-date answers instantly.",
    icon: "travel_explore",
  }
];

export default function OnboardingOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('peblo_onboarding_seen');
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleSkipAll = () => {
    localStorage.setItem('peblo_onboarding_seen', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentIndex < CARDS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSkipAll();
    }
  };

  if (!isOpen) return null;

  const currentCard = CARDS[currentIndex];
  const isLast = currentIndex === CARDS.length - 1;

  // Unified dark green theme gradient
  const themeGradient = "from-emerald-600 to-green-900";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      
      {/* 35% Blurred Backdrop */}
      <div className="absolute inset-0 pointer-events-auto bg-black/35 backdrop-blur-sm" onClick={handleSkipAll} />

      {/* ── Centered Glassmorphic Modal ── */}
      <div className="relative z-10 w-full max-w-3xl mx-4 flex flex-col md:flex-row items-stretch rounded-[32px] bg-[#07130a]/70 backdrop-blur-3xl border border-white/20 shadow-[0_0_100px_rgba(76,175,80,0.15)] overflow-hidden animate-scale-up pointer-events-auto">
        
        {/* Left Side: Typography and Controls */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative">
          {/* Subtle glow behind text */}
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${themeGradient} opacity-5 pointer-events-none`} />

          <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-3 drop-shadow-sm transition-all duration-500">
            {currentCard.title}
          </h2>
          
          <p className="text-gray-400 text-[14px] md:text-[15px] leading-relaxed mb-8 font-medium">
            {currentCard.description}
          </p>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto">
            <button 
              onClick={handleNext}
              className="w-full sm:w-auto bg-white text-black px-6 py-2.5 rounded-full font-bold text-[13px] hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center gap-2"
            >
              {isLast ? "Get Started" : "Next Feature"}
              {!isLast && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
            </button>
            
            <button 
              onClick={handleSkipAll}
              className="w-full sm:w-auto text-gray-500 hover:text-white px-4 py-2.5 font-semibold text-[13px] transition-colors flex items-center justify-center"
            >
              Skip Tour
            </button>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-2.5 mt-8">
            {CARDS.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  idx === currentIndex ? 'w-6 bg-accent' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Icon Visualizer */}
        <div className="flex-1 w-full min-h-[250px] md:min-h-0 relative flex items-center justify-center border-t md:border-t-0 md:border-l border-white/10 bg-black/20 perspective-1000">
            
          {/* Deep blurred orb behind icon */}
          <div className={`absolute inset-0 m-auto w-48 h-48 rounded-full bg-gradient-to-br ${themeGradient} blur-[60px] opacity-40 transition-all duration-1000 ease-in-out`} />
            
          {/* Centered Glowing Icon */}
          <div className="relative z-20 flex items-center justify-center transition-all duration-700 ease-out animate-float">
            <span 
              key={currentCard.icon}
              className="material-symbols-outlined text-[120px] md:text-[140px] text-transparent bg-clip-text bg-gradient-to-br from-green-300 via-accent to-emerald-800 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-up"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {currentCard.icon}
            </span>
          </div>
          
          {/* Subtle Glass Highlights on the card surface */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

      </div>

    </div>
  );
}
