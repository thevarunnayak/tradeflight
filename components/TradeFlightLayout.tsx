"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ReusableCanvas, { ReusableCanvasHandle } from "./ReusableCanvas";
import LoadPresetLayout from "./LoadPresetLayout";

type Point = {
  value: number;
  time: string;
};

type Preset = {
  id: string;
  name: string;
  data: any;
};

/* ---------------- Helpers ---------------- */

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
  const [audioFile, setAudioFile] = useState<File | null>(null);

  /* ---------------- PRESETS ---------------- */

  const [presets, setPresets] = useState<Preset[]>([]);
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tradeflight-presets");
    if (stored) setPresets(JSON.parse(stored));
  }, []);

  /* ---------------- SAVE LOGIC ---------------- */

  const nameExists = (name: string) =>
    presets.some((p) => p.name.toLowerCase() === name.toLowerCase());

  const handleSaveAsNew = () => {
    if (!presetName.trim()) {
      setNameError("Preset name is required");
      return;
    }

    if (nameExists(presetName)) {
      setNameError("Preset name already exists");
      return;
    }

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName,
      data: {
        title,
        description,
        points,
        durationInput,
        aspectRatio,
      },
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    toast.success("Preset saved successfully 🎉");

    setActivePresetId(newPreset.id);
    setNameError(null);
    setIsSaveDialogOpen(false);
  };

  const handleUpdatePreset = () => {
    if (!activePresetId) return;

    if (!presetName.trim()) {
      setNameError("Preset name is required");
      return;
    }

    const duplicate = presets.some(
      (p) =>
        p.name.toLowerCase() === presetName.toLowerCase() &&
        p.id !== activePresetId,
    );

    if (duplicate) {
      setNameError("Another preset already has this name");
      return;
    }

    const updated = presets.map((p) =>
      p.id === activePresetId
        ? {
            ...p,
            name: presetName,
            data: {
              title,
              description,
              points,
              durationInput,
              aspectRatio,
            },
          }
        : p,
    );

    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    toast.success("Preset updated successfully ✅");

    setNameError(null);
    setIsSaveDialogOpen(false);
  };

  const loadPreset = (preset: Preset) => {
    setTitle(preset.data.title);
    setDescription(preset.data.description);
    setPoints(preset.data.points);
    setDurationInput(preset.data.durationInput);
    setAspectRatio(preset.data.aspectRatio);

    setActivePresetId(preset.id);
    setPresetName(preset.name);

    toast.success("Preset loaded 🚀");
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    if (id === activePresetId) {
      setActivePresetId(null);
      setPresetName("");
    }

    toast.success("Preset deleted");
  };

  /* ---------------- VALIDATION ---------------- */

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
            "Each time must be strictly later than the previous one.",
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
    value: string,
  ) => {
    const updated = [...points];

    if (field === "value") updated[index].value = Number(value);

    if (field === "time") {
      updated[index].time = value;
      if (index === 0 && updated[1]) {
        updated[1].time = addFiveMinutes(value);
      }
    }

    validateTimes(updated);
    setPoints(updated);
  };

  const moveValue = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= points.length) return;

    const updated = [...points];

    // Swap ONLY values (not time)
    const temp = updated[index].value;
    updated[index].value = updated[newIndex].value;
    updated[newIndex].value = temp;

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
      toast.error("Duration must be greater than 0");
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
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Trade Flight Controls</h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPresetOpen(true)}
          >
            Load Preset
          </Button>
        </div>

        {/* FORM (UNCHANGED FROM YOUR ORIGINAL) */}

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

        {/* Points */}
        <div className="space-y-4">
          <Label>Points</Label>
          {points.map((point, index) => {
            const isInvalid =
              index > 0 &&
              timeToMinutes(point.time) <=
                timeToMinutes(points[index - 1].time);

            return (
              <div key={index} className="space-y-4">
                <div className="grid gap-4 items-center grid-cols-1 md:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_120px]">
                  <div className="flex items-center gap-4 justify-start">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => moveValue(index, "up")}
                        disabled={index === 0}
                        className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded-full border border-zinc-300 hover:border-zinc-700 p-1"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveValue(index, "down")}
                        disabled={index === points.length - 1}
                        className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 rounded-full border border-zinc-300 hover:border-zinc-700 p-1"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-sm text-zinc-500">
                      Point {index + 1}
                    </span>
                  </div>

                  <Input
                    type="text"
                    inputMode="decimal"
                    value={point.value === 0 ? "" : point.value}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        updatePoint(index, "value", "0");
                        return;
                      }
                      if (/^\d*\.?\d*$/.test(raw)) {
                        updatePoint(index, "value", raw);
                      }
                    }}
                  />

                  <Input
                    type="time"
                    value={point.time}
                    onChange={(e) => updatePoint(index, "time", e.target.value)}
                    className={`min-w-0 w-full appearance-none ${
                      isInvalid
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
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

                {/* Separator */}
                {index !== points.length - 1 && (
                  <div className="border-b border-zinc-200" />
                )}
              </div>
            );
          })}

          {timeError && <p className="text-sm text-red-500">{timeError}</p>}

          <Button
            variant="secondary"
            onClick={addPoint}
            disabled={!!timeError}
            className="w-full"
          >
            + Add Point
          </Button>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label>Duration (seconds)</Label>
          <Input
            type="number"
            value={durationInput}
            min={1}
            onChange={(e) => setDurationInput(e.target.value)}
          />
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label>Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="9:16">9:16</SelectItem>
              <SelectItem value="4:5">4:5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate + Save */}
        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            className="flex-1"
            onClick={handleGenerate}
            disabled={!!timeError}
          >
            Generate Animation
          </Button>

          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setIsSaveDialogOpen(true)}
          >
            Save Preset
          </Button>
        </div>
      </Card>

      {/* SAVE DIALOG WITH UPDATE + SAVE AS NEW */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => {
              setPresetName(e.target.value);
              setNameError(null);
            }}
            className={nameError ? "border-red-500" : ""}
          />

          {nameError && <p className="text-sm text-red-500">{nameError}</p>}

          <DialogFooter className="flex gap-2">
            {activePresetId ? (
              <>
                <Button onClick={handleUpdatePreset}>Update</Button>
                <Button variant="secondary" onClick={handleSaveAsNew}>
                  Save As New
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveAsNew}>Save</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* LOAD PRESET DIALOG */}
      <Dialog open={isPresetOpen} onOpenChange={setIsPresetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saved Presets</DialogTitle>
          </DialogHeader>

          <LoadPresetLayout
            presets={presets}
            onLoad={(preset) => {
              loadPreset(preset);
              setIsPresetOpen(false);
            }}
            onDelete={deletePreset}
          />
        </DialogContent>
      </Dialog>

      {/* PREVIEW (UNCHANGED) */}
      <Card className="p-6 md:p-8 bg-white border border-zinc-200 shadow-sm flex flex-col items-center">
        {generatedConfig ? (
          <>
            <ReusableCanvas
              ref={canvasRef}
              {...generatedConfig}
              audioFile={audioFile}
            />
            <div className="mt-6 w-full max-w-md space-y-3">
              <Label>Add Background Audio (optional)</Label>

              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAudioFile(e.target.files[0]);
                    toast.success("Audio added");
                  }
                }}
              />

              {audioFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAudioFile(null);
                    toast("Audio removed");
                  }}
                >
                  Remove Audio
                </Button>
              )}
            </div>

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
