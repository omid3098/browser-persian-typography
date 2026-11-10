"""Compare the same text box with clipping enabled and disabled."""
import sys
from PIL import Image, ImageChops

hidden, visible = (Image.open(name).convert('RGB') for name in sys.argv[1:])
diff = ImageChops.difference(hidden, visible)
changed = sum(pixel != (0, 0, 0) for pixel in diff.getdata())
print(f'Ink pixel differences: {changed}; {sys.argv[1]}')
sys.exit(1 if changed else 0)
