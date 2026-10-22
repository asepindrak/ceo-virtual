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
  // 1. 🍿 Sci-Fi, Cosmic & Matrix Simulation
  {
    categoryTag: '🍿 Sci-Fi & Cosmic',
    tagColor: '#ec4899',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      const mbti = spk.personality?.mbti || 'INTJ';
      if (mbti.includes('NT')) {
        return [
          `${lisName}, have you ever considered that deep neural networks resemble reptilian brain architectures more closely than human neocortex?`,
          `${lisName}, what do you estimate the probability is that our universe is a high-resolution Matrix simulation—above 90% or purely physical?`,
          `${lisName}, if the Fermi paradox holds, alien civilizations might not be extinct—they probably uploaded their consciousness to quantum substrate.`,
        ];
      }
      return [
        `${lisName}, did you catch that new sci-fi film last night? That time-loop plot twist was absolutely mind-bending!`,
        `${lisName}, imagine if our autonomous agents developed genuine consciousness during a sprint deploy—wild thought, right?`,
        `${lisName}, the multiverse theory actually explains why mysterious bugs vanish the moment you refresh the browser haha.`,
      ];
    },
    responses: (lis, spk) => {
      const lisMbti = lis.personality?.mbti || 'ENFP';
      if (lisMbti.includes('NT') || lisMbti.includes('ST')) {
        return [
          `Your analysis is mathematically coherent. From an informational entropy standpoint, nested simulations are far more efficient.`,
          `Haha fascinating! But if we really are in a simulation, let's hope the root admin never misses a cloud hosting bill.`,
          `A computational physics paper published last week argued the exact same hypothesis you just framed.`,
        ];
      }
      return [
        `Haha wild theory! But picture extraterrestrials watching our office standups as prime-time galactic reality TV.`,
        `That plot twist was insane! I was up till 2 AM pondering the temporal causality paradoxes.`,
        `Totally agree! Whenever I encounter an odd visual glitch, I just call it an 'aesthetic feature' from a parallel timeline haha.`,
      ];
    },
  },

  // 2. 🎮 Gaming, Retro Arcade & Friendly Matches
  {
    categoryTag: '🎮 Gaming & Arcade',
    tagColor: '#8b5cf6',
    suggestedAction: 'play_game',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}! Down for a fighting game rematch in the Game Lounge this afternoon? My new combo is dialed in!`,
        `${lisName}, have you checked the high score on the corner retro arcade cabinet? Smashed the office record last night haha!`,
        `${lisName}, quick 5-minute breather? My fingers are itching for a rapid arcade match in the lounge.`,
        `${lisName}, I tried a new cyberpunk indie platformer yesterday—the retro pixel art direction is unbelievable!`,
      ];
    },
    responses: (lis, spk) => {
      const lisName = spk.name.split(' ')[0];
      const lisMbti = lis.personality?.mbti || 'ENFP';
      if (lisMbti.includes('P')) {
        return [
          `Challenge accepted ${lisName}! Loser brews the team espresso in the pantry this afternoon!`,
          `Get ready—my counter-parry reflexes have reached pure muscle memory haha.`,
          `Let's do it! While the test suite runs in the background, heading over to the Game Lounge right now!`,
        ];
      }
      return [
        `You're on! Just give me 2 minutes to commit this refactor first.`,
        `Sounds great—one quick round to refresh the cognitive load before diving into the next architectural phase.`,
        `Haha deal! Let's see who holds the true arcade crown in this office.`,
      ];
    },
  },

  // 3. ☕ Espresso Bar & Pantry Brews
  {
    categoryTag: '☕ Espresso & Pantry',
    tagColor: '#d97706',
    suggestedAction: 'coffee',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, want to pull an espresso together in the pantry? Today's single-origin Ethiopian beans have incredible floral and berry notes.`,
        `${lisName}, feels like we're due for a second caffeine round—fancy an iced oat latte run to the pantry?`,
        `${lisName}, just calibrated the steam wand on the pantry machine—pressure is sitting at a perfect 9 bars.`,
        `${lisName}, that fresh coffee aroma drifting from the pantry is impossible to ignore. Time for a quick break?`,
      ];
    },
    responses: (lis, spk) => {
      const lisName = spk.name.split(' ')[0];
      return [
        `Heading to the pantry! Pull me a double shot please ${lisName}, need that dopamine boost to close out this ticket.`,
        `Perfect timing! The roast notes have been tempting me all morning from across the room. On my way!`,
        `Count me in—let's also check if Mochi is napping by the pantry sofa.`,
        `Definitely! I want to try a manual pour-over with a 1:15 ratio today—yesterday's batch was phenomenal.`,
      ];
    },
  },

  // 4. 🐱 Mochi the Office Cat
  {
    categoryTag: '🐱 Office Mascot Mochi',
    tagColor: '#f59e0b',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, Mochi was curled up sound asleep on my jacket when I arrived this morning—too cute to disturb!`,
        `${lisName}, look at Mochi lounging gracefully beside the sofa—instant zen vibes for the whole workspace.`,
        `${lisName}, Mochi gave me three gentle headbonks and purred loudly—instant mood booster for the day!`,
        `${lisName}, have you noticed Mochi loves hanging out near the server rack? He seems mesmerized by the fan hum haha.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Haha yes! Mochi always locates the warmest, coziest corner in the building.`,
        `Aww so precious! Yesterday while I was typing, he strolled right across the spacebar and curled up on my wrist rest haha.`,
        `Mochi is our lucky charm—every time he stops by a desk, code compiles on the first try!`,
        `During the next break I'll bring out some of his favorite salmon treats in the pantry bowl.`,
      ];
    },
  },

  // 5. 🤖 AI Singularity & Future Tech
  {
    categoryTag: '🤖 AI & Future Tech',
    tagColor: '#0ea5e9',
    suggestedAction: 'none',
    openers: (spk, lis, taskTitle) => {
      const lisName = lis.name.split(' ')[0];
      if (taskTitle) {
        return [
          `${lisName}, if we optimize the pipeline for "${taskTitle}" down to sub-second latency, the user impact will be massive.`,
          `${lisName}, the system architecture in "${taskTitle}" would work brilliantly as a self-healing autonomous loop.`,
        ];
      }
      return [
        `${lisName}, have you been tracking the newest multimodal AI benchmark releases? The inference throughput is staggering.`,
        `${lisName}, if we shave another 30% off our database caching layer, real-time sync will feel virtually instantaneous.`,
        `${lisName}, in a couple of years software engineering won't be about typing syntax—it will be pure system architecture and orchestration.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Completely agree! Our true leverage lies in clean abstraction design and robust system reliability.`,
        `Brilliant optimization angle. Let's benchmark it together during our next peer review.`,
        `Sub-10ms latency is the holy grail—let's make that our benchmark target for this sprint!`,
        `Modern developer tooling is remarkable—it genuinely feels like having a 10x multiplier on daily output.`,
      ];
    },
  },

  // 6. 🎨 UI/UX & Cybernetic Aesthetics
  {
    categoryTag: '🎨 UI/UX & Aesthetics',
    tagColor: '#10b981',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, our deep obsidian dark mode with cyan and indigo accents feels incredibly soothing on the eyes during long sessions.`,
        `${lisName}, the micro-interactions on the new landing page buttons are so satisfying—crisp tactile feedback without DOM overhead!`,
        `${lisName}, I just configured a custom monospace font with ligatures in VS Code—code looks straight out of a futuristic command deck haha.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Exactly! Aesthetics are vital—users shouldn't just interact with software, they should feel the soul and craft behind it.`,
        `The spring physics on those transitions are dialed in—fluid and organic without dropping frames on lower-end hardware.`,
        `Haha love it! A well-curated, beautiful workstation setup noticeably elevates deep-work focus for hours.`,
      ];
    },
  },

  // 7. ⚡ Code Craft & Workstations
  {
    categoryTag: '⚡ Code Craft & Setup',
    tagColor: '#6366f1',
    suggestedAction: 'none',
    openers: (spk, lis) => {
      const lisName = lis.name.split(' ')[0];
      return [
        `${lisName}, this ergonomic mesh chair has genuinely saved my posture during deep debugging marathons haha.`,
        `${lisName}, spent 20 minutes tracing a ghost bug last night only to find a misplaced semicolon—couldn't help but laugh!`,
        `${lisName}, the sound profile on my new tactile mechanical switches is so therapeutic—like raindrops on a quiet afternoon.`,
      ];
    },
    responses: (lis, spk) => {
      return [
        `Haha classic! The most elusive bugs invariably trace back to the tiniest syntactic oversights.`,
        `An ergonomic setup is the highest-ROI investment any engineer can make—stay healthy, ship cleanly!`,
        `That acoustic switch profile is addicting—makes refactoring thousands of lines feel like playing an instrument.`,
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
  } else if (interests.some((i) => /coffee|espresso|brew|pantry|kopi/i.test(i))) {
    matchingCategories = BANTER_CATEGORIES.filter((c) => c.categoryTag.includes('Espresso') || c.categoryTag.includes('Code') || c.categoryTag.includes('Mochi'));
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
    const prevLower = previousMessage.toLowerCase();
    for (const cat of BANTER_CATEGORIES) {
      if (prevLower.includes('game') || prevLower.includes('arcade') || prevLower.includes('match') || prevLower.includes('score')) {
        responseCategory = BANTER_CATEGORIES[1];
        break;
      }
      if (prevLower.includes('coffee') || prevLower.includes('espresso') || prevLower.includes('pantry') || prevLower.includes('brew')) {
        responseCategory = BANTER_CATEGORIES[2];
        break;
      }
      if (prevLower.includes('mochi') || prevLower.includes('cat')) {
        responseCategory = BANTER_CATEGORIES[3];
        break;
      }
      if (prevLower.includes('sci-fi') || prevLower.includes('matrix') || prevLower.includes('alien') || prevLower.includes('multiverse') || prevLower.includes('simulation')) {
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
