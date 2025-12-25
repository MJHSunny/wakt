from pathlib import Path
from PIL import Image

def main():
    root = Path(r"c:\Users\mdjub\Desktop\NewProject\wakt\app_icons")
    files = sorted(root.glob("Screenshot_*.jpg"))
    print(f"Found {len(files)} screenshots")
    for p in files:
        with Image.open(p) as im:
            print(f"{p.name}: {im.size[0]}x{im.size[1]}")

if __name__ == "__main__":
    main()
