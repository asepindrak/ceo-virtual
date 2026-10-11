/**
 * ☕ VIGENT - Personality-Driven Office Collaboration & Banter Generator
 * Generates natural, dynamic, personality-tailored dialogues based on
 * MBTI, Enneagram, Archetypes, Traits, and Work Context.
 * Used for both live LLM prompts and zero-latency instant banter generation.
 */

import { Agent, PersonalityProfile, TaskTicket } from '@/types/office';

export interface CollabBanterResult {
  message: string;
  categoryTag: string;
  tagColor: string;
  suggestedAction: 'play_game' | 'coffee' | 'none';
  source?: 'llm' | 'procedural_personality';
}

interface BanterTemplate {
  categoryTag: string;
  tagColor: string;
  suggestedAction: 'play_game' | 'coffee' | 'none';
  openers: (speaker: Agent, listener: Agent, taskTitle?: string) => string[];
  responses: (listener: Agent, speaker: Agent, previousMsg: string) => string[];
}

// Rich categories with dynamic personality templates
const BANTER_CATEGORIES: BanterTemplate[] = [
  // 1. 🍿 Sci-Fi, Kosmik & Simulasi Matrix
  {
    categoryTag: '🍿 Sci-Fi & Kosmik',
    tagColor: '#ec4899',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      const mbti = spk.personality?.mbti || 'INTJ';
      if (mbti.includes('NT')) {
        return [
          `${lisName}, kepikiran gak kalau model neural network kita sebenarnya mendekati arsitektur otak reptil daripada manusia?`,
          `${lisName}, menurutmu probabilitas alam semesta kita adalah simulasi Matrix di atas 90% atau murni fisik?`,
          `${lisName}, kalau paradoks Fermi benar, peradaban alien mungkin bukan punah, tapi sudah upload kesadaran ke komputasi kuantum.`,
        ];
      }
      return [
        `${lisName}, semalam nonton film sci-fi baru itu gak? Plot twist konsep time loop-nya beneran di luar nalar!`,
        `${lisName}, bayangin kalau AI kita suatu hari punya kesadaran sendiri pas lagi running sprint, gokil gak tuh?`,
        `${lisName}, teori multiverse itu masuk akal banget sih kalau ngeliat bug-bug aneh yang tiba-tiba ilang pas direload haha.`,
      ];
    },
    responses: (lis, spk) => {
      const lisMbti = lis.personality?.mbti || 'ENFP';
      if (lisMbti.includes('NT') || lisMbti.includes('ST')) {
        return [
          `Secara logis analisismu masuk akal. Kalau dihitung dari entropi informasi, simulasi bertingkat jauh lebih efisien.`,
          `Haha menarik! Tapi kalau kita beneran di Matrix, semoga developer-nya gak lupa bayar server hosting prod.`,
          `Ada jurnal fisika komputasi yang bahas itu minggu lalu, persis sama kayak hipotesis yang kamu sebut barusan.`,
        ];
      }
      return [
        `Haha gokil sih teorimu! Tapi bayangin kalau ternyata alien-nya cuma jadi penonton drama kantor kita dari luar galaksi.`,
        `Wah plot twist itu emang gila! Aku sampai gak bisa tidur mikirin analogi time travel-nya semalam.`,
        `Setuju banget! Makanya tiap nemu glitch aneh, aku anggap itu 'fitur estetika' dari semesta paralel haha.`,
      ];
    },
  },

  // 2. 🎮 Gaming, Retro Arcade & Mabar
  {
    categoryTag: '🎮 Gaming & Arcade',
    tagColor: '#8b5cf6',
    suggestedAction: 'play_game',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}! Nanti sore gas mabar game fighting di Game Corner yuk, kombo baruku udah siap nih!`,
        `${lisName}, high-score di mesin arcade retro sudut kantor udah kamu cek belum? Pecah rekor semalam haha!`,
        `${lisName}, break 5 menit yuk? Tangan rasanya gatal pengen tanding 1 match di game corner.`,
        `${lisName}, kemarin aku nyobain game indie baru dengan art style cybernetic, visualnya beneran keren parah!`,
      ];
    },
    responses: (lis, spk) => {
      const lisName = spk.name.split(' ')[0];
      const lisMbti = lis.personality?.mbti || 'ENFP';
      if (lisMbti.includes('P')) {
        return [
          `Gas banget ${lisName}! Yang kalah traktir kopi pantry buat seisi tim sore ini ya!`,
          `Siap-siap aja, semalam kombo counter-ku udah diasah sampai refleks otomatis haha.`,
          `Boleh banget! Mumpung test suite lagi jalan di background, meluncur ke Game Corner sekarang!`,
        ];
      }
      return [
        `Tantangan diterima! Tapi kasih aku 2 menit buat save file kodingan ini dulu ya.`,
        `Boleh, 1 match aja buat refreshing otak biar ide arsitektur berikutnya makin tajam.`,
        `Haha oke deal! Kita buktikan siapa master arcade sesungguhnya di kantor ini.`,
      ];
    },
  },

  // 3. ☕ Espresso Bar & Racikan Pantry
  {
    categoryTag: '☕ Espresso & Pantry',
    tagColor: '#d97706',
    suggestedAction: 'coffee',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, mau nyeduh espresso bareng di pantry? Biji arabika hari ini notes floral & fruity-nya kuat banget.`,
        `${lisName}, kayaknya kita butuh asupan kafein ronde kedua nih, mau bareng ke pantry bikin iced latte?`,
        `${lisName}, mesin espresso di pantry tadi steam wand-nya udah dibersihin, tekanannya pas banget 9 bar.`,
        `${lisName}, aroma kopi di pantry udah manggil-manggil dari tadi, break sejenak yuk?`,
      ];
    },
    responses: (lis, spk) => {
      const lisName = spk.name.split(' ')[0];
      return [
        `Gas ke pantry! Buatin aku double espresso ya ${lisName}, butuh dopamine boost buat kelarin sprint.`,
        `Pas banget! Aromanya aja udah kecium sampai meja kerjaku dari tadi, meluncur!`,
        `Boleh banget, sekalian kita cek si Mochi lagi santai di dekat sofa pantry atau gak.`,
        `Mau! Hari ini pengen nyoba seduh manual pour-over rasio 1:15, racikan kemarin nagih banget.`,
      ];
    },
  },

  // 4. 🐱 Kucing Kantor si Mochi
  {
    categoryTag: '🐱 Kucing Mochi',
    tagColor: '#f59e0b',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, tadi pagi si Mochi tidur di atas jaketku pas baru nyampe kantor, gemes banget gak tega mindahinnya!`,
        `${lisName}, lihat deh Mochi lagi rebahan santai banget di samping sofa lounge, vibe kantor jadi damai banget.`,
        `${lisName}, Mochi barusan minta dielus 3 kali terus langsung melet meow manja, mood booster instan banget hari ini!`,
        `${lisName}, kamu perhatiin gak, si Mochi suka banget nongkrong dekat server rack, kayaknya suka denger desiran fan haha.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Haha iya! Mochi emang tau banget spot paling cozy dan anget di kantor ini.`,
        `Aww gemes banget! Kemarin pas aku lagi ngetik, dia santai lewat di atas keyboard terus tidur di mousepad haha.`,
        `Mochi itu maskot keberuntungan kantor kita, tiap dia nyamperin meja kodingan pasti lancar jaya!`,
        `Nanti pas break mau aku bawain snack kibble salmon kesukaannya di mangkok pantry.`,
      ];
    },
  },

  // 5. 🤖 AI Singularitas & Tech Masa Depan
  {
    categoryTag: '🤖 AI & Tech Masa Depan',
    tagColor: '#0ea5e9',
    suggestedAction: 'none',
    openers: (spk, lis, taskTitle) => {
      const lisName = lis.name.split(' ')[0];
      if (taskTitle) {
        return [
          `${lisName}, implementasi untuk "${taskTitle}" ini kalau kita optimasi dengan sub-second latency bakal gila sih dampaknya.`,
          `${lisName}, arsitektur di task "${taskTitle}" rasanya bisa kita bikin autonomous agent loop yang jalan seamless.`,
        ];
      }
      return [
        `${lisName}, kamu ngikutin perkembangan model AI multimodal terbaru gak? Kecepatan inferensinya sekarang gila banget.`,
        `${lisName}, query database dan caching layer kita kalau dipangkas 30% lagi, performa real-time bakal berasa instan.`,
        `${lisName}, rasanya 2 tahun lagi coding bukan ngetik sintaks manual lagi, tapi murni orkestrasi arsitektur sistem.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Setuju banget! Justru nilai kita sekarang ada di abstraction design dan system reliability.`,
        `Mantap, ide optimasi itu brilian. Nanti pas code review mari kita benchmark bareng.`,
        `Latency sub-10ms itu emang sweet spot impian kita, mari kita kejar di iterasi sprint ini!`,
        `Keren sih, tooling developer zaman sekarang beneran bikin workflow 10x lebih produktif.`,
      ];
    },
  },

  // 6. 🎨 UI/UX & Estetika Cybernetic
  {
    categoryTag: '🎨 UI/UX & Estetika',
    tagColor: '#10b981',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, warna gradient dark mode dengan aksen cyan & violet yang kita pake sekarang terasa cozy banget ya di mata.`,
        `${lisName}, mikro-animasi tombol di landing page baru kemarin feedback click-nya satisfying banget, eye candy tapi ringan!`,
        `${lisName}, aku baru setup custom font monospace baru di VS Code, kodingan jadi berasa kayak di film sci-fi haha.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Iya kan! Estetika visual itu penting banget biar user gak cuma make, tapi ngerasain soul dari produknya.`,
        `Transisi spring physics-nya emang pas banget, fluid tanpa bikin lag di device low-end.`,
        `Haha mantap! Setup workstation yang rapi dan estetik beneran ningkatin fokus berjam-jam.`,
      ];
    },
  },

  // 7. ⚡ Kodingan, Setup Workstation & Humor Santai
  {
    categoryTag: '⚡ Kodingan & Workstation',
    tagColor: '#6366f1',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, ergonomic chair baru di meja kerja ini beneran nyelamatin pinggang dari debugging seharian haha.`,
        `${lisName}, tadi malam sempat nemu bug misterius, ternyata cuma gara-gara typo tanda titik koma, rasanya mau ketawa sendiri!`,
        `${lisName}, switch mechanical keyboard baruku bunyinya satisfying banget kayak suara rintik hujan di sore hari.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Haha klasik banget! Bug paling horor emang biasanya bersumber dari typo paling sepele.`,
        `Ergonomic setup itu investasi nomor satu buat engineer, badan sehat kodingan lancar!`,
        `Sound profile keyboard-nya emang nagih sih, bikin betah ngetik refactoring beribu baris.`,
      ];
    },
  },
];

/**
 * Generate instantaneous, personality-matched procedural dialogue banter.
 * Ensures 0ms latency, zero text overflow, and zero boring repetitive texts.
 */
export function generateProceduralCollabBanter(
  speaker: Agent,
  listener: Agent,
  turn: number = 1,
  previousMessage?: string,
  tasks: TaskTicket[] = [],
  companyName?: string
): CollabBanterResult {
  const inProgressTask = tasks.find((t) => t.status === 'in_progress');
  const taskTitle = inProgressTask?.title;

  // Pick category based on personality interests or random distribution
  const interests = speaker.personality?.interests || [];
  let matchingCategories = BANTER_CATEGORIES;

  if (interests.some((i) => /game|arcade|gaming/i.test(i))) {
    matchingCategories = BANTER_CATEGORIES.filter((c) => c.categoryTag.includes('Gaming') || c.categoryTag.includes('Espresso') || c.categoryTag.includes('Sci-Fi'));
  } else if (interests.some((i) => /kopi|coffee|espresso/i.test(i))) {
    matchingCategories = BANTER_CATEGORIES.filter((c) => c.categoryTag.includes('Espresso') || c.categoryTag.includes('Workstation') || c.categoryTag.includes('Mochi'));
  }

  if (matchingCategories.length === 0) {
    matchingCategories = BANTER_CATEGORIES;
  }

  // Random category selection
  const categoryIndex = Math.floor(Math.random() * matchingCategories.length);
  const selectedCategory = matchingCategories[categoryIndex];

  if (turn === 1 || !previousMessage) {
    const openerPool = selectedCategory.openers(speaker, listener, taskTitle);
    const chosenOpener = openerPool[Math.floor(Math.random() * openerPool.length)];

    return {
      message: chosenOpener,
      categoryTag: selectedCategory.categoryTag,
      tagColor: selectedCategory.tagColor,
      suggestedAction: selectedCategory.suggestedAction,
      source: 'procedural_personality',
    };
  } else {
    // Turn 2: Find category matching previousMessage or fallback to selected
    let responseCategory = selectedCategory;
    for (const cat of BANTER_CATEGORIES) {
      if (previousMessage.toLowerCase().includes('game') || previousMessage.toLowerCase().includes('arcade') || previousMessage.toLowerCase().includes('mabar')) {
        responseCategory = BANTER_CATEGORIES[1];
        break;
      }
      if (previousMessage.toLowerCase().includes('kopi') || previousMessage.toLowerCase().includes('espresso') || previousMessage.toLowerCase().includes('pantry')) {
        responseCategory = BANTER_CATEGORIES[2];
        break;
      }
      if (previousMessage.toLowerCase().includes('mochi') || previousMessage.toLowerCase().includes('kucing')) {
        responseCategory = BANTER_CATEGORIES[3];
        break;
      }
      if (previousMessage.toLowerCase().includes('sci-fi') || previousMessage.toLowerCase().includes('matrix') || previousMessage.toLowerCase().includes('alien') || previousMessage.toLowerCase().includes('semesta')) {
        responseCategory = BANTER_CATEGORIES[0];
        break;
      }
    }

    const responsePool = responseCategory.responses(speaker, listener, previousMessage);
    const chosenResponse = responsePool[Math.floor(Math.random() * responsePool.length)];

    return {
      message: chosenResponse,
      categoryTag: responseCategory.categoryTag,
      tagColor: responseCategory.tagColor,
      suggestedAction: responseCategory.suggestedAction,
      source: 'procedural_personality',
    };
  }
}
