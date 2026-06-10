// Renders a scan result to a PNG (headline, ✓/✗ prompt table, competitor
// leaderboard) for pasting straight into an outreach email. Hand-drawn on a
// canvas — no html2canvas dependency, and the output is always clean
// regardless of page CSS.

import type { Scan } from "./api";

const W = 1160; // logical px; canvas renders at 2x
const PAD = 36;
const SCALE = 2;

const C = {
  bg: "#0F1A1F",
  line: "#1C2F36",
  ink: "#F3F7F8",
  ink2: "#A7BCC4",
  ink3: "#6E848C",
  blue: "#38A9E0",
  blueSoft: "#15303D",
  red: "#FF4B4B",
  green: "#58CC02",
  surface2: "#1C2F36",
};

const FONT = (size: number, weight = 400) => `${weight} ${size}px Nunito, Arial, sans-serif`;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderScanImage(scan: Scan): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Column layout for the prompt table.
  const colPrompt = { x: PAD, w: 470 };
  const colMark = { x: PAD + 500, w: 90 };
  const colBrands = { x: PAD + 620, w: W - PAD - (PAD + 620) };

  // --- Measure pass: compute per-row heights so the canvas fits exactly. ---
  ctx.font = FONT(15, 600);
  const rows = scan.answers.map((a) => {
    ctx.font = FONT(15, 600);
    const promptLines = wrapText(ctx, `“${a.prompt}”`, colPrompt.w);
    ctx.font = FONT(15, 400);
    const brandLines = wrapText(ctx, a.competitors.join(", ") || "—", colBrands.w);
    const h = Math.max(promptLines.length, brandLines.length) * 24 + 22;
    return { a, promptLines, brandLines, h };
  });

  const leaders = scan.competitors.slice(0, 8);
  const headH = 110; // headline + table header
  const tableH = rows.reduce((s, r) => s + r.h, 0);
  const lbH = leaders.length ? 56 + leaders.length * 34 : 0;
  const footH = 52;
  const H = headH + tableH + lbH + footH + PAD;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // --- Headline ---
  let y = PAD + 16;
  ctx.textBaseline = "middle";
  ctx.font = FONT(24, 800);
  const part1 = "Mentioned in ";
  const part2 = `${scan.mentionedCount}/${scan.totalPrompts}`;
  const part3 = " ChatGPT answers";
  let x = PAD;
  ctx.fillStyle = C.ink;
  ctx.fillText(part1, x, y);
  x += ctx.measureText(part1).width;
  ctx.fillStyle = C.blue;
  ctx.fillText(part2, x, y);
  x += ctx.measureText(part2).width;
  ctx.fillStyle = C.ink;
  ctx.fillText(part3, x, y);
  x += ctx.measureText(part3).width;

  // "ChatGPT (API)" pill
  ctx.font = FONT(12, 800);
  const pillText = "ChatGPT (API)";
  const pillW = ctx.measureText(pillText).width + 24;
  ctx.fillStyle = C.surface2;
  ctx.beginPath();
  ctx.roundRect(x + 16, y - 13, pillW, 26, 13);
  ctx.fill();
  ctx.fillStyle = C.ink3;
  ctx.fillText(pillText, x + 28, y + 1);

  // --- Table header ---
  y = PAD + 64;
  ctx.font = FONT(12, 800);
  ctx.fillStyle = C.ink3;
  ctx.fillText("BUYER PROMPT", colPrompt.x, y);
  ctx.fillText(`${scan.brand.toUpperCase()}?`, colMark.x, y);
  ctx.fillText("BRANDS RECOMMENDED", colBrands.x, y);
  y += 18;
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();

  // --- Rows ---
  for (const r of rows) {
    const rowTop = y + 22;
    ctx.font = FONT(15, 600);
    ctx.fillStyle = C.ink;
    r.promptLines.forEach((l, i) => ctx.fillText(l, colPrompt.x, rowTop + i * 24));

    ctx.font = FONT(17, 900);
    ctx.fillStyle = r.a.mentioned ? C.green : C.red;
    ctx.fillText(r.a.mentioned ? "✓" : "✗", colMark.x, rowTop);

    ctx.font = FONT(15, 400);
    ctx.fillStyle = C.ink2;
    r.brandLines.forEach((l, i) => ctx.fillText(l, colBrands.x, rowTop + i * 24));

    y += r.h;
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 10);
    ctx.lineTo(W - PAD, y + 10);
    ctx.stroke();
    y += 10;
  }

  // --- Leaderboard ---
  if (leaders.length) {
    y += 40;
    ctx.font = FONT(13, 800);
    ctx.fillStyle = C.ink3;
    ctx.fillText("WHO CHATGPT RECOMMENDS INSTEAD", PAD, y);
    y += 16;
    const nameW = 240;
    const countW = 60;
    const barX = PAD + nameW + 16;
    const barW = W - PAD - countW - barX;
    const max = leaders[0].mentions;
    for (const l of leaders) {
      y += 34;
      ctx.font = FONT(15, 600);
      ctx.fillStyle = C.ink;
      ctx.fillText(l.name, PAD, y, nameW);
      ctx.fillStyle = C.blueSoft;
      ctx.beginPath();
      ctx.roundRect(barX, y - 6, barW, 12, 6);
      ctx.fill();
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      ctx.roundRect(barX, y - 6, Math.max(16, (l.mentions / max) * barW), 12, 6);
      ctx.fill();
      ctx.font = FONT(13, 600);
      ctx.fillStyle = C.ink3;
      ctx.textAlign = "right";
      ctx.fillText(`${l.mentions}/${scan.totalPrompts}`, W - PAD, y);
      ctx.textAlign = "left";
    }
  }

  // --- Footer ---
  ctx.font = FONT(12, 600);
  ctx.fillStyle = C.ink3;
  ctx.fillText(
    `clerow.com · AI visibility scan · ${new Date(scan.createdAt).toISOString().slice(0, 10)}`,
    PAD,
    H - 26,
  );

  return canvas;
}

/** Copy the rendered PNG to the clipboard; falls back to downloading it. */
export async function copyScanImage(scan: Scan): Promise<"copied" | "downloaded"> {
  const canvas = renderScanImage(scan);
  const blob = () =>
    new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  try {
    // Promise form keeps Safari happy (clipboard write must stay in-gesture).
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob() })]);
    return "copied";
  } catch {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `clerow-scan-${scan.brand.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    return "downloaded";
  }
}
