import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, BookOpen, Heart, Star, Printer, Share, Volume2, Copy } from './Icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ── Types ────────────────────────────────────────────────────────────
type DuaCategory = 'before-marriage' | 'wedding-day' | 'married-life';

interface Dua {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  category: DuaCategory;
  arabic: string;
  transliteration: string;
  translation: string;
  source?: string;
  notes?: string;
  audioUrl?: string; // External recitation link
}

// ── Category metadata ────────────────────────────────────────────────
const CATEGORY_META: Record<DuaCategory | 'all' | 'favorites', { label: string; emoji: string }> = {
  all:              { label: 'All',             emoji: '📖' },
  favorites:        { label: 'Favorites',       emoji: '⭐' },
  'before-marriage':{ label: 'Before Marriage',  emoji: '🤲' },
  'wedding-day':    { label: 'Wedding Day',     emoji: '💍' },
  'married-life':   { label: 'Married Life',    emoji: '🏠' },
};

// ── Full Dua Collection ──────────────────────────────────────────────
const DUAS: Dua[] = [
  // ─── Before Marriage ───────────────────
  {
    id: 'istikhara',
    title: 'Istikhara',
    subtitle: 'Guidance before deciding',
    icon: '🤲',
    color: 'from-emerald-500 to-teal-600',
    category: 'before-marriage',
    arabic: 'اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ',
    transliteration: "Allahumma inni astakhiruka bi'ilmika, wa astaqdiruka biqudratika, wa as'aluka min fadlika al-'azim, fa innaka taqdiru wa la aqdiru, wa ta'lamu wa la a'lamu, wa anta 'allamul-ghuyub",
    translation: "O Allah, I seek Your guidance by virtue of Your knowledge, and I seek ability by virtue of Your power, and I ask You of Your great bounty. You have power; I have none. And You know; I know not. You are the Knower of hidden things.",
    source: 'Sahih al-Bukhari 1162',
    notes: 'Pray 2 rakah voluntary prayer, then recite this dua. Make your specific intention about marriage in your heart.',
  },
  {
    id: 'seeking-spouse',
    title: 'Seeking a Spouse',
    subtitle: 'Dua for finding the right partner',
    icon: '💍',
    color: 'from-rose-500 to-pink-600',
    category: 'before-marriage',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yunin waj'alna lil-muttaqina imama",
    translation: "Our Lord, grant us from among our spouses and offspring comfort to our eyes and make us a leader for the righteous.",
    source: 'Quran 25:74',
    notes: 'One of the most beautiful duas from the Quran for marriage and family.',
    audioUrl: 'https://quran.com/25/74',
  },
  {
    id: 'musa-dua',
    title: "Prophet Musa's Dua",
    subtitle: 'When in need of any good',
    icon: '🌿',
    color: 'from-lime-500 to-green-600',
    category: 'before-marriage',
    arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    transliteration: "Rabbi inni lima anzalta ilayya min khayrin faqir",
    translation: "My Lord, indeed I am, for whatever good You would send down to me, in need.",
    source: 'Quran 28:24',
    notes: 'Prophet Musa (AS) made this dua when he was alone, without family or shelter. Shortly after, Allah blessed him with a spouse and a home. A powerful dua for those seeking marriage.',
    audioUrl: 'https://quran.com/28/24',
  },
  {
    id: 'tawakkul',
    title: 'Trusting in Allah',
    subtitle: 'Reliance during the search',
    icon: '🕊️',
    color: 'from-sky-500 to-blue-600',
    category: 'before-marriage',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'Arshil-'Azim",
    translation: "Allah is sufficient for me. There is no god but He. In Him I have put my trust, and He is the Lord of the Mighty Throne.",
    source: 'Quran 9:129',
    notes: 'Recite this seven times morning and evening. It helps strengthen trust in Allah\'s plan for your marriage journey.',
    audioUrl: 'https://quran.com/9/129',
  },
  {
    id: 'ease-affairs',
    title: 'Ease in Affairs',
    subtitle: 'Dua for ease during engagement',
    icon: '✨',
    color: 'from-amber-400 to-yellow-600',
    category: 'before-marriage',
    arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    transliteration: "Allahumma la sahla illa ma ja'altahu sahla, wa anta taj'alul-hazna idha shi'ta sahla",
    translation: "O Allah, there is no ease except what You make easy, and You make hardship easy if You wish.",
    source: 'Sahih Ibn Hibban 974',
    notes: 'Perfect for the engagement period — when planning can feel overwhelming, this dua asks Allah to make the path smooth.',
  },

  // ─── Wedding Day ───────────────────────
  {
    id: 'nikkah-khutbah',
    title: 'The Nikkah Khutbah',
    subtitle: 'Recited during the ceremony',
    icon: '📜',
    color: 'from-violet-500 to-purple-600',
    category: 'wedding-day',
    arabic: 'إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ وَنَعُوذُ بِاللَّهِ مِنْ شُرُورِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا مَنْ يَهْدِهِ اللَّهُ فَلاَ مُضِلَّ لَهُ وَمَنْ يُضْلِلْ فَلاَ هَادِيَ لَهُ',
    transliteration: "Innal-hamda lillahi nahmaduhu wa nasta'inuhu wa nastaghfiruhu, wa na'udhu billahi min shururi anfusina wa min sayyi'ati a'malina. Man yahdihillahu fala mudilla lahu, wa man yudlil fala hadiya lahu.",
    translation: "All praise is due to Allah. We praise Him, seek His help, and ask for His forgiveness. We seek refuge in Allah from the evil of our souls and from our bad deeds. Whoever Allah guides, none can misguide, and whoever He leaves astray, none can guide.",
    source: "Sunan an-Nasa'i 1404",
    notes: 'This is the opening of the Khutbah al-Hajah (Sermon of Necessity), traditionally recited by the Imam at the start of the Nikkah ceremony.',
  },
  {
    id: 'congratulations',
    title: 'Congratulating Newlyweds',
    subtitle: 'The Sunnah blessing',
    icon: '🎊',
    color: 'from-amber-500 to-orange-600',
    category: 'wedding-day',
    arabic: 'بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
    transliteration: "Barakallahu laka, wa baraka 'alayka, wa jama'a baynakuma fi khayr",
    translation: "May Allah bless you, shower His blessings upon you, and join you both in goodness.",
    source: "Sunan Abu Dawud 2130, Jami' at-Tirmidhi 1091",
    notes: 'This is the authentic Sunnah way to congratulate newlyweds, as taught by the Prophet ﷺ.',
  },
  {
    id: 'walima',
    title: 'At the Walima',
    subtitle: 'Dua when eating at wedding feast',
    icon: '🍽️',
    color: 'from-teal-500 to-cyan-600',
    category: 'wedding-day',
    arabic: 'اللَّهُمَّ أَطْعِمْ مَنْ أَطْعَمَنِي وَاسْقِ مَنْ سَقَانِي',
    transliteration: "Allahumma at'im man at'amani wasqi man saqani",
    translation: "O Allah, feed the one who fed me and give drink to the one who gave me drink.",
    source: 'Sahih Muslim 2055',
    notes: 'A beautiful dua of gratitude to make for the hosts of the Walima feast.',
  },
  {
    id: 'dua-after-eating',
    title: 'After Eating',
    subtitle: 'Gratitude after the feast',
    icon: '🤲',
    color: 'from-orange-400 to-red-500',
    category: 'wedding-day',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: "All praise is due to Allah who fed me this and provided it for me without any might or power on my part.",
    source: "Jami' at-Tirmidhi 3458",
    notes: 'The Prophet ﷺ said whoever says this after eating, his previous sins will be forgiven. Perfect after the Walima feast.',
  },

  // ─── Married Life ──────────────────────
  {
    id: 'wedding-night',
    title: 'The First Night',
    subtitle: 'Dua before intimacy',
    icon: '🌙',
    color: 'from-indigo-500 to-blue-600',
    category: 'married-life',
    arabic: 'بِسْمِ اللَّهِ اللَّهُمَّ جَنِّبْنَا الشَّيْطَانَ وَجَنِّبِ الشَّيْطَانَ مَا رَزَقْتَنَا',
    transliteration: "Bismillah. Allahumma jannibna ash-shaytan, wa jannib ash-shaytana ma razaqtana",
    translation: "In the name of Allah. O Allah, keep the Shaytan away from us and keep the Shaytan away from what You bestow upon us (i.e., offspring).",
    source: 'Sahih al-Bukhari 3271, Sahih Muslim 1434',
    notes: 'The Prophet ﷺ said: "If anyone of you, when intending to have relations with his wife, says this dua and they are destined to have a child, Shaytan will never harm that child."',
  },
  {
    id: 'for-spouse',
    title: 'For Your Spouse',
    subtitle: 'Daily dua for marital harmony',
    icon: '❤️',
    color: 'from-red-500 to-rose-600',
    category: 'married-life',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا جَبَلْتَهَا عَلَيْهِ وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا جَبَلْتَهَا عَلَيْهِ',
    transliteration: "Allahumma inni as'aluka khayraha wa khayra ma jabaltaha 'alayhi, wa a'udhu bika min sharriha wa sharri ma jabaltaha 'alayhi",
    translation: "O Allah, I ask You for her goodness and the goodness of what You have created her with, and I seek refuge in You from her evil and the evil of what You have created her with.",
    source: 'Sunan Abu Dawud 2160',
    notes: 'A beautiful dua to recite for your spouse, asking Allah to bring out the best in them and protect you both from harm.',
  },
  {
    id: 'gratitude',
    title: 'Gratitude for Marriage',
    subtitle: 'Thanking Allah for this blessing',
    icon: '🙏',
    color: 'from-green-500 to-emerald-600',
    category: 'married-life',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
    transliteration: "Alhamdulillahil-ladhi bi ni'matihi tatimmus-salihat",
    translation: "All praise is due to Allah, by Whose grace good deeds are completed.",
    source: 'Sunan Ibn Majah 3803',
    notes: 'The Prophet ﷺ used to say this when something pleasing happened. Marriage is one of the greatest blessings — remember to thank Allah.',
  },
  {
    id: 'love-mercy',
    title: 'Love & Mercy',
    subtitle: 'Quranic sign of a blessed marriage',
    icon: '💞',
    color: 'from-pink-500 to-fuchsia-600',
    category: 'married-life',
    arabic: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً',
    transliteration: "Wa min ayatihi an khalaqa lakum min anfusikum azwajan litaskunu ilayha wa ja'ala baynakum mawaddatan wa rahmah",
    translation: "And among His signs is that He created for you from yourselves mates that you may find tranquility in them; and He placed between you affection and mercy.",
    source: 'Quran 30:21',
    notes: 'This verse beautifully describes the foundation of an Islamic marriage: tranquility (sakina), love (mawaddah), and mercy (rahmah). Reflect on it often together.',
    audioUrl: 'https://quran.com/30/21',
  },
  {
    id: 'entering-home',
    title: 'Entering Home',
    subtitle: 'Dua when arriving at your new home',
    icon: '🏠',
    color: 'from-cyan-500 to-teal-600',
    category: 'married-life',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى رَبِّنَا تَوَكَّلْنَا',
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna",
    translation: "In the name of Allah we enter, in the name of Allah we leave, and upon our Lord we place our trust.",
    source: 'Sunan Abu Dawud 5096',
    notes: 'Make this a habit every time you enter your marital home. It brings barakah and protects your household.',
  },
  {
    id: 'righteous-children',
    title: 'Righteous Children',
    subtitle: 'Dua for blessed offspring',
    icon: '👶',
    color: 'from-blue-400 to-indigo-500',
    category: 'married-life',
    arabic: 'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً ۖ إِنَّكَ سَمِيعُ الدُّعَاءِ',
    transliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibah, innaka sami'ud-du'a",
    translation: "My Lord, grant me from Yourself a good offspring. Indeed, You are the Hearer of supplication.",
    source: 'Quran 3:38',
    notes: "Prophet Zakariyya's (AS) heartfelt dua for righteous children. One of the best duas for couples hoping for children.",
    audioUrl: 'https://quran.com/3/38',
  },
  {
    id: 'family-protection',
    title: 'Family Protection',
    subtitle: 'Shielding your family from harm',
    icon: '🛡️',
    color: 'from-slate-500 to-zinc-600',
    category: 'married-life',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: "A'udhu bi kalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    source: 'Sahih Muslim 2708',
    notes: 'Recite this three times every evening. The Prophet ﷺ used this for protection — extend it as a shield over your entire family.',
  },
  {
    id: 'patience-sabr',
    title: 'Patience & Sabr',
    subtitle: 'When marriage faces trials',
    icon: '⛰️',
    color: 'from-stone-500 to-gray-600',
    category: 'married-life',
    arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا',
    transliteration: "Rabbana afrigh 'alayna sabran wa thabbit aqdamana",
    translation: "Our Lord, pour upon us patience and plant firmly our feet.",
    source: 'Quran 2:250',
    notes: 'Every marriage has challenges. This dua asks Allah for patience to endure and steadfastness to stay on the right path together.',
    audioUrl: 'https://quran.com/2/250',
  },
];

// ── Component ────────────────────────────────────────────────────────
type FilterTab = 'all' | 'favorites' | DuaCategory;

export const DuasPage: React.FC = () => {
  const [expandedDua, setExpandedDua] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [favorites, setFavorites] = useLocalStorage<string[]>('duas-favorites', []);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Helpers ──────────────────────────────────────────────────────
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const set = new Set(prev);
      if (set.has(id)) { set.delete(id); } else { set.add(id); }
      return Array.from(set);
    });
  }, [setFavorites]);

  const toggleDua = (id: string) => {
    setExpandedDua(expandedDua === id ? null : id);
  };

  // ── Filtered list ──────────────────────────────────────────────
  const filteredDuas = useMemo(() => {
    if (activeTab === 'all') return DUAS;
    if (activeTab === 'favorites') return DUAS.filter(d => favoritesSet.has(d.id));
    return DUAS.filter(d => d.category === activeTab);
  }, [activeTab, favoritesSet]);

  // ── Copy dua text to clipboard ─────────────────────────────────
  const copyDua = useCallback(async (dua: Dua) => {
    const text = [
      dua.title,
      '',
      dua.arabic,
      '',
      `Transliteration: ${dua.transliteration}`,
      '',
      `Translation: ${dua.translation}`,
      '',
      dua.source ? `Source: ${dua.source}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(dua.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback silently */ }
  }, []);

  // ── Print single dua ──────────────────────────────────────────
  const printDua = useCallback((dua: Dua) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>${dua.title} — Dua</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Amiri&family=Inter:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; padding: 40px 48px; color: #1e293b; max-width: 700px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #059669; }
          .header h1 { font-size: 28px; font-weight: 700; color: #059669; margin-bottom: 4px; }
          .header p { font-size: 13px; color: #64748b; font-style: italic; }
          .arabic-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: right; direction: rtl; margin-bottom: 24px; }
          .arabic-box p { font-family: 'Amiri', serif; font-size: 26px; line-height: 2; color: #1e293b; }
          .section { margin-bottom: 20px; }
          .section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px; }
          .section-text { font-size: 14px; line-height: 1.7; color: #334155; }
          .transliteration { font-style: italic; }
          .source { color: #059669; font-weight: 600; font-size: 13px; }
          .note-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin-top: 20px; }
          .note-box .section-label { color: #b45309; }
          .note-box .section-text { color: #92400e; font-size: 13px; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
          .footer p { font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 20px 24px; } }
        </style>
      </head><body>
        <div class="header">
          <h1>${dua.icon} ${dua.title}</h1>
          <p>${dua.subtitle}</p>
        </div>
        <div class="arabic-box"><p>${dua.arabic}</p></div>
        <div class="section">
          <p class="section-label">Transliteration</p>
          <p class="section-text transliteration">${dua.transliteration}</p>
        </div>
        <div class="section">
          <p class="section-label">Translation</p>
          <p class="section-text">${dua.translation}</p>
        </div>
        ${dua.source ? `<div class="section"><p class="section-label">Source</p><p class="source">${dua.source}</p></div>` : ''}
        ${dua.notes ? `<div class="note-box"><p class="section-label">Note</p><p class="section-text">${dua.notes}</p></div>` : ''}
        <div class="footer">
          <p>Nikkah & Walima Planning Pro — Duas & Sunnahs</p>
          <p>Printed ${new Date().toLocaleDateString()}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  }, []);

  // ── Share dua (Web Share API fallback to copy) ─────────────────
  const shareDua = useCallback(async (dua: Dua) => {
    const shareText = `${dua.title}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n"${dua.translation}"\n\n— ${dua.source || ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: dua.title, text: shareText }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(dua.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // ── Count by category ─────────────────────────────────────────
  const categoryCounts = useMemo(() => ({
    all: DUAS.length,
    favorites: favorites.length,
    'before-marriage': DUAS.filter(d => d.category === 'before-marriage').length,
    'wedding-day': DUAS.filter(d => d.category === 'wedding-day').length,
    'married-life': DUAS.filter(d => d.category === 'married-life').length,
  }), [favorites.length]);

  // ── Tab keys ───────────────────────────────────────────────────
  const TABS: FilterTab[] = ['all', 'favorites', 'before-marriage', 'wedding-day', 'married-life'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" ref={printRef}>
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
            <p className="font-bold mb-0.5">Your Spiritual Companion — {DUAS.length} Duas</p>
            <p className="text-emerald-700 dark:text-emerald-300">
              Browse by category, bookmark your favorites, and print or share any dua.
              Tap any card to expand and learn more.
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {TABS.map(tab => {
          const meta = CATEGORY_META[tab];
          const isActive = activeTab === tab;
          const count = categoryCounts[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-700'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                isActive
                  ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-400'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Empty favorites state */}
      {activeTab === 'favorites' && filteredDuas.length === 0 && (
        <div className="text-center py-12">
          <Star className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No favorites yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap the star icon on any dua to bookmark it</p>
        </div>
      )}

      {/* Duas Grid */}
      <div className="grid gap-3">
        {filteredDuas.map((dua) => {
          const isFav = favoritesSet.has(dua.id);
          const isExpanded = expandedDua === dua.id;

          return (
            <div
              key={dua.id}
              className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${
                isFav
                  ? 'border-amber-300 dark:border-amber-700/60'
                  : 'border-slate-200 dark:border-zinc-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center">
                <button
                  onClick={() => toggleDua(dua.id)}
                  className="flex-1 p-3 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {/* Icon */}
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
                  {/* Category badge */}
                  <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {CATEGORY_META[dua.category].emoji} {CATEGORY_META[dua.category].label}
                  </span>
                  {/* Expand indicator */}
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {/* Favorite Star */}
                <button
                  onClick={() => toggleFavorite(dua.id)}
                  className="p-3 flex-shrink-0 group"
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star
                    className={`w-4 h-4 transition-colors ${
                      isFav
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-400'
                    }`}
                    style={isFav ? { fill: 'currentColor' } : undefined}
                  />
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-100 dark:border-zinc-700">
                  {/* Arabic */}
                  <div className="bg-slate-50 dark:bg-zinc-700/50 rounded-lg p-3 mt-3 mb-3">
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
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-2.5 mb-3">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                        Note
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        {dua.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {/* Audio Link */}
                    {dua.audioUrl && (
                      <a
                        href={dua.audioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        Listen
                      </a>
                    )}
                    {/* Copy */}
                    <button
                      onClick={() => copyDua(dua)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedId === dua.id ? 'Copied!' : 'Copy'}
                    </button>
                    {/* Print */}
                    <button
                      onClick={() => printDua(dua)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      Print
                    </button>
                    {/* Share */}
                    <button
                      onClick={() => shareDua(dua)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Share className="w-3 h-3" />
                      Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          May Allah bless your marriage with love, mercy, and tranquility.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
          All duas verified from authentic hadith and Quran sources
        </p>
      </div>
    </div>
  );
};
