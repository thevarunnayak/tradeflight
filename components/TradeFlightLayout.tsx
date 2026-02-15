"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ReusableCanvas, {
  ReusableCanvasHandle,
} from "./ReusableCanvas";

type Point = {
  value: number;
  time: string;
};

/* ----------------------------
   Helpers
----------------------------- */

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const addFiveMinutes = (time: string) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h);
  date.setMinutes(m + 5);

  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export default function TradeFlightLayout() {
  const canvasRef = useRef<ReusableCanvasHandle>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeError, setTimeError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [points, setPoints] = useState<Point[]>([
    { value: 10, time: "09:00" },
    { value: 10, time: "09:05" },
  ]);

  const [durationInput, setDurationInput] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [generatedConfig, setGeneratedConfig] = useState<any>(null);

  /* ----------------------------
     Validate Times
  ----------------------------- */
  const validateTimes = (updatedPoints: Point[]) => {
    for (let i = 0; i < updatedPoints.length; i++) {
      if (!updatedPoints[i].time) {
        setTimeError("All points must have a time.");
        return false;
      }

      if (i > 0) {
        const prev = timeToMinutes(updatedPoints[i - 1].time);
        const current = timeToMinutes(updatedPoints[i].time);

        if (current <= prev) {
          setTimeError(
            "Each time must be strictly later than the previous one."
          );
          return false;
        }
      }
    }

    setTimeError(null);
    return true;
  };

  const updatePoint = (
    index: number,
    field: "value" | "time",
    value: string
  ) => {
    const updated = [...points];

    if (field === "value") {
      updated[index].value = Number(value);
    }

    if (field === "time") {
      updated[index].time = value;

      if (index === 0 && updated[1]) {
        updated[1].time = addFiveMinutes(value);
      }
    }

    validateTimes(updated);
    setPoints(updated);
  };

  const addPoint = () => {
    if (timeError) return;

    const last = points[points.length - 1];

    const newPoint: Point = {
      value: last.value,
      time: addFiveMinutes(last.time),
    };

    const updated = [...points, newPoint];
    validateTimes(updated);
    setPoints(updated);
  };

  const deletePoint = (index: number) => {
    if (index < 2) return;
    const updated = points.filter((_, i) => i !== index);
    validateTimes(updated);
    setPoints(updated);
  };

  const handleGenerate = () => {
    if (timeError) return;

    const parsedDuration = Number(durationInput);
    if (!parsedDuration || parsedDuration <= 0) {
      alert("Duration must be greater than 0");
      return;
    }

    setGeneratedConfig({
      points: [...points],
      aspectRatio,
      duration: parsedDuration,
      title: title || undefined,
      description: description || undefined,
    });
  };

  return (
    <div className="space-y-8 p-6 md:p-8">
      <Card className="p-6 space-y-6 bg-white border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-semibold">Trade Flight Controls</h2>

        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label>Points</Label>

          {points.map((point, index) => {
            const isInvalid =
              index > 0 &&
              timeToMinutes(point.time) <=
                timeToMinutes(points[index - 1].time);

            return (
              <div
                key={index}
                className="grid gap-3 items-center grid-cols-1 md:grid-cols-[60px_1fr_1fr_120px]"
              >
                <span className="text-sm text-zinc-500 md:text-center">
                  Point {index + 1}
                </span>

                {/* <Input
                  type="number"
                  value={point.value}
                  onChange={(e) =>
                    updatePoint(index, "value", e.target.value)
                  }
                /> */}
                <Input
  type="text"
  inputMode="decimal"
  value={point.value === 0 ? "" : point.value}
  onChange={(e) => {
    const raw = e.target.value;

    // Allow empty input (temporarily)
    if (raw === "") {
      updatePoint(index, "value", "0");
      return;
    }

    // Allow only valid decimal numbers
    if (/^\d*\.?\d*$/.test(raw)) {
      updatePoint(index, "value", raw);
    }
  }}
/>


                <Input
                  type="time"
                  value={point.time}
                  onChange={(e) =>
                    updatePoint(index, "time", e.target.value)
                  }
                  className={
                    isInvalid
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />

                {index >= 2 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePoint(index)}
                    className="flex items-center gap-2 w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                )}
              </div>
            );
          })}

          {timeError && (
            <p className="text-sm text-red-500">{timeError}</p>
          )}

          <Button
            variant="secondary"
            onClick={addPoint}
            disabled={!!timeError}
            className="w-full"
          >
            + Add Point
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            value={durationInput}
            min={1}
            onChange={(e) => setDurationInput(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
              <SelectItem value="1:1">1:1 (Square)</SelectItem>
              <SelectItem value="9:16">9:16 (Reels)</SelectItem>
              <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerate} disabled={!!timeError}>
          Generate Animation
        </Button>
      </Card>

      <Card className="p-6 md:p-8 bg-white border border-zinc-200 shadow-sm flex flex-col items-center">
        {generatedConfig ? (
          <>
            <ReusableCanvas ref={canvasRef} {...generatedConfig} />

            <div className="flex flex-col gap-4 mt-6 w-full max-w-md md:flex-row">
              <Button
                className="flex-1"
                disabled={isRecording || isConverting}
                onClick={async () => {
                  if (!canvasRef.current) return;
                  setIsRecording(true);
                  try {
                    await canvasRef.current.startRecording();
                  } finally {
                    setIsRecording(false);
                  }
                }}
              >
                {isRecording ? "Recording..." : "Download WebM"}
              </Button>

              <Button
                variant="secondary"
                className="flex-1"
                disabled={isRecording || isConverting}
                onClick={async () => {
                  if (!canvasRef.current) return;
                  setIsConverting(true);
                  try {
                    await canvasRef.current.downloadMp4();
                  } finally {
                    setIsConverting(false);
                  }
                }}
              >
                {isConverting ? "Converting..." : "Download MP4"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-zinc-400">
            Click Generate to preview animation
          </div>
        )}
      </Card>
    </div>
  );
}
