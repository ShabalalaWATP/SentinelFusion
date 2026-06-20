import type { Map as MapLibreMap } from "maplibre-gl";

const iconSize = 80;

const aircraftIcons = [
  ["aircraft-commercial", "#22d3ee", "#e0faff"],
  ["aircraft-private", "#f59e0b", "#fff7ed"],
  ["aircraft-emergency", "#ef4444", "#fff1f2"],
  ["aircraft-military", "#a78bfa", "#f5f3ff"],
  ["aircraft-government", "#38bdf8", "#e0f2fe"],
  ["aircraft-unknown", "#94a3b8", "#f8fafc"]
] as const;

export function ensureAircraftIcons(map: MapLibreMap): void {
  aircraftIcons.forEach(([id, fill, stroke]) => {
    if (!map.hasImage(id)) {
      map.addImage(id, createAircraftIcon(fill, stroke), { pixelRatio: 2 });
    }
  });
}

function createAircraftIcon(fill: string, stroke: string): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = iconSize;
  canvas.height = iconSize;
  const context = canvas.getContext("2d");
  if (!context) {
    return new ImageData(iconSize, iconSize);
  }

  context.translate(iconSize / 2, iconSize / 2);
  drawShadow(context);
  drawAirframe(context, fill, stroke);
  drawCockpit(context);
  drawWingDetails(context);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function drawShadow(context: CanvasRenderingContext2D): void {
  context.save();
  context.translate(0, 2.5);
  aircraftPath(context);
  context.fillStyle = "rgba(2, 6, 23, 0.56)";
  context.fill();
  context.restore();
}

function drawAirframe(
  context: CanvasRenderingContext2D,
  fill: string,
  stroke: string
): void {
  context.save();
  aircraftPath(context);
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineJoin = "round";
  context.lineWidth = 3.2;
  context.fill();
  context.stroke();
  context.restore();
}

function aircraftPath(context: CanvasRenderingContext2D): void {
  context.beginPath();
  context.moveTo(0, -34);
  context.bezierCurveTo(4, -30, 7, -21, 7, -9);
  context.lineTo(31, 6);
  context.quadraticCurveTo(35, 9, 33, 14);
  context.lineTo(6, 8);
  context.lineTo(5, 25);
  context.lineTo(17, 34);
  context.lineTo(8, 36);
  context.lineTo(0, 30);
  context.lineTo(-8, 36);
  context.lineTo(-17, 34);
  context.lineTo(-5, 25);
  context.lineTo(-6, 8);
  context.lineTo(-33, 14);
  context.quadraticCurveTo(-35, 9, -31, 6);
  context.lineTo(-7, -9);
  context.bezierCurveTo(-7, -21, -4, -30, 0, -34);
  context.closePath();
}

function drawCockpit(context: CanvasRenderingContext2D): void {
  context.save();
  context.fillStyle = "rgba(248, 250, 252, 0.86)";
  context.strokeStyle = "rgba(15, 23, 42, 0.42)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.ellipse(0, -18, 4.8, 8.4, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawWingDetails(context: CanvasRenderingContext2D): void {
  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.48)";
  context.lineWidth = 1.8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-20, 7);
  context.lineTo(20, 7);
  context.moveTo(0, -7);
  context.lineTo(0, 24);
  context.stroke();
  context.restore();
}
