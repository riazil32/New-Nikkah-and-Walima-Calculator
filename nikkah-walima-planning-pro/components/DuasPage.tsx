import React, { useState } from 'react';
import { ChevronDown, BookOpen } from './Icons';

// Dua content structure
interface Dua {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string; // Tailwind bg color
  arabic: string;
  transliteration: string;
  translation: string;
  source?: string;
  notes?: string;
}

// Initial duas content - can be expanded later
const DUAS: Dua[] = [
  {
    id: 'istikhara',
    title: 'Istikhara',
    subtitle: 'Guidance before deciding',
    icon: '🤲',
    color: 'from-emerald-500 to-teal-600',
    arabic: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ',
    transliteration: "Allahumma inni astakhiruka bi'ilmika, wa astaqdiruka biqudratika, wa as'aluka min fadlika al-'azim, fa innaka taqdiru wa la aqdiru, wa ta'lamu wa la a'lamu, wa anta 'allamul-ghuyub",
    translation: "O Allah, I seek Your guidance by virtue of Your knowledge, and I seek ability by virtue of Your power, and I ask You of Your great bounty. You have power; I have none. And You know; I know not. You are the Knower of hidden things.",
    source: 'Sahih al-Bukhari 1162',
    notes: 'Pray 2 rakah voluntary prayer, then recite this dua. Make your specific intention about marriage in your heart.'
  },
  {
    id: 'seeking-spouse',
    title: 'Seeking a Spouse',
    subtitle: 'Dua for finding the right partner',
    icon: '💍',
    color: 'from-rose-500 to-pink-600',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama",
    translation: "Our Lord, grant us from among our spouses and offspring comfort to our eyes and make us a leader for the righteous.",
    source: 'Quran 25:74',
    notes: 'One of the most beautiful duas from the Quran for marriage and family.'
  },
  {
    id: 'nikkah-khutbah',
    title: 'The Nikkah Khutbah',
    subtitle: 'Recited during the ceremony',
    icon: '📜',
    color: 'from-violet-500 to-purple-600',
    arabic: 'إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ وَنَعُوذُ بِاللَّهِ مِنْ شُرُورِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا مَنْ يَهْدِهِ اللَّهُ فَلاَ مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلاَ هَادِيَ لَهُ',
    transliteration: "Innal-hamda lillahi nahmaduhu wa nasta'inuhu wa nastaghfiruhu, wa na'udhu billahi min shururi anfusina wa min sayyi'ati a'malina. Man yahdihillahu fala mudilla lahu, wa man yudlil fala hadiya lahu.",
    translation: "All praise is due to Allah. We praise Him, seek His help, and ask for His forgiveness. We seek refuge in Allah from the evil of our souls and from our bad deeds. Whoever Allah guides, none can misguide, and whoever He leaves astray, none can guide.",
    source: 'Sunan an-Nasa\'i 1404',
    notes: 'This is the opening of the Khutbah al-Hajah (Sermon of Necessity), traditionally recited by the Imam at the start of the Nikkah ceremony.'
  },
  {
    id: 'congratulations',
    title: 'Congratulating Newlyweds',
    subtitle: 'The Sunnah blessing',
    icon: '🎊',
    color: 'from-amber-500 to-orange-600',
    arabic: 'بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
    transliteration: "Barakallahu laka, wa baraka 'alayka, wa jama'a baynakuma fi khayr",
    translation: "May Allah bless you, shower His blessings upon you, and join you both in goodness.",
    source: 'Sunan Abu Dawud 2130, Jami\' at-Tirmidhi 1091',
    notes: 'This is the authentic Sunnah way to congratulate newlyweds, as taught by the Prophet ﷺ.'
  },
  {
    id: 'wedding-night',
    title: 'The First Night',
    subtitle: 'Dua before intimacy',
    icon: '🌙',
    color: 'from-indigo-500 to-blue-600',
    arabic: 'بِسْمِ اللَّهِ اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ وَجَنِّبِ الشَّيْطَانَ مَا رَزَقْتَنَا',
    transliteration: "Bismillah. Allahumma jannibna ash-shaytan, wa jannib ash-shaytana ma razaqtana",
    translation: "In the name of Allah. O Allah, keep the Shaytan away from us and keep the Shaytan away from what You bestow upon us (i.e., offspring).",
    source: 'Sahih al-Bukhari 3271, Sahih Muslim 1434',
    notes: 'The Prophet ﷺ said: "If anyone of you, when intending to have relations with his wife, says this dua and they are destined to have a child, Shaytan will never harm that child."'
  },
  {
    id: 'for-spouse',
    title: 'For Your Spouse',
    subtitle: 'Daily dua for marital harmony',
    icon: '❤️',
    color: 'from-red-500 to-rose-600',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا جَبَلْتَهَا عَلَيْهِ وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا جَبَلْتَهَا عَلَيْهِ',
    transliteration: "Allahumma inni as'aluka khayraha wa khayra ma jabaltaha 'alayhi, wa a'udhu bika min sharriha wa sharri ma jabaltaha 'alayhi",
    translation: "O Allah, I ask You for her goodness and the goodness of what You have created her with, and I seek refuge in You from her evil and the evil of what You have created her with.",
    source: 'Sunan Abu Dawud 2160',
    notes: 'A beautiful dua to recite for your spouse, asking Allah to bring out the best in them and protect you both from harm.'
  },
  {
    id: 'walima',
    title: 'At the Walima',
    subtitle: 'Dua when eating at wedding feast',
    icon: '🍽️',
    color: 'from-teal-500 to-cyan-600',
    arabic: 'اللَّهُمَّ أَطْعِمْ مَنْ أَطْعَمَنِي وَاسْقِ مَنْ سَقَانِي',
    transliteration: "Allahumma at'im man at'amani wasqi man saqani",
    translation: "O Allah, feed the one who fed me and give drink to the one who gave me drink.",
    source: 'Sahih Muslim 2055',
    notes: 'A beautiful dua of gratitude to make for the hosts of the Walima feast.'
  },
  {
    id: 'gratitude',
    title: 'Gratitude for Marriage',
    subtitle: 'Thanking Allah for this blessing',
    icon: '🙏',
    color: 'from-green-500 to-emerald-600',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
    transliteration: "Alhamdulillahil-ladhi bi ni'matihi tatimmus-salihat",
    translation: "All praise is due to Allah, by Whose grace good deeds are completed.",
    source: 'Sunan Ibn Majah 3803',
    notes: 'The Prophet ﷺ used to say this when something pleasing happened. Marriage is one of the greatest blessings - remember to thank Allah.'
  }
];

export const DuasPage: React.FC = () => {
  const [expandedDua, setExpandedDua] = useState<string | null>(null);

  const toggleDua = (id: string) => {
    setExpandedDua(expandedDua === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">
          Duas & Sunnahs
        </h2>
        <p className="text-slate-600 dark:text-slate-400 italic">
          Essential supplications and prophetic guidance for your blessed union
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 mb-4">
        <div className="flex gap-2.5">
          <BookOpen className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-800 dark:text-emerald-200">
            <p className="font-bold mb-0.5">Your Spiritual Companion</p>
            <p className="text-emerald-700 dark:text-emerald-300">
              Each dua includes Arabic text, transliteration, translation, and authentic sources.
              Tap any card to expand and learn more.
            </p>
          </div>
        </div>
      </div>

      {/* Duas Grid */}
      <div className="grid gap-3">
        {DUAS.map((dua) => (
          <div
            key={dua.id}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300"
          >
            {/* Card Header - Always visible */}
            <button
              onClick={() => toggleDua(dua.id)}
              className="w-full p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {/* Icon with gradient background */}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dua.color} flex items-center justify-center text-lg shadow-md flex-shrink-0`}>
                {dua.icon}
              </div>
              
              {/* Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  {dua.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {dua.subtitle}
                </p>
              </div>

              {/* Expand indicator */}
              <ChevronDown 
                className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                  expandedDua === dua.id ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* Expanded Content */}
            {expandedDua === dua.id && (
              <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700">
                {/* Arabic */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mt-3 mb-3">
                  <p className="text-right text-xl leading-loose font-arabic text-slate-800 dark:text-white" dir="rtl">
                    {dua.arabic}
                  </p>
                </div>

                {/* Transliteration */}
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Transliteration
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    {dua.transliteration}
                  </p>
                </div>

                {/* Translation */}
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Translation
                  </p>
                  <p className="text-xs text-slate-800 dark:text-white leading-relaxed">
                    {dua.translation}
                  </p>
                </div>

                {/* Source */}
                {dua.source && (
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                      Source
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {dua.source}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {dua.notes && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5">
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                      Note
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      {dua.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          May Allah bless your marriage with love, mercy, and tranquility.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          All duas verified from authentic hadith sources
        </p>
      </div>
    </div>
  );
};
