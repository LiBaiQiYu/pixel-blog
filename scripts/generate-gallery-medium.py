#!/usr/bin/env python3
"""Generate gallery preview images and tiny placeholders.

Reads originals from public/gallery/original and writes 2048px WebP
previews to public/gallery/medium, preserving EXIF orientation. Also writes
tiny inline WebP placeholders used by the gallery grid to
src/data/gallery-placeholders.json.

Usage:
    python scripts/generate-gallery-medium.py
    python scripts/generate-gallery-medium.py --max-size 2048 --quality 82

Requires Pillow (pip install Pillow).
"""

from __future__ import annotations

import argparse
import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
GALLERY_DIR = ROOT / "public" / "gallery"
SOURCE_DIR = GALLERY_DIR / "original"
OUTPUT_DIR = GALLERY_DIR / "medium"
PLACEHOLDER_PATH = ROOT / "src" / "data" / "gallery-placeholders.json"
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def write_placeholders() -> None:
    placeholders: dict[str, str] = {}
    for source in sorted(GALLERY_DIR.glob("*.webp")):
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image)
            image.thumbnail((40, 40), Image.Resampling.LANCZOS)
            image = image.convert("RGB")
            buffer = io.BytesIO()
            image.save(buffer, "WEBP", quality=35, method=4)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        placeholders[source.stem] = f"data:image/webp;base64,{encoded}"

    PLACEHOLDER_PATH.write_text(
        json.dumps(placeholders, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"{len(placeholders)} placeholders, "
        f"{PLACEHOLDER_PATH.stat().st_size / 1024:.1f} KB JSON"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-size", type=int, default=2048)
    parser.add_argument("--quality", type=int, default=82)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(
        path for path in SOURCE_DIR.iterdir() if path.suffix.lower() in SOURCE_SUFFIXES
    )
    if not sources:
        raise SystemExit(f"No source images found in {SOURCE_DIR}")

    total = 0
    for source in sources:
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image)
            image.thumbnail((args.max_size, args.max_size), Image.Resampling.LANCZOS)
            image = image.convert("RGB")
            output = OUTPUT_DIR / f"{source.stem}.webp"
            image.save(output, "WEBP", quality=args.quality, method=6)
            size = output.stat().st_size
            total += size
            print(
                f"{output.name:<20} {image.width}x{image.height} "
                f"{size / 1024:.0f} KB"
            )

    print(f"{len(sources)} previews, {total / 1024 / 1024:.1f} MB total")
    write_placeholders()


if __name__ == "__main__":
    main()
