#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Play one local audio file using common Linux audio players."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def build_command(audio_path: Path) -> list[str]:
    candidates = (
        ("paplay", [str(audio_path)]),
        ("aplay", [str(audio_path)]),
        ("ffplay", ["-nodisp", "-autoexit", str(audio_path)]),
    )
    for executable, args in candidates:
        resolved = shutil.which(executable)
        if resolved is not None:
            return [resolved, *args]
    raise RuntimeError("No supported audio player found. Tried paplay, aplay, ffplay.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Play a local WAV/audio file.")
    parser.add_argument("audio_path", type=Path, help="Path to a generated audio file.")
    args = parser.parse_args()

    audio_path = args.audio_path.expanduser()
    if not audio_path.is_file():
        print(f"Error: audio file does not exist: {audio_path}", file=sys.stderr)
        return 2

    try:
        command = build_command(audio_path)
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    result = subprocess.run(command, check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
