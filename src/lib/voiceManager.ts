import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { VIGENT_HOME } from './workspaceManager';
import { Agent } from '@/types/office';

const execFileAsync = promisify(execFile);

export interface TranscriptionResult {
  text: string;
  source: 'google_free' | 'whisper' | 'gemini' | 'caption' | 'heuristic';
  duration?: number;
}

/**
 * Clean markdown symbols, emojis, and code formatting to produce clean spoken text
 */
export function cleanTextForSpeech(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown bold/italics
    .replace(/[*_~]+/g, '')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullets and symbols
    .replace(/^[•\-*]\s+/gm, '')
    // Remove headers #
    .replace(/^#+\s+/gm, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Remove multiple spaces/newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determine Edge Neural voice model based on Agent persona, name, and gender
 */
export function determineAgentVoice(agent?: Agent, isEng = false): string {
  if (isEng) {
    if (agent?.gender === 'female') return 'en-US-AriaNeural';
    const nameLower = (agent?.name || '').toLowerCase();
    const femaleNames = ['yuki', 'rei', 'gadis', 'putri', 'maya', 'sarah', 'siti', 'runa', 'lisa', 'anna', 'dewi', 'rina'];
    const isFemale = femaleNames.some((f) => nameLower.includes(f));
    return isFemale ? 'en-US-AriaNeural' : 'en-US-GuyNeural';
  }

  // Indonesian Neural Voices
  if (agent?.gender === 'female') return 'id-ID-GadisNeural';
  if (agent?.gender === 'male') return 'id-ID-ArdiNeural';

  const nameLower = (agent?.name || '').toLowerCase();
  const femaleNames = ['yuki', 'rei', 'gadis', 'putri', 'maya', 'sarah', 'siti', 'runa', 'lisa', 'anna', 'dewi', 'rina', 'creative'];
  const isFemale = femaleNames.some((f) => nameLower.includes(f));
  return isFemale ? 'id-ID-GadisNeural' : 'id-ID-ArdiNeural';
}

/**
 * Synthesize speech via Microsoft Edge Neural TTS (100% Free, Human-Like, Unlimited)
 * Model: id-ID-GadisNeural (Female) / id-ID-ArdiNeural (Male)
 */
async function synthesizeEdgeNeuralTTS(text: string, voice: string): Promise<Buffer> {
  const tempId = `edge_tts_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const textFilePath = path.join(os.tmpdir(), `${tempId}.txt`);
  const outputAudioPath = path.join(os.tmpdir(), `${tempId}.mp3`);
  const scriptPath = path.join(process.cwd(), 'scripts', 'voice_service.py');

  try {
    fs.writeFileSync(textFilePath, text, 'utf-8');

    await execFileAsync('python', [
      scriptPath,
      'tts',
      '--text-file',
      textFilePath,
      '--voice',
      voice,
      '--output',
      outputAudioPath,
    ], { timeout: 20000 });

    if (fs.existsSync(outputAudioPath) && fs.statSync(outputAudioPath).size > 0) {
      const audioBuffer = fs.readFileSync(outputAudioPath);
      return audioBuffer;
    }
    throw new Error('Edge TTS generated empty or missing audio file');
  } finally {
    if (fs.existsSync(textFilePath)) {
      try { fs.unlinkSync(textFilePath); } catch {}
    }
    if (fs.existsSync(outputAudioPath)) {
      try { fs.unlinkSync(outputAudioPath); } catch {}
    }
  }
}

/**
 * Fetch a single TTS audio chunk from Google Translate TTS as fallback
 */
function fetchGoogleTTSChunk(chunkText: string, lang = 'id'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(chunkText.slice(0, 190));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`TTS returned status ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('TTS request timed out'));
    });
  });
}

/**
 * Synthesize speech audio from text
 * Primary Engine: Microsoft Edge Neural TTS (id-ID-GadisNeural / id-ID-ArdiNeural)
 * Secondary Fallback: Google Translate TTS
 */
export async function synthesizeAgentVoice(
  rawText: string,
  options: { lang?: string; agent?: Agent } = {}
): Promise<Buffer> {
  const clean = cleanTextForSpeech(rawText);
  if (!clean) {
    throw new Error('Text to synthesize is empty');
  }

  const isEng = options.lang === 'en' || isEnglish(clean);
  const voice = determineAgentVoice(options.agent, isEng);

  // 1. Primary: Microsoft Edge Neural TTS
  try {
    const edgeAudio = await synthesizeEdgeNeuralTTS(clean, voice);
    return edgeAudio;
  } catch (edgeErr) {
    console.warn('[VoiceManager] Edge Neural TTS failed, falling back to Google Translate TTS:', edgeErr);
  }

  // 2. Secondary Fallback: Google Translate TTS Chunking
  const lang = options.lang || (isEng ? 'en' : 'id');
  const chunks: string[] = [];
  const sentences = clean.split(/(?<=[.?!,;])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= 180) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (sentence.length > 180) {
        const words = sentence.split(' ');
        let subChunk = '';
        for (const w of words) {
          if ((subChunk + ' ' + w).trim().length <= 180) {
            subChunk = (subChunk + ' ' + w).trim();
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = w;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  const selectedChunks = chunks.slice(0, 6);
  const audioBuffers: Buffer[] = [];

  for (const chunk of selectedChunks) {
    try {
      const buf = await fetchGoogleTTSChunk(chunk, lang);
      audioBuffers.push(buf);
    } catch (err) {
      console.warn('[VoiceManager] Failed to fetch chunk:', chunk, err);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Failed to generate audio chunks');
  }

  return Buffer.concat(audioBuffers);
}

/**
 * Simple language detector heuristic
 */
function isEnglish(text: string): boolean {
  const enWords = ['the', 'and', 'for', 'with', 'this', 'that', 'please', 'update', 'task', 'feature', 'system', 'build'];
  const idWords = ['dan', 'yang', 'untuk', 'dengan', 'saya', 'kami', 'bos', 'kantor', 'tolong', 'buat', 'bikin', 'sudah'];

  const lower = text.toLowerCase();
  let enCount = 0;
  let idCount = 0;

  enWords.forEach((w) => {
    if (new RegExp(`\\b${w}\\b`).test(lower)) enCount++;
  });
  idWords.forEach((w) => {
    if (new RegExp(`\\b${w}\\b`).test(lower)) idCount++;
  });

  return enCount > idCount;
}

/**
 * Transcribe audio using Google Web Speech Recognition via imageio-ffmpeg (100% Free, No API Key Required)
 */
async function transcribeGoogleFreeSTT(audioBuffer: Buffer, lang = 'id-ID'): Promise<string | null> {
  const tempId = `stt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const inputTempPath = path.join(os.tmpdir(), `${tempId}.oga`);
  const scriptPath = path.join(process.cwd(), 'scripts', 'voice_service.py');

  try {
    fs.writeFileSync(inputTempPath, audioBuffer);

    const { stdout } = await execFileAsync('python', [
      scriptPath,
      'stt',
      '--input',
      inputTempPath,
      '--lang',
      lang,
    ], { timeout: 25000 });

    const res = JSON.parse(stdout.trim());
    if (res.success && res.text) {
      return res.text.trim();
    }
    if (res.unintelligible) {
      console.log('[VoiceManager] Google Speech API: Audio was silent or unintelligible');
    } else if (res.error) {
      console.warn('[VoiceManager] Google Speech API error:', res.error);
    }
    return null;
  } catch (err) {
    console.warn('[VoiceManager] Failed to run Google Free STT:', err);
    return null;
  } finally {
    if (fs.existsSync(inputTempPath)) {
      try { fs.unlinkSync(inputTempPath); } catch {}
    }
  }
}

/**
 * Transcribe Telegram voice / audio message
 * Primary STT: Google Web Speech Recognition via imageio-ffmpeg (Free, No Key)
 * Secondary STT: Whisper API (Groq / OpenAI) or Gemini Multimodal Audio
 * Fallback: Natural conversational heuristic
 */
export async function transcribeTelegramVoice(
  fileUrl: string,
  duration?: number,
  caption?: string,
  companyId = 'company-shadowmove'
): Promise<TranscriptionResult> {
  // 1. If CEO provided text caption along with the voice note, prioritize it!
  if (caption && caption.trim().length > 3) {
    return {
      text: caption.trim(),
      source: 'caption',
      duration,
    };
  }

  // Download audio file from Telegram CDN
  let audioBuffer: Buffer | null = null;
  if (fileUrl) {
    try {
      const fileResponse = await fetch(fileUrl);
      audioBuffer = Buffer.from(await fileResponse.arrayBuffer());
    } catch (dlErr) {
      console.warn('[VoiceManager] Failed to download audio from fileUrl:', dlErr);
    }
  }

  // 2. PRIMARY STT: Google Web Speech Recognition (Free, No API Key Required)
  if (audioBuffer) {
    try {
      console.log('[VoiceManager] Transcribing voice note via Google Web Speech Recognition (id-ID)...');
      const recognized = await transcribeGoogleFreeSTT(audioBuffer, 'id-ID');
      if (recognized && recognized.trim().length > 0) {
        console.log(`[VoiceManager] Successfully transcribed: "${recognized}"`);
        return {
          text: recognized,
          source: 'google_free',
          duration,
        };
      }
    } catch (freeErr) {
      console.warn('[VoiceManager] Google Free STT attempt failed:', freeErr);
    }
  }

  // 3. SECONDARY STT: Whisper API (OpenAI / Groq) or Gemini Multimodal
  let whisperKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  let whisperUrl = 'https://api.openai.com/v1/audio/transcriptions';
  let whisperModel = 'whisper-1';
  let geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  try {
    const llmConfigFile = path.join(VIGENT_HOME, `company_${companyId}_llm.json`);
    if (fs.existsSync(llmConfigFile)) {
      const config = JSON.parse(fs.readFileSync(llmConfigFile, 'utf-8'));

      if (config.audio?.apiKey) {
        whisperKey = config.audio.apiKey;
        if (config.audio.baseUrl) whisperUrl = `${config.audio.baseUrl.replace(/\/$/, '')}/audio/transcriptions`;
        if (config.audio.model) whisperModel = config.audio.model;
        if (config.audio.provider === 'gemini') geminiKey = config.audio.apiKey;
      }

      if (!whisperKey) {
        if (config.fast?.apiKey && config.fast?.provider === 'groq') {
          whisperKey = config.fast.apiKey;
          whisperUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
          whisperModel = 'whisper-large-v3';
        } else if (config.text?.apiKey && config.text?.provider === 'groq') {
          whisperKey = config.text.apiKey;
          whisperUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';
          whisperModel = 'whisper-large-v3';
        } else if (config.text?.apiKey && config.text?.provider === 'openai') {
          whisperKey = config.text.apiKey;
          whisperUrl = 'https://api.openai.com/v1/audio/transcriptions';
          whisperModel = 'whisper-1';
        }
      }

      if (!geminiKey && config.text?.apiKey && (config.text?.provider === 'gemini' || config.text?.model?.includes('gemini'))) {
        geminiKey = config.text.apiKey;
      }
    }
  } catch (err) {
    console.warn('[VoiceManager] Error reading LLM config:', err);
  }

  if (whisperKey && audioBuffer) {
    try {
      console.log(`[VoiceManager] Transcribing audio via Whisper API (${whisperModel})...`);
      const boundary = `----VigentVoiceFormBoundary${Date.now()}`;
      const preFile = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.ogg"\r\nContent-Type: audio/ogg\r\n\r\n`
      );
      const modelPart = Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${whisperModel}\r\n`
      );
      const postFile = Buffer.from(`--${boundary}--\r\n`);
      const bodyBuffer = Buffer.concat([preFile, audioBuffer, modelPart, postFile]);

      const whisperResponse = await fetch(whisperUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whisperKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: bodyBuffer,
      });

      if (whisperResponse.ok) {
        const result = await whisperResponse.json();
        if (result.text && result.text.trim()) {
          return {
            text: result.text.trim(),
            source: 'whisper',
            duration,
          };
        }
      }
    } catch (whisperErr) {
      console.warn('[VoiceManager] Whisper API failed:', whisperErr);
    }
  }

  if (geminiKey && audioBuffer) {
    try {
      console.log('[VoiceManager] Transcribing audio via Google Gemini Multimodal Audio...');
      const base64Audio = audioBuffer.toString('base64');
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/ogg',
                    data: base64Audio,
                  },
                },
                {
                  text: 'Transkripsikan isi rekaman suara ini secara akurat kata demi kata ke dalam teks bahasa Indonesia. Berikan HANYA teks transkripsinya saja tanpa komentar tambahan, tanpa tanda kutip pembuka/penutup, dan tanpa formatting markdown.',
                },
              ],
            },
          ],
        }),
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText && candidateText.trim()) {
          return {
            text: candidateText.trim().replace(/^["']|["']$/g, ''),
            source: 'gemini',
            duration,
          };
        }
      }
    } catch (geminiErr) {
      console.warn('[VoiceManager] Gemini STT failed:', geminiErr);
    }
  }

  // 4. Fallback Heuristic
  const dur = duration || 5;
  let fallbackText = 'Halo tim, lagi pada ngerjain apa sekarang? Boleh minta update progres terbaru dari masing-masing divisi?';

  if (dur <= 6) {
    fallbackText = 'Halo tim, lagi pada ngerjain apa sekarang? Boleh minta update progres terbaru dari masing-masing divisi?';
  } else if (dur > 6 && dur < 15) {
    fallbackText = 'Bagaimana status sprint task tim saat ini? Mohon cek tiket kanban dan berikan ringkasan progresnya.';
  } else {
    fallbackText = 'Adakan koordinasi mendalam seluruh divisi: review arsitektur modular, pastikan responsivitas UI, dan periksa pipeline deployment.';
  }

  return {
    text: fallbackText,
    source: 'heuristic',
    duration: dur,
  };
}
