#!/usr/bin/env python3
"""Narration for studio videos, generated locally with Kokoro (Apache-2.0).

Reads JSON on stdin: {"voice": "af_heart", "speed": 1.0, "out": "<dir>",
"lines": ["...", "..."]}. Writes <out>/voice-<n>.wav for every line and prints
{"seconds": [..]} on stdout. Model files come from KOKORO_MODEL and
KOKORO_VOICES (on Node 2 and in CI: kokoro-v1.0.int8.onnx, voices-v1.0.bin).
No text leaves the machine.
"""
import json
import os
import sys

import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    request = json.load(sys.stdin)
    kokoro = Kokoro(os.environ["KOKORO_MODEL"], os.environ["KOKORO_VOICES"])
    out = request["out"]
    os.makedirs(out, exist_ok=True)
    seconds = []
    for index, line in enumerate(request["lines"]):
        samples, rate = kokoro.create(line, voice=request.get("voice", "af_heart"),
                                      speed=float(request.get("speed", 1.0)), lang="en-us")
        sf.write(os.path.join(out, f"voice-{index}.wav"), samples, rate)
        seconds.append(round(len(samples) / rate, 3))
    json.dump({"seconds": seconds}, sys.stdout)


if __name__ == "__main__":
    main()
