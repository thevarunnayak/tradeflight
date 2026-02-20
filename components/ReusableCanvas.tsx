"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { toast } from "sonner";

interface Point {
  value: number;
  time: string;
}

interface WatermarkConfig {
  enabled: boolean;
  type: "image" | "text";
  imageUrl?: string;
  text?: string;
  position:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  sizeRatio: number;
  opacity: number;
  margin: number;
}

interface ReusableCanvasProps {
  points: Point[];
  aspectRatio: string;
  duration: number;
  title?: string;
  description?: string;
  audioFile?: File | null;
  watermark?: WatermarkConfig;
  labelFontSize?: number;
  labelFontWeight?: string;
  t?: (key: string) => string;
}

export interface ReusableCanvasHandle {
  startRecording: () => Promise<void>;
  downloadMp4: () => Promise<void>;
}

const ratioMap: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1440, height: 1440 },
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1350, height: 1688 },
};

const formatAMPM = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
};

const ReusableCanvas = forwardRef<ReusableCanvasHandle, ReusableCanvasProps>(
  (
    {
      points,
      aspectRatio,
      duration,
      title,
      description,
      audioFile,
      watermark,
      labelFontSize = 24,
      labelFontWeight = "700",
      t = (key: string) => key,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ffmpegRef = useRef(new FFmpeg());

    // Preload watermark image if needed
    const watermarkImageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
      if (watermark?.type === "image" && watermark.imageUrl) {
        const img = new Image();
        img.src = watermark.imageUrl;
        watermarkImageRef.current = img;
      }
    }, [watermark]);

    const recordAnimation = async (downloadWebm: boolean): Promise<Blob> => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const { width, height } = ratioMap[aspectRatio];

        canvas.width = width;
        canvas.height = height;

        // -------------------------
        // SAFE PADDING SYSTEM
        // -------------------------
        let headerHeight = 120;
        let watermarkTopOffset = 0;
        let watermarkBottomOffset = 0;

        // -------------------------
        // PRECALCULATE WATERMARK SIZE FOR SAFE LAYOUT
        // -------------------------

        if (watermark?.enabled) {
          const maxWidth = width * watermark.sizeRatio;

          let wmHeight = 0;

          if (
            watermark.type === "image" &&
            watermarkImageRef.current?.naturalWidth
          ) {
            const img = watermarkImageRef.current;
            const aspect = img.naturalWidth / img.naturalHeight;
            wmHeight = maxWidth / aspect;
          }

          if (watermark.type === "text" && watermark.text) {
            const fontSize = width * watermark.sizeRatio * 0.2;
            ctx.font = `500 ${fontSize}px Inter`;
            wmHeight = fontSize;
          }

          if (watermark.position.startsWith("top")) {
            watermarkTopOffset = wmHeight + watermark.margin * 2;
          }

          if (watermark.position.startsWith("bottom")) {
            watermarkBottomOffset = wmHeight + watermark.margin * 2;
          }
        }

        headerHeight += watermarkTopOffset;

        if (title) headerHeight += 140;
        if (description) headerHeight += 110;

        const gapBelowHeader = 120;

        /*
  Dynamic padding calculation
  --------------------------------
  Base safe zone + scaling based on label size
*/

        // Bottom padding scales more aggressively
        const baseBottom = watermark?.enabled ? 350 : 280;
        const dynamicBottomPadding = baseBottom + labelFontSize * 6;

        const baseSide = 200;
        const dynamicSidePadding = baseSide + labelFontSize * 2;

        // Plane compensation (optical balance)
        const planeSize = 110; // same value used later
        const planeCompensation = planeSize / 2;

        // Small visual adjustment (tweakable)
        const opticalAdjustment = 20;

        const leftPadding = dynamicSidePadding;
        const rightPadding =
          dynamicSidePadding + planeCompensation + opticalAdjustment;

        const bottomPadding = dynamicBottomPadding + watermarkBottomOffset;

        const chartTop = headerHeight + gapBelowHeader;
        const chartBottom = height - bottomPadding;

        const chartLeft = leftPadding;
        const chartRight = width - rightPadding;

        const graphWidth = chartRight - chartLeft;
        const graphHeight = chartBottom - chartTop;

        // -------------------------
        // SCALE DATA
        // -------------------------

        const times = points.map((p) => {
          const [h, m] = p.time.split(":").map(Number);
          return h * 60 + m;
        });

        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        const maxValue = Math.max(...points.map((p) => p.value));
        const minValue = Math.min(...points.map((p) => p.value));

        const calculatedPoints = points.map((point, i) => {
          const x =
            chartLeft +
            ((times[i] - minTime) / (maxTime - minTime || 1)) * graphWidth;

          const y =
            chartTop +
            graphHeight -
            ((point.value - minValue) / (maxValue - minValue || 1)) *
              graphHeight;

          return {
            x,
            y,
            value: point.value,
            time: formatAMPM(point.time),
          };
        });

        const segments: number[] = [];
        let totalLength = 0;

        for (let i = 0; i < calculatedPoints.length - 1; i++) {
          const dx = calculatedPoints[i + 1].x - calculatedPoints[i].x;
          const dy = calculatedPoints[i + 1].y - calculatedPoints[i].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          segments.push(len);
          totalLength += len;
        }

        const planeImage = new Image();
        planeImage.src = "/airplane.png";

        planeImage.onload = () => {
          const stream = canvas.captureStream(60);
          const recorder = new MediaRecorder(stream, {
            mimeType: "video/webm",
          });

          const chunks: BlobPart[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, {
              type: "video/webm",
            });

            if (downloadWebm) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = generateFileName("webm");
              a.click();
            }

            resolve(blob);
          };

          recorder.start();

          const animationDuration = duration * 1000;
          const startTime = performance.now();

          function drawLabelBox(
            x: number,
            y: number,
            lines: string[],
            bg: string,
          ) {
            ctx.font = `${labelFontWeight} ${labelFontSize}px Inter, sans-serif`;

            ctx.textAlign = "center";
            const padding = 14;
            const lineHeight = labelFontSize * 1.4;

            const boxWidth =
              Math.max(...lines.map((l) => ctx.measureText(l).width)) +
              padding * 2;

            const boxHeight = lines.length * lineHeight + padding * 2;

            // Save current state
            ctx.save();

            // 80% opacity background
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = bg;
            ctx.fillRect(x - boxWidth / 2, y, boxWidth, boxHeight);

            // Restore full opacity
            ctx.restore();

            // Text fully solid
            ctx.fillStyle = "#111";

            lines.forEach((line, i) => {
              ctx.fillText(line, x, y + padding + lineHeight * (i + 0.8));
            });
          }

          function animate(now: number) {
            const progress = Math.min((now - startTime) / animationDuration, 1);

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, width, height);

            // -------------------------
            // DRAW WATERMARK FIRST IF TOP
            // -------------------------

            if (watermark?.enabled && watermark.position.startsWith("top")) {
              drawWatermark();
            }

            // -------------------------
            // TITLE + DESCRIPTION
            // -------------------------

            let headerCursor = watermarkTopOffset
              ? 60 + watermarkTopOffset
              : 120;

            if (title) {
              ctx.fillStyle = "#111";
              ctx.font = "bold 72px Inter, sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(title, width / 2, headerCursor);
              headerCursor += 90;
            }

            if (description) {
              ctx.fillStyle = "#555";
              ctx.font = "40px Inter";
              ctx.fillText(description, width / 2, headerCursor);
            }

            // -------------------------
            // DRAW LINE (BEHIND)
            // -------------------------

            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.setLineDash([16, 10]);

            let remaining = totalLength * progress;

            for (let i = 0; i < segments.length; i++) {
              if (remaining <= 0) break;

              const start = calculatedPoints[i];
              const end = calculatedPoints[i + 1];
              const seg = segments[i];

              ctx.strokeStyle =
                end.value >= start.value ? "#16a34a" : "#dc2626";

              ctx.beginPath();
              ctx.moveTo(start.x, start.y);

              if (remaining >= seg) {
                ctx.lineTo(end.x, end.y);
                remaining -= seg;
              } else {
                const r = remaining / seg;
                ctx.lineTo(
                  start.x + (end.x - start.x) * r,
                  start.y + (end.y - start.y) * r,
                );
                remaining = 0;
              }

              ctx.stroke();
            }

            ctx.setLineDash([]);

            // -------------------------
            // BLACK DOTS
            // -------------------------

            calculatedPoints.forEach((p) => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
              ctx.fillStyle = "#000";
              ctx.fill();
            });

            // -------------------------
            // LABELS BELOW POINT
            // -------------------------

            // -------------------------
            // LABELS BELOW POINT (SMART COLLISION SAFE)
            // -------------------------

            // -------------------------
            // LABELS (REFINED COLLISION SAFE)
            // -------------------------

            // -------------------------
            // SIMPLE & CORRECT LABEL LOGIC
            // -------------------------

            const placedLabels: {
              left: number;
              right: number;
              top: number;
              bottom: number;
            }[] = [];

            const baseOffset = 40;
            const spacing = 12;

            calculatedPoints.forEach((p, index) => {
              ctx.font = `${labelFontWeight} ${labelFontSize}px Inter, sans-serif`;

              ctx.textAlign = "center";
              const padding = 14;
              const lineHeight = labelFontSize * 1.4;

              const lines =
                index === 0
                  ? [t("label.start"), `${p.value} (${p.time})`]
                  : index === calculatedPoints.length - 1
                    ? [t("label.finalDestination"), `${p.value} (${p.time})`]
                    : [`${p.value} (${p.time})`];

              const boxWidth =
                Math.max(...lines.map((l) => ctx.measureText(l).width)) +
                padding * 2;

              const boxHeight = lines.length * lineHeight + padding * 2;

              let top = p.y + baseOffset;

              let box = {
                left: p.x - boxWidth / 2,
                right: p.x + boxWidth / 2,
                top,
                bottom: top + boxHeight,
              };

              const overlaps = (a: typeof box, b: typeof box) => {
                return !(
                  a.right <= b.left ||
                  a.left >= b.right ||
                  a.bottom <= b.top ||
                  a.top >= b.bottom
                );
              };

              let moved = true;

              while (moved) {
                moved = false;

                for (const placed of placedLabels) {
                  if (overlaps(box, placed)) {
                    top = placed.bottom + spacing;

                    box.top = top;
                    box.bottom = top + boxHeight;

                    moved = true;
                  }
                }
              }

              placedLabels.push(box);

              const bg =
                index === 0
                  ? "#d1fae5"
                  : index === calculatedPoints.length - 1
                    ? "#fee2e2"
                    : "#f3f4f6";

              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x, box.top);
              ctx.strokeStyle = "#e5e7eb";
              ctx.lineWidth = 2;
              ctx.stroke();

              drawLabelBox(p.x, box.top, lines, bg);
            });

            // -------------------------
            // AIRPLANE (TOPMOST)
            // -------------------------

            let planeX = calculatedPoints[0].x;
            let planeY = calculatedPoints[0].y;
            let angle = 0;
            let remain = totalLength * progress;

            for (let i = 0; i < segments.length; i++) {
              if (remain <= 0) break;
              const start = calculatedPoints[i];
              const end = calculatedPoints[i + 1];
              const seg = segments[i];

              if (remain >= seg) {
                remain -= seg;
                planeX = end.x;
                planeY = end.y;
                angle = Math.atan2(end.y - start.y, end.x - start.x);
              } else {
                const r = remain / seg;
                planeX = start.x + (end.x - start.x) * r;
                planeY = start.y + (end.y - start.y) * r;
                angle = Math.atan2(end.y - start.y, end.x - start.x);
                break;
              }
            }

            const planeSize = 110;
            ctx.save();
            ctx.translate(planeX, planeY);
            ctx.rotate(angle);
            ctx.drawImage(
              planeImage,
              -planeSize / 2,
              -planeSize / 2,
              planeSize,
              planeSize,
            );
            ctx.restore();

            // -------------------------
            // WATERMARK (TOPMOST FINAL LAYER)
            // -------------------------

            if (watermark?.enabled) {
              const margin = watermark.margin;

              ctx.save();
              ctx.globalAlpha = watermark.opacity;

              // -------------------------
              // IMAGE WATERMARK
              // -------------------------
              if (watermark.type === "image" && watermarkImageRef.current) {
                const img = watermarkImageRef.current;

                const maxWidth = width * watermark.sizeRatio;
                const aspect = img.naturalWidth / img.naturalHeight;

                let drawWidth = maxWidth;
                let drawHeight = maxWidth / aspect;

                const maxHeight = height * 0.2;

                if (drawHeight > maxHeight) {
                  drawHeight = maxHeight;
                  drawWidth = maxHeight * aspect;
                }

                let x = margin;
                let y = margin;

                if (watermark.position.includes("right")) {
                  x = width - drawWidth - margin;
                }

                if (watermark.position.includes("center")) {
                  x = width / 2 - drawWidth / 2;
                }

                if (watermark.position.includes("bottom")) {
                  y = height - drawHeight - margin;
                }

                ctx.drawImage(img, x, y, drawWidth, drawHeight);
              }

              // -------------------------
              // TEXT WATERMARK
              // -------------------------
              if (
                watermark?.enabled &&
                watermark.position.startsWith("bottom")
              ) {
                drawWatermark();
              }

              ctx.restore();
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setTimeout(() => recorder.stop(), 500);
            }
          }

          function drawWatermark() {
            if (!watermark?.enabled) return;

            const margin = watermark.margin;

            ctx.save();
            ctx.globalAlpha = watermark.opacity;

            // -------------------------
            // IMAGE WATERMARK
            // -------------------------
            if (watermark.type === "image" && watermarkImageRef.current) {
              const img = watermarkImageRef.current;

              const maxWidth = width * watermark.sizeRatio;
              const aspect = img.naturalWidth / img.naturalHeight;

              let drawWidth = maxWidth;
              let drawHeight = maxWidth / aspect;

              const maxHeight = height * 0.2;

              if (drawHeight > maxHeight) {
                drawHeight = maxHeight;
                drawWidth = maxHeight * aspect;
              }

              let x = margin;
              let y = margin;

              if (watermark.position.includes("right")) {
                x = width - drawWidth - margin;
              }

              if (watermark.position.includes("center")) {
                x = width / 2 - drawWidth / 2;
              }

              if (watermark.position.includes("bottom")) {
                y = height - drawHeight - margin;
              }

              ctx.drawImage(img, x, y, drawWidth, drawHeight);
            }

            // -------------------------
            // TEXT WATERMARK
            // -------------------------
            if (watermark.type === "text" && watermark.text) {
              const fontSize = width * watermark.sizeRatio * 0.2;

              ctx.fillStyle = "#111";
              ctx.font = `500 ${fontSize}px Inter, sans-serif`;

              let x = margin;
              let y = margin + fontSize;

              if (watermark.position.includes("right")) {
                ctx.textAlign = "right";
                x = width - margin;
              } else if (watermark.position.includes("center")) {
                ctx.textAlign = "center";
                x = width / 2;
              } else {
                ctx.textAlign = "left";
              }

              if (watermark.position.includes("bottom")) {
                y = height - margin;
              }

              ctx.fillText(watermark.text, x, y);
            }

            ctx.restore();
          }

          requestAnimationFrame(animate);
        };
      });
    };

    const generateFileName = (ext: string) => {
      const now = new Date();

      const timestamp =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        "_" +
        String(now.getHours()).padStart(2, "0") +
        "-" +
        String(now.getMinutes()).padStart(2, "0") +
        "-" +
        String(now.getSeconds()).padStart(2, "0");

      // sanitize title for file system
      const safeTitle = title
        ? title
            .toLowerCase()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "")
        : "tradeflight";

      return `${safeTitle}-${timestamp}.${ext}`;
    };

    useImperativeHandle(ref, () => ({
      async startRecording() {
        const toastId = toast.loading(t("toast.recording"));

        try {
          await recordAnimation(true);
          toast.success(t("toast.webmDownloaded"), {
            id: toastId,
          });
        } catch {
          toast.error(t("toast.recordingFailed"), {
            id: toastId,
          });
        }
      },

      async downloadMp4() {
        const toastId = toast.loading(t("toast.recording"));

        try {
          const webmBlob = await recordAnimation(false);

          const ffmpeg = ffmpegRef.current;
          if (!ffmpeg.loaded) await ffmpeg.load();

          toast.loading(t("toast.preparingVideo"), { id: toastId });

          await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

          if (audioFile) {
            await ffmpeg.writeFile("audio", await fetchFile(audioFile));

            toast.loading(t("toast.mergingAudio"), { id: toastId });

            await ffmpeg.exec([
              "-i",
              "input.webm",
              "-i",
              "audio",
              "-c:v",
              "libx264",
              "-preset",
              "ultrafast",
              "-c:a",
              "aac",
              "-shortest",
              "output.mp4",
            ]);
          } else {
            await ffmpeg.exec([
              "-i",
              "input.webm",
              "-c:v",
              "libx264",
              "-preset",
              "ultrafast",
              "output.mp4",
            ]);
          }

          const data = await ffmpeg.readFile("output.mp4");

          if (typeof data === "string") throw new Error();

          const mp4Blob = new Blob([new Uint8Array(data)], {
            type: "video/mp4",
          });

          const url = URL.createObjectURL(mp4Blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = generateFileName("mp4");
          a.click();

          toast.success(t("toast.mp4Downloaded"), { id: toastId });
        } catch {
          toast.error(t("toast.mp4Failed"), { id: toastId });
        }
      },
    }));

    useEffect(() => {
      recordAnimation(false);
    }, [points, aspectRatio, duration, t]);

    return (
      <canvas
        ref={canvasRef}
        className="w-full max-w-4xl border border-zinc-200 rounded-md"
      />
    );
  },
);

export default ReusableCanvas;
