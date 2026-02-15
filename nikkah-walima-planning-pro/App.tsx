
import React, { useState } from 'react';
import { Sparkles, Calculator, Heart, Sun, Moon, Scroll, Clock, BookOpen, Users, SettingsIcon } from './components/Icons';
import { BudgetPlanner } from './components/BudgetPlanner';
import { MahrCalculator } from './components/MahrCalculator';
import { ContractBuilder } from './components/ContractBuilder';
import { TimelinePlanner } from './components/TimelinePlanner';
import { DuasPage } from './components/DuasPage';
import { GuestManager } from './components/GuestManager';
import { AccountPanel } from './components/AccountPanel';
import { LandingPage } from './components/LandingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProProvider } from './contexts/ProContext';
import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { TabType } from './types';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('budget');
  const [theme, toggleTheme] = useTheme();
  const [showAccount, setShowAccount] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useLocalStorage<boolean>('has-entered-app', false);
  const { user } = useAuth();

  // Show landing page on first visit
  if (!hasEnteredApp) {
    return <LandingPage onEnterApp={() => setHasEnteredApp(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans selection:bg-emerald-100 selection:text-emerald-900 dark:selection:bg-emerald-900 dark:selection:text-emerald-100 transition-colors duration-300 scroll-smooth">
      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-zinc-800 islamic-pattern">
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
            <div className="hidden md:flex bg-slate-100 dark:bg-zinc-800 p-1 lg:p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveTab('budget')}
                className={`flex items-center justify-center lg:gap-2 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl font-bold transition-all ${
                  activeTab === 'budget' 
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
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
                    ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                }`}
                title="Duas"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden lg:inline">Duas</span>
              </button>
            </div>
            
            {/* Account Button */}
            <button
              onClick={() => setShowAccount(true)}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all relative"
              aria-label="Account & Settings"
              title="Account & Settings"
            >
              {user ? (
                user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </span>
                )
              ) : (
                <SettingsIcon className="w-5 h-5" />
              )}
              {user?.isPro && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white dark:border-zinc-900" />
              )}
            </button>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area — pb-24 on mobile to clear the floating nav bar */}
      <main className="pb-24 md:pb-0">
        {activeTab === 'budget' && <BudgetPlanner onNavigateToMahr={() => setActiveTab('mahr')} />}
        {activeTab === 'mahr' && <MahrCalculator />}
        {activeTab === 'contract' && <ContractBuilder />}
        {activeTab === 'timeline' && <TimelinePlanner />}
        {activeTab === 'duas' && <DuasPage />}
        {activeTab === 'guests' && <GuestManager />}
      </main>

      {/* Mobile Sticky Navigation - Floating pill with vertical icon+label */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm">
        <div className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-[2rem] p-2 flex border border-white/15 dark:border-zinc-600/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
      <footer className="max-w-6xl mx-auto px-4 pb-12 pt-4 border-t border-slate-200 dark:border-zinc-800 text-center">
        <div className="flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-4" />
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

      {/* Account Panel */}
      <AccountPanel isOpen={showAccount} onClose={() => setShowAccount(false)} />
    </div>
  );
};

// Wrap with providers
const App: React.FC = () => (
  <AuthProvider>
    <ProProvider>
      <AppContent />
    </ProProvider>
  </AuthProvider>
);

export default App;
