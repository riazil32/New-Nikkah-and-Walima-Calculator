import React from 'react';
import { Sparkles, Calculator, Heart, Users, Clock, Scroll, BookOpen } from './Icons';

interface LandingPageProps {
  onEnterApp: () => void;
}

const FEATURES = [
  {
    icon: Calculator,
    title: 'Budget Architect',
    description: 'Smart wedding budget with vendor tracking, receipt uploads, and professional PDF reports.',
    color: 'from-emerald-500 to-teal-600',
    emoji: '💰',
  },
  {
    icon: Heart,
    title: 'Mahr Calculator',
    description: 'Live silver prices, Sunnah-based amounts, and a visual comparison tool.',
    color: 'from-rose-500 to-pink-600',
    emoji: '💍',
  },
  {
    icon: Users,
    title: 'Guest Manager',
    description: 'Full guest list with RSVP tracking, bulk actions, CSV import/export, and PDF door lists.',
    color: 'from-blue-500 to-indigo-600',
    emoji: '👥',
  },
  {
    icon: Clock,
    title: 'Timeline Planner',
    description: 'Plan your day around prayer times with automatic Fiqh-compliant scheduling.',
    color: 'from-amber-500 to-orange-600',
    emoji: '⏰',
  },
  {
    icon: Scroll,
    title: 'Nikkah Certificate',
    description: 'Beautiful certificate designs — Classic, Gold Ornate, and Minimal Modern.',
    color: 'from-violet-500 to-purple-600',
    emoji: '📜',
  },
  {
    icon: BookOpen,
    title: 'Duas & Sunnahs',
    description: 'Curated collection of authentic duas for every stage of your marriage journey.',
    color: 'from-teal-500 to-cyan-600',
    emoji: '🤲',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden islamic-pattern">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-white/60 to-white dark:from-zinc-900/90 dark:via-zinc-950/80 dark:to-zinc-950" />

        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/40 mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          {/* Bismillah */}
          <p className="font-arabic text-2xl text-emerald-700 dark:text-emerald-400 mb-4 opacity-80">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </p>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-slate-900 dark:text-white leading-tight mb-4">
            Nikkah & Walima
            <br />
            <span className="gold-shimmer dark:text-emerald-400">Planning Pro</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            The most comprehensive Muslim wedding planner. Calculate Mahr, manage guests,
            plan your day around prayer times — all guided by authentic Sunnah.
          </p>

          {/* CTA Button */}
          <button
            onClick={onEnterApp}
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" />
            Start Planning
          </button>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              100% Free to Use
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sunnah-First Guidance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              No Sign-up Required
            </span>
          </div>
        </div>
      </section>

      {/* Quranic Verse Banner */}
      <section className="bg-emerald-900 dark:bg-emerald-950 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="font-arabic text-xl text-emerald-100 mb-3 leading-relaxed" dir="rtl">
            وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً
          </p>
          <p className="text-emerald-200 text-sm italic">
            "And among His signs is that He created for you from yourselves mates that you may find tranquility
            in them; and He placed between you affection and mercy."
          </p>
          <p className="text-emerald-400 text-xs mt-2 font-bold">— Quran 30:21</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-3">
              Everything You Need
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Six powerful tools designed specifically for Muslim weddings — from engagement to walima.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 group cursor-pointer"
                onClick={onEnterApp}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-xl shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.emoji}
                </div>
                <h3 className="text-lg font-serif font-bold text-slate-800 dark:text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hadith Quote */}
      <section className="bg-slate-100 dark:bg-zinc-900 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xl font-serif text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
            "The most blessed wedding is the one with the least expenses."
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">
            — Sahih al-Bukhari
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-4">
            Begin Your Blessed Journey
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Join hundreds of couples who plan their Nikkah and Walima with clarity,
            wisdom, and adherence to authentic Islamic guidance.
          </p>
          <button
            onClick={onEnterApp}
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <Sparkles className="w-5 h-5" />
            Start Planning — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <Sparkles className="w-6 h-6 text-slate-300 dark:text-zinc-600 mb-3" />
          <p className="text-xs text-slate-400 dark:text-zinc-500 text-center max-w-md">
            Nikkah & Walima Planning Pro — Helping couples plan their blessed union
            with wisdom, clarity, and adherence to authentic Sunnah principles.
          </p>
          <div className="mt-4 flex gap-6 text-[11px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest">
            <span>Free Tools</span>
            <span>Sunnah-First</span>
            <span>Real-time Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
