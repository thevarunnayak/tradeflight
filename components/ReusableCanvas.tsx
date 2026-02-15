"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { toast } from "sonner";

interface Point {
  value: number;
  time: string;
}

interface ReusableCanvasProps {
  points: Point[];
  aspectRatio: string;
  duration: number;
  title?: string;
  description?: string;
}

export interface ReusableCanvasHandle {
  startRecording: () => void;
  downloadMp4: () => void;
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
  ({ points, aspectRatio, duration, title, description }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ffmpegRef = useRef(new FFmpeg());

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

        if (title) headerHeight += 140;
        if (description) headerHeight += 110;

        // Bigger spacing between header and chart
        const gapBelowHeader = 120;

        // Bigger bottom safety so labels never cut
        const bottomPadding = 300;

        // Bigger side spacing
        const sidePadding = 240;

        const chartTop = headerHeight + gapBelowHeader;
        const chartBottom = height - bottomPadding;

        const chartLeft = sidePadding;
        const chartRight = width - sidePadding;

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
            ctx.font = "28px Inter";
            ctx.textAlign = "center";

            const padding = 20;
            const lineHeight = 36;

            const boxWidth =
              Math.max(...lines.map((l) => ctx.measureText(l).width)) +
              padding * 2;

            const boxHeight = lines.length * lineHeight + padding * 2;

            ctx.fillStyle = bg;
            ctx.fillRect(x - boxWidth / 2, y, boxWidth, boxHeight);

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
            // TITLE + DESCRIPTION
            // -------------------------

            let headerCursor = 120;

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

            let lastX = -Infinity;

            calculatedPoints.forEach((p, index) => {
              let labelY = p.y + 40;

              if (Math.abs(p.x - lastX) < 140) {
                labelY += 70;
              }

              lastX = p.x;

              if (index === 0) {
                drawLabelBox(
                  p.x,
                  labelY,
                  ["START", `${p.value} (${p.time})`],
                  "#d1fae5",
                );
              } else if (index === calculatedPoints.length - 1) {
                drawLabelBox(
                  p.x,
                  labelY,
                  ["FINAL DESTINATION", `${p.value} (${p.time})`],
                  "#fee2e2",
                );
              } else {
                drawLabelBox(
                  p.x,
                  labelY,
                  [`${p.value} (${p.time})`],
                  "#f3f4f6",
                );
              }
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

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              recorder.stop();
            }
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
      startRecording() {
        const toastId = toast.loading("Recording animation");

        recordAnimation(true)
          .then(() => {
            toast.success("WebM Downloaded", {
              id: toastId,
            });
          })
          .catch(() => {
            toast.error("Recording Failed", {
              id: toastId,
            });
          });
      },

      async downloadMp4() {
        const toastId = toast.loading("Recording animation");

        try {
          const webmBlob = await recordAnimation(false);

          toast.loading("Preparing video engine...", { id: toastId });

          const ffmpeg = ffmpegRef.current;

          if (!ffmpeg.loaded) {
            await ffmpeg.load();
          }

          toast.loading("Converting to MP4...", { id: toastId });

          await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

          await ffmpeg.exec([
            "-i",
            "input.webm",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "output.mp4",
          ]);

          const data = await ffmpeg.readFile("output.mp4");

          if (typeof data === "string") throw new Error("Unexpected string");

          const buffer = new Uint8Array(data).slice().buffer;

          const mp4Blob = new Blob([buffer], {
            type: "video/mp4",
          });

          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = generateFileName("mp4");
          a.click();

          toast.success("MP4 Downloaded Successfully", {
            id: toastId,
          });
        } catch (error) {
          toast.error("MP4 Conversion Failed", {
            id: toastId,
          });
        }
      },
    }));

    useEffect(() => {
      recordAnimation(false);
    }, [points, aspectRatio, duration]);

    return (
      <canvas
        ref={canvasRef}
        className="w-full max-w-4xl border border-zinc-200 rounded-md"
      />
    );
  },
);

export default ReusableCanvas;
