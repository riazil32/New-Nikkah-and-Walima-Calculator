
import React, { useState } from 'react';
import { Sparkles, Calculator, Heart, Sun, Moon, Scroll, Clock, BookOpen, Users } from './components/Icons';
import { BudgetPlanner } from './components/BudgetPlanner';
import { MahrCalculator } from './components/MahrCalculator';
import { ContractBuilder } from './components/ContractBuilder';
import { TimelinePlanner } from './components/TimelinePlanner';
import { DuasPage } from './components/DuasPage';
import { GuestManager } from './components/GuestManager';
import { useTheme } from './hooks/useTheme';
import { TabType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300 scroll-smooth">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-900 dark:text-white leading-tight">Nikkah & Walima</h1>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Wedding Planning Pro</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-slate-100 dark:bg-slate-700 p-1 lg:p-1.5 rounded-2xl border border-slate-200 dark:border-slate-600">
              <button
                onClick={() => setActiveTab('budget')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'budget' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Budget"
              >
                <Calculator className="w-5 h-5" />
                <span className="hidden lg:inline">Budget</span>
              </button>
              <button
                onClick={() => setActiveTab('mahr')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'mahr' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Mahr"
              >
                <Heart className="w-5 h-5" />
                <span className="hidden lg:inline">Mahr</span>
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'guests' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Guests"
              >
                <Users className="w-5 h-5" />
                <span className="hidden lg:inline">Guests</span>
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'timeline' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Timeline"
              >
                <Clock className="w-5 h-5" />
                <span className="hidden lg:inline">Timeline</span>
              </button>
              <button
                onClick={() => setActiveTab('contract')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'contract' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Certificate"
              >
                <Scroll className="w-5 h-5" />
                <span className="hidden lg:inline">Certificate</span>
              </button>
              <button
                onClick={() => setActiveTab('duas')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'duas' 
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Duas"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden lg:inline">Duas</span>
              </button>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pb-0">
        {activeTab === 'budget' && <BudgetPlanner onNavigateToMahr={() => setActiveTab('mahr')} />}
        {activeTab === 'mahr' && <MahrCalculator />}
        {activeTab === 'contract' && <ContractBuilder />}
        {activeTab === 'timeline' && <TimelinePlanner />}
        {activeTab === 'duas' && <DuasPage />}
        {activeTab === 'guests' && <GuestManager />}
      </main>

      {/* Mobile Sticky Navigation - Floating pill with vertical icon+label */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
        <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-[2rem] p-2 flex border border-white/15 dark:border-slate-600/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'budget' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span className="text-[11px]">Budget</span>
          </button>
          <button
            onClick={() => setActiveTab('mahr')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'mahr' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[11px]">Mahr</span>
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'guests' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px]">Guests</span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'timeline' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[11px]">Timeline</span>
          </button>
          <button
            onClick={() => setActiveTab('contract')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'contract' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Scroll className="w-5 h-5" />
            <span className="text-[11px]">Certificate</span>
          </button>
          <button
            onClick={() => setActiveTab('duas')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-[1.5rem] font-bold transition-all ${
              activeTab === 'duas' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px]">Duas</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pb-12 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
        <div className="flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md leading-relaxed">
            Helping couples plan their blessed union with wisdom, clarity, and adherence to authentic Sunnah principles.
          </p>
          <div className="mt-6 flex gap-6 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
            <span>Free Tools</span>
            <span>Sunnah-First</span>
            <span>Real-time Market Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
