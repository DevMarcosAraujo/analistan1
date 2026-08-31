import { createCanvas } from "canvas";
import fs from "node:fs";

const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const scale = parseFloat(process.argv[4] || "2.2");
const removeRedFlag = process.argv[5] === "removered";

const data = new Uint8Array(fs.readFileSync(inputPath));
const doc = await pdfjsLib.getDocument({ data }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale });

const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const ctx = canvas.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

await page.render({ canvasContext: ctx, viewport }).promise;

if (removeRedFlag) {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 120 && r - g > 40 && r - b > 40) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const buf = canvas.toBuffer("image/jpeg", { quality: 0.9 });
fs.writeFileSync(outputPath, buf);
console.log(JSON.stringify({ width: canvas.width, height: canvas.height, bytes: buf.length }));
