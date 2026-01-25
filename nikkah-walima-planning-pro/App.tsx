
import React, { useState } from 'react';
import { Sparkles, Calculator, Heart } from './components/Icons';
import { BudgetPlanner } from './components/BudgetPlanner';
import { MahrCalculator } from './components/MahrCalculator';
import { TabType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('budget');

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-100">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-900 leading-tight">Nikkah & Walima</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wedding Planning Pro</p>
            </div>
          </div>
          
          <div className="hidden md:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('budget')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'budget' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calculator className="w-5 h-5" />
              Budget Planner
            </button>
            <button
              onClick={() => setActiveTab('mahr')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'mahr' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Heart className="w-5 h-5" />
              Mahr Calculator
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pb-24">
        {activeTab === 'budget' ? <BudgetPlanner /> : <MahrCalculator />}
      </main>

      {/* Mobile Sticky Navigation */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-2 flex border border-white/10 shadow-2xl">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-bold text-sm transition-all ${
              activeTab === 'budget' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Calculator className="w-5 h-5" />
            Budget
          </button>
          <button
            onClick={() => setActiveTab('mahr')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-bold text-sm transition-all ${
              activeTab === 'mahr' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            <Heart className="w-5 h-5" />
            Mahr
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-slate-200 text-center">
        <div className="flex flex-col items-center">
          <Sparkles className="w-8 h-8 text-slate-300 mb-4" />
          <p className="text-slate-500 text-sm font-medium max-w-md leading-relaxed">
            Helping couples plan their blessed union with wisdom, clarity, and adherence to authentic Sunnah principles.
          </p>
          <div className="mt-6 flex gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
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
