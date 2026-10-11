import { NextResponse } from 'next/server';
import { callLLMProvider, LLMMessage } from '@/lib/llmService';
import { LLMConfig, PersonalityProfile } from '@/types/office';
import { generateProceduralCollabBanter } from '@/lib/collabDialogGenerator';

interface CollabAgentInfo {
  name: string;
  roleTitle: string;
  personality?: PersonalityProfile;
}

export async function POST(req: Request) {
  let speakerPayload: any = null;
  let listenerPayload: any = null;
  let turnNumber = 1;
  let previousMsgText: string | undefined = undefined;
  let compName = 'ShadowMove';

  try {
    const body = await req.json();
    const {
      speaker,
      listener,
      config,
      companyName = 'ShadowMove',
      inProgressTaskTitle,
      previousMessage,
      turn = 1,
      topic,
    }: {
      speaker: CollabAgentInfo;
      listener: CollabAgentInfo;
      config?: LLMConfig;
      companyName?: string;
      inProgressTaskTitle?: string;
      previousMessage?: string;
      turn?: number;
      topic?: string;
    } = body;

    speakerPayload = speaker;
    listenerPayload = listener;
    turnNumber = turn;
    previousMsgText = previousMessage;
    compName = companyName;

    if (!speaker || !listener) {
      return NextResponse.json({ success: false, error: 'Speaker and listener required' }, { status: 400 });
    }

    const speakerMBTI = speaker.personality?.mbti || 'INTJ';
    const speakerEnneagram = speaker.personality?.enneagram || '5w6';
    const speakerArchetype = speaker.personality?.archetype || 'The Architect';
    const speakerTraits = speaker.personality?.traits?.join(', ') || 'Analitis, Logis';
    const speakerStyle = speaker.personality?.speakingStyle || 'To-the-point, sesekali nyeletuk analogi sci-fi';
    const speakerInterests = speaker.personality?.interests?.join(', ') || 'Anime, Sci-fi, Tech, Gaming, Kopi';

    const listenerMBTI = listener.personality?.mbti || 'ENFP';
    const listenerEnneagram = listener.personality?.enneagram || '7w8';
    const listenerName = listener.name.split(' ')[0];

    const activeConfig: LLMConfig = config || {
      provider: (process.env.DEFAULT_LLM_PROVIDER as any) || 'openai',
      baseUrl: process.env.CUSTOM_LLM_BASE_URL || undefined,
      apiKey: process.env.OPENAI_API_KEY || process.env.CUSTOM_LLM_API_KEY || undefined,
      model: process.env.DEFAULT_LLM_MODEL || 'gpt-4o',
      isLocked: false,
    };

    let promptContext = '';
    if (turn === 1 || !previousMessage) {
      // Turn 1: Inisiator membuka obrolan santai yang alami
      promptContext = `Kamu adalah ${speaker.name} (${speaker.roleTitle}) di software house "${companyName}".
Kepribadianmu:
- MBTI: ${speakerMBTI} (${speakerArchetype}) | Enneagram: ${speakerEnneagram}
- Karakter & Vibe: ${speakerTraits}
- Gaya Bicara: ${speakerStyle}
- Minat/Hobi: ${speakerInterests}

Situasi: Kamu sedang santai/istirahat sejenak dan mengajak ngobrol rekan kerjamu ${listener.name} (${listener.roleTitle}, MBTI: ${listenerMBTI}).
${inProgressTaskTitle ? `Kalian sedang santai sejenak di sela-sela task: "${inProgressTaskTitle}".` : 'Saat ini suasana kantor sedang santai dan tidak ada tiket mendesak.'}

TUGASMU:
Buat 1 baris obrolan pembuka (1-2 kalimat) yang diucapkan langsung oleh ${speaker.name} kepada ${listenerName} dalam Bahasa Indonesia yang sangat natural, hidup, dan mencerminkan MBTI kepribadianmu.
Topik bisa berupa:
- Teori sci-fi, alien, singularitas AI, atau fenomena alam semesta
- Mengajak main game bareng di Game Corner ("Mabar game sebentar yuk?")
- Mengajak bikin kopi di pantry ("Mau nyeduh espresso bareng di pantry?")
- Kebiasaan lucu kucing kantor si Mochi atau setup workstation.`;
    } else {
      // Turn 2 & 3: Menanggapi ucapan rekan kerja secara responsif
      promptContext = `Kamu adalah ${speaker.name} (${speaker.roleTitle}) di software house "${companyName}".
Kepribadianmu:
- MBTI: ${speakerMBTI} (${speakerArchetype}) | Enneagram: ${speakerEnneagram}
- Karakter & Vibe: ${speakerTraits}
- Gaya Bicara: ${speakerStyle}
- Minat/Hobi: ${speakerInterests}

Situasi: Rekan kerjamu ${listener.name} (${listener.roleTitle}, MBTI: ${listenerMBTI}) baru saja berkata kepadamu:
"${previousMessage}"

TUGASMU:
Tanggapi ucapan ${listenerName} di atas dalam 1-2 kalimat Bahasa Indonesia yang sangat responsif, manusiawi, dan mencerminkan MBTI kepribadianmu:
- Jika kamu tipe analitis/stoik (seperti INTJ/ISTP), tanggapi dengan logis, pemikiran filosofis, atau humor kering.
- Jika kamu tipe ceria/kreatif (seperti ENFP), tanggapi dengan antusias, bercanda, menghubungkan ke game/pop culture, atau menerima ajakan main game/ngopi.
- Jika kamu tipe teliti/disiplin (seperti ISTJ), tanggapi secara realistis atau grounded.
- Jawaban harus benar-benar menyambung dan menanggapi substansi yang diucapkan ${listenerName}.`;
    }

    const promptText = `${promptContext}

Pilih satu categoryTag yang paling relevan:
- "🍿 Sci-Fi & Kosmik" (tagColor: "#ec4899")
- "🎮 Gaming & Arcade" (tagColor: "#8b5cf6")
- "☕ Espresso & Pantry" (tagColor: "#d97706")
- "🐱 Kucing Mochi" (tagColor: "#f59e0b")
- "🤖 AI & Tech Masa Depan" (tagColor: "#0ea5e9")
- "🎨 UI/UX & Estetika" (tagColor: "#10b981")
- "⚡ Kodingan & Workstation" (tagColor: "#6366f1")

KEMBALIKAN HANYA JSON VALID TANPA FORMAT MARKDOWN LAIN:
{
  "categoryTag": "🍿 Sci-Fi & Kosmik",
  "tagColor": "#ec4899",
  "message": "isi tanggapanmu disini...",
  "suggestedAction": "play_game"
}
(suggestedAction bernilai "play_game", "coffee", atau "none")`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'Kamu adalah simulator dialog kantor AI yang menghasilkan respons emosional, manusiawi, dan saling menyambung dalam format JSON murni.',
      },
      {
        role: 'user',
        content: promptText,
      },
    ];

    // Call LLM with a 6-second timeout race
    const timeoutPromise = new Promise<{ content: string }>((_, reject) =>
      setTimeout(() => reject(new Error('LLM Timeout')), 6000)
    );

    const llmRes = await Promise.race([
      callLLMProvider(activeConfig, messages),
      timeoutPromise,
    ]);

    let raw = llmRes.content.trim();

    // Remove markdown codeblock if returned
    if (raw.startsWith('```json')) {
      raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (raw.startsWith('```')) {
      raw = raw.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.message && parsed.categoryTag) {
        return NextResponse.json({
          success: true,
          categoryTag: parsed.categoryTag,
          tagColor: parsed.tagColor || '#ec4899',
          message: parsed.message,
          suggestedAction: parsed.suggestedAction || 'none',
          source: 'llm',
        });
      }
    } catch {
      // If JSON parse fails, return content directly as speech
      if (raw.length > 5) {
        return NextResponse.json({
          success: true,
          categoryTag: '☕ Cerita Santai',
          tagColor: '#ec4899',
          message: raw.slice(0, 140),
          suggestedAction: 'none',
          source: 'llm_raw',
        });
      }
    }
  } catch (err: any) {
    console.warn('[/api/agent/collab] LLM error or timeout, utilizing personality fallback:', err?.message);
  }

  // Graceful personality-driven fallback if LLM is unavailable or times out
  if (speakerPayload && listenerPayload) {
    const fallback = generateProceduralCollabBanter(
      speakerPayload as any,
      listenerPayload as any,
      turnNumber,
      previousMsgText,
      [],
      compName
    );
    return NextResponse.json({
      success: true,
      categoryTag: fallback.categoryTag,
      tagColor: fallback.tagColor,
      message: fallback.message,
      suggestedAction: fallback.suggestedAction,
      source: 'personality_procedural',
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Collab generation error',
  }, { status: 500 });
}
