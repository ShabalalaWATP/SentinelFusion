import type { Map as MapLibreMap } from "maplibre-gl";

const iconSize = 72;

const shipIcons = [
  ["ship-low", "#2dd4bf", "#e0faff"],
  ["ship-medium", "#f59e0b", "#fff7ed"],
  ["ship-high", "#ef4444", "#fff1f2"],
  ["ship-military", "#a78bfa", "#f5f3ff"],
  ["ship-government", "#38bdf8", "#e0f2fe"]
] as const;

export function ensureShipIcons(map: MapLibreMap): void {
  shipIcons.forEach(([id, fill, stroke]) => {
    if (!map.hasImage(id)) {
      map.addImage(id, createShipIcon(fill, stroke), { pixelRatio: 2 });
    }
  });
}

function createShipIcon(fill: string, stroke: string): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;
  const context = canvas.getContext("2d");
  if (!context) {
    return new ImageData(iconSize, iconSize);
  }

  context.translate(iconSize / 2, iconSize / 2);
  drawWake(context);
  drawHullShadow(context);
  drawHull(context, fill, stroke);
  drawDeck(context);
  drawCabin(context);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function drawWake(context: CanvasRenderingContext2D): void {
  context.save();
  context.strokeStyle = "rgba(226, 249, 255, 0.36)";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-10, 24);
  context.lineTo(-19, 31);
  context.moveTo(10, 24);
  context.lineTo(19, 31);
  context.stroke();
  context.restore();
}

function drawHullShadow(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(0, 2);
  drawHullPath(context);
  context.fillStyle = "rgba(2, 6, 23, 0.52)";
  context.fill();
  context.restore();
}

function drawHull(context: CanvasRenderingContext2D, fill: string, stroke: string): void {
  context.save();
  drawHullPath(context);
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 3.5;
  context.lineJoin = "round";
  context.fill();
  context.stroke();
  context.restore();
}

function drawHullPath(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(0, -31);
  context.bezierCurveTo(14, -19, 20, -1, 18, 20);
  context.quadraticCurveTo(10, 29, 0, 32);
  context.quadraticCurveTo(-10, 29, -18, 20);
  context.bezierCurveTo(-20, -1, -14, -19, 0, -31);
  context.closePath();
}

function drawDeck(context: CanvasRenderingContext2D): void {
  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.52)";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(0, -22);
  context.lineTo(0, 23);
  context.moveTo(-9, 11);
  context.lineTo(9, 11);
  context.stroke();
  context.restore();
}

function drawCabin(context: CanvasRenderingContext2D): void {
  context.save();
  context.fillStyle = "rgba(248, 250, 252, 0.88)";
  context.strokeStyle = "rgba(15, 23, 42, 0.46)";
  context.lineWidth = 1.5;
  roundRect(context, -7, -8, 14, 13, 3);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(14, 165, 233, 0.55)";
  roundRect(context, -4, -5, 8, 4, 2);
  context.fill();
  context.restore();
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
