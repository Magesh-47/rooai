"""
Speaker-attributed transcription pipeline.

Combines pyannote speaker diarization with Faster-Whisper ASR to produce
a transcript where each segment is labelled "Speaker A", "Speaker B", etc.

Usage:
    export HF_TOKEN=your_token_here
    python transcription.py meeting.mp4

Or from Python:
    from transcription import transcribe
    segments = transcribe("meeting.mp4")
"""

import os
import sys
import json
import argparse
from pathlib import Path

import torch
import torchaudio
from pyannote.audio import Pipeline
from pyannote.core import Segment
from faster_whisper import WhisperModel


# ──────────────────────────────────────────────
# Speaker mapping helpers
# ──────────────────────────────────────────────

def _build_speaker_map(diarization) -> dict[str, str]:
    """
    Map internal pyannote IDs (SPEAKER_00, SPEAKER_01 …) to
    human-readable labels (Speaker A, Speaker B …) in first-appearance order.
    """
    mapping: dict[str, str] = {}
    for _, _, speaker_id in diarization.itertracks(yield_label=True):
        if speaker_id not in mapping:
            label_index = len(mapping)
            if label_index < 26:
                letter = chr(ord('A') + label_index)
                mapping[speaker_id] = f"Speaker {letter}"
            else:
                # Beyond Z: Speaker AA, Speaker AB, …
                outer = chr(ord('A') + (label_index // 26) - 1)
                inner = chr(ord('A') + (label_index % 26))
                mapping[speaker_id] = f"Speaker {outer}{inner}"
    return mapping


def _dominant_speaker(
    diarization,
    start: float,
    end: float,
    speaker_map: dict[str, str],
) -> str:
    """Return the speaker label with the most overlap in [start, end]."""
    overlap: dict[str, float] = {}
    query = Segment(start, end)

    for segment, _, speaker_id in diarization.itertracks(yield_label=True):
        inter_start = max(segment.start, query.start)
        inter_end = min(segment.end, query.end)
        if inter_end > inter_start:
            overlap[speaker_id] = overlap.get(speaker_id, 0.0) + (inter_end - inter_start)

    if not overlap:
        return "Unknown"

    dominant_id = max(overlap, key=overlap.__getitem__)
    return speaker_map.get(dominant_id, dominant_id)


# ──────────────────────────────────────────────
# Main pipeline
# ──────────────────────────────────────────────

def transcribe(
    audio_path: str,
    *,
    whisper_model: str = "base",
    diarization_model: str = "pyannote/speaker-diarization-community-1",
    hf_token: str | None = None,
    language: str | None = None,
) -> list[dict]:
    """
    Transcribe an audio/video file with per-speaker labels.

    Parameters
    ----------
    audio_path        : path to .mp3 / .mp4 / .wav / .m4a / .webm
    whisper_model     : faster-whisper model size ("tiny", "base", "small", "medium", "large-v3")
    diarization_model : pyannote model name on HuggingFace
    hf_token          : HuggingFace token (falls back to HF_TOKEN env var)
    language          : ISO-639-1 language code, e.g. "ta" for Tamil, None = auto-detect

    Returns
    -------
    List of dicts:
        [
          {
            "speaker": "Speaker A",
            "start":   0.0,          # seconds
            "end":     3.42,
            "text":    "Hello everyone."
          },
          ...
        ]
    """
    token = hf_token or os.environ.get("HF_TOKEN")
    if not token:
        raise EnvironmentError(
            "HuggingFace token required. Set HF_TOKEN environment variable "
            "or pass hf_token= to this function."
        )

    audio_path = str(Path(audio_path).resolve())
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[roo] device={device}  audio={audio_path}")

    # ── 1. Speaker diarization ──────────────────
    print("[roo] loading diarization pipeline …")
    diarization_pipeline = Pipeline.from_pretrained(
        diarization_model,
        use_auth_token=token,
    )
    diarization_pipeline = diarization_pipeline.to(torch.device(device))

    # Pre-load audio via torchaudio (avoids torchcodec DLL issues on Windows)
    print("[roo] loading audio …")
    waveform, sample_rate = torchaudio.load(audio_path)
    audio_input = {"waveform": waveform, "sample_rate": sample_rate}

    print("[roo] running diarization …")
    diarization = diarization_pipeline(audio_input)
    speaker_map = _build_speaker_map(diarization)

    print(f"[roo] detected {len(speaker_map)} speaker(s): {list(speaker_map.values())}")

    # ── 2. Transcription ────────────────────────
    compute_type = "float16" if device == "cuda" else "int8"
    print(f"[roo] loading Whisper '{whisper_model}' ({compute_type}) …")
    asr = WhisperModel(whisper_model, device=device, compute_type=compute_type)

    print("[roo] transcribing …")
    whisper_segments, info = asr.transcribe(
        audio_path,
        beam_size=5,
        language=language,
        vad_filter=True,          # skip silence
        vad_parameters={"min_silence_duration_ms": 500},
    )

    detected_lang = info.language
    print(f"[roo] detected language: {detected_lang}  (confidence {info.language_probability:.0%})")

    # ── 3. Align ASR segments with speaker segments ─
    result: list[dict] = []
    for seg in whisper_segments:
        text = seg.text.strip()
        if not text:
            continue

        speaker = _dominant_speaker(diarization, seg.start, seg.end, speaker_map)

        result.append({
            "speaker":  speaker,
            "start":    round(seg.start, 3),
            "end":      round(seg.end, 3),
            "text":     text,
            "language": detected_lang,
        })

    # ── 4. Merge consecutive segments from same speaker ─
    result = _merge_consecutive(result)

    return result


def _merge_consecutive(segments: list[dict]) -> list[dict]:
    """
    Merge back-to-back segments from the same speaker so the transcript
    reads naturally rather than having one segment per Whisper sentence.
    Gap threshold: 1.5 s — longer gaps start a new entry even for the same speaker.
    """
    if not segments:
        return segments

    merged: list[dict] = []
    current = dict(segments[0])

    for seg in segments[1:]:
        gap = seg["start"] - current["end"]
        same_speaker = seg["speaker"] == current["speaker"]

        if same_speaker and gap <= 1.5:
            current["end"] = seg["end"]
            current["text"] = current["text"] + " " + seg["text"]
        else:
            merged.append(current)
            current = dict(seg)

    merged.append(current)
    return merged


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def _format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio with speaker labels")
    parser.add_argument("audio", help="Path to audio/video file")
    parser.add_argument("--model", default="base", help="Whisper model size (default: base)")
    parser.add_argument("--language", default=None, help="Language code, e.g. ta, te, en")
    parser.add_argument("--output", default=None, help="Save result to JSON file")
    args = parser.parse_args()

    segments = transcribe(
        args.audio,
        whisper_model=args.model,
        language=args.language,
    )

    print("\n── Transcript ──────────────────────────────────────\n")
    for seg in segments:
        ts = f"[{_format_timestamp(seg['start'])} → {_format_timestamp(seg['end'])}]"
        print(f"{ts}  {seg['speaker']}")
        print(f"  {seg['text']}\n")

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json.dumps(segments, ensure_ascii=False, indent=2))
        print(f"[roo] saved to {out_path}")
    else:
        print(json.dumps(segments, ensure_ascii=False, indent=2))
