#!/usr/bin/env python3
"""
High-Performance Local Free Voice Service for CEO Virtual (Vigent)
- TTS: Microsoft Edge Neural TTS (id-ID-GadisNeural, id-ID-ArdiNeural, en-US-AriaNeural, en-US-GuyNeural)
- STT: Google Web Speech Recognition via imageio-ffmpeg & SpeechRecognition (Free, No API Key Required)
"""

import sys
import os
import json
import argparse
import asyncio
import tempfile
import subprocess

def run_tts(text: str, voice: str, output_path: str):
    import edge_tts

    async def _generate():
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)

    asyncio.run(_generate())
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        print(json.dumps({"success": True, "output": output_path, "bytes": os.path.getsize(output_path)}))
    else:
        print(json.dumps({"success": False, "error": "Generated audio file is empty or missing"}))

def run_stt(input_path: str, lang: str = "id-ID"):
    import speech_recognition as sr
    import imageio_ffmpeg

    if not os.path.exists(input_path):
        print(json.dumps({"success": False, "error": f"Input file not found: {input_path}"}))
        return

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    wav_temp = None

    try:
        # Create temporary 16kHz Mono 16-bit PCM WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            wav_temp = tf.name

        # Convert input audio (e.g. Telegram .ogg / .oga Opus or .mp3) to 16kHz mono WAV
        cmd = [
            ffmpeg_exe,
            "-y",
            "-i", input_path,
            "-ar", "16000",
            "-ac", "1",
            "-sample_fmt", "s16",
            wav_temp
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode != 0:
            print(json.dumps({"success": False, "error": f"FFmpeg audio conversion failed with code {res.returncode}"}))
            return

        # Perform Speech Recognition via Google's Web Speech API (Free)
        r = sr.Recognizer()
        with sr.AudioFile(wav_temp) as source:
            # Adjust ambient noise if needed
            audio_data = r.record(source)

        text = r.recognize_google(audio_data, language=lang)
        print(json.dumps({"success": True, "text": text.strip()}))
    except sr.UnknownValueError:
        print(json.dumps({"success": False, "error": "Audio could not be understood (silence or unclear speech)", "unintelligible": True}))
    except sr.RequestError as e:
        print(json.dumps({"success": False, "error": f"Google Speech API network error: {e}"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        if wav_temp and os.path.exists(wav_temp):
            try:
                os.remove(wav_temp)
            except Exception:
                pass

def main():
    parser = argparse.ArgumentParser(description="CEO Virtual Free Voice Service")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # TTS Parser
    tts_parser = subparsers.add_parser("tts")
    tts_parser.add_argument("--text", type=str, help="Text to speak")
    tts_parser.add_argument("--text-file", type=str, help="Path to text file to speak")
    tts_parser.add_argument("--voice", type=str, default="id-ID-GadisNeural", help="Edge TTS voice name")
    tts_parser.add_argument("--output", type=str, required=True, help="Output mp3 file path")

    # STT Parser
    stt_parser = subparsers.add_parser("stt")
    stt_parser.add_argument("--input", type=str, required=True, help="Input audio file path (.oga, .ogg, .mp3, .wav)")
    stt_parser.add_argument("--lang", type=str, default="id-ID", help="Speech recognition language code")

    args = parser.parse_args()

    if args.command == "tts":
        text_content = ""
        if args.text_file and os.path.exists(args.text_file):
            with open(args.text_file, "r", encoding="utf-8") as f:
                text_content = f.read().strip()
        elif args.text:
            text_content = args.text.strip()
        else:
            print(json.dumps({"success": False, "error": "No text provided"}))
            return

        run_tts(text_content, args.voice, args.output)

    elif args.command == "stt":
        run_stt(args.input, args.lang)

if __name__ == "__main__":
    main()
