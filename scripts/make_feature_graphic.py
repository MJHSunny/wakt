from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
except Exception as exc:  # Pillow missing or broken
    log_path = Path(__file__).with_suffix(".log")
    log_path.write_text(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] Failed to import Pillow: {exc}\n")
    raise

SRC_DIR = Path(r"c:\Users\mdjub\Desktop\NewProject\wakt\app_icons")
TARGET_PATH = SRC_DIR / "feature-graphic.png"
TARGET_SIZE = (1024, 500)
SOURCE_NAME = "Screenshot_2025-12-25-12-26-16-739_com.theaark.wakt.jpg"

def crop_to_cover(img: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    target_w, target_h = target_size
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h
    if src_ratio > target_ratio:
        # Wider than target: trim width
        new_h = src_h
        new_w = int(new_h * target_ratio)
    else:
        # Taller than target: trim height
        new_w = src_w
        new_h = int(new_w / target_ratio)
    left = (src_w - new_w) // 2
    top = (src_h - new_h) // 2
    return img.crop((left, top, left + new_w, top + new_h))

def main() -> None:
    src_path = SRC_DIR / SOURCE_NAME
    if not src_path.exists():
        raise SystemExit(f"Source screenshot not found: {src_path}")
    with Image.open(src_path) as img:
        cropped = crop_to_cover(img, TARGET_SIZE)
        resized = cropped.resize(TARGET_SIZE, Image.LANCZOS)
        resized.save(TARGET_PATH)
        print(f"Created {TARGET_PATH.name} at {TARGET_SIZE[0]}x{TARGET_SIZE[1]} from {src_path.name}")

if __name__ == "__main__":
    main()
