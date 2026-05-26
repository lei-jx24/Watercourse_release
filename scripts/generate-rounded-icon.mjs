import { readFileSync, writeFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/generate-rounded-icon.mjs <input-jpg> <output-png>");
  process.exit(1);
}

const source = jpeg.decode(readFileSync(inputPath), { useTArray: true });
const { width, height, data } = source;
const radius = Math.min(width, height) * 0.22;
const png = new PNG({ width, height });

for (let index = 0; index < data.length; index += 4) {
  const pixel = index / 4;
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  const alpha = cornerAlpha(x + 0.5, y + 0.5, width, height, radius);

  png.data[index] = data[index];
  png.data[index + 1] = data[index + 1];
  png.data[index + 2] = data[index + 2];
  png.data[index + 3] = Math.round(data[index + 3] * alpha);
}

writeFileSync(outputPath, PNG.sync.write(png));

function cornerAlpha(x, y, width, height, radius) {
  const left = x < radius;
  const right = x > width - radius;
  const top = y < radius;
  const bottom = y > height - radius;

  if (!(left || right) || !(top || bottom)) {
    return 1;
  }

  const centerX = left ? radius : width - radius;
  const centerY = top ? radius : height - radius;
  const distance = Math.hypot(x - centerX, y - centerY);

  if (distance <= radius - 0.5) {
    return 1;
  }

  if (distance >= radius + 0.5) {
    return 0;
  }

  return radius + 0.5 - distance;
}
