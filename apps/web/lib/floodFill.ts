import { CANVAS } from '@drawguess/shared';

export function floodFillSpans(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance = 36,
  maxPoints: number = CANVAS.maxPointsPerStroke,
): number[] | null {
  if (
    width <= 0 ||
    height <= 0 ||
    pixels.length < width * height * 4 ||
    startX < 0 ||
    startY < 0 ||
    startX >= width ||
    startY >= height
  ) {
    return null;
  }

  const seed = (startY * width + startX) * 4;
  const target = [pixels[seed], pixels[seed + 1], pixels[seed + 2], pixels[seed + 3]];
  const visited = new Uint8Array(width * height);
  const pending = [startY * width + startX];
  const spans: number[] = [];
  const matches = (index: number) => {
    if (visited[index]) return false;
    const offset = index * 4;
    return (
      Math.abs(pixels[offset] - target[0]) <= tolerance &&
      Math.abs(pixels[offset + 1] - target[1]) <= tolerance &&
      Math.abs(pixels[offset + 2] - target[2]) <= tolerance &&
      Math.abs(pixels[offset + 3] - target[3]) <= tolerance
    );
  };

  while (pending.length) {
    const index = pending.pop()!;
    if (!matches(index)) continue;
    const y = Math.floor(index / width);
    let left = index % width;
    let right = left;
    while (left > 0 && matches(y * width + left - 1)) left--;
    while (right + 1 < width && matches(y * width + right + 1)) right++;

    if (spans.length + 4 > maxPoints) return null;
    const lineY = (y + 0.5) / height;
    spans.push(left / width, lineY, (right + 1) / width, lineY);
    for (let x = left; x <= right; x++) visited[y * width + x] = 1;

    for (const nextY of [y - 1, y + 1]) {
      if (nextY < 0 || nextY >= height) continue;
      let inRun = false;
      for (let x = left; x <= right; x++) {
        const next = nextY * width + x;
        if (matches(next)) {
          if (!inRun) pending.push(next);
          inRun = true;
        } else {
          inRun = false;
        }
      }
    }
  }

  return spans;
}