"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowDown, ArrowUp, HelpCircle, Trash2 } from "lucide-react";
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
import Image from "next/image";
import { Slider } from "./ui/slider";
import { driver } from "driver.js";
import { useTranslation } from "@/app/i18n/languageProvider";

type WatermarkConfig = {
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
  sizeRatio: number; // relative to canvas width (0.05 - 0.2)
  opacity: number; // 0 - 1
  margin: number; // px
};

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

  /* ---------------- WATERMARK STATE ---------------- */
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    type: "image",
    imageUrl: "",
    text: "",
    position: "bottom-right",
    sizeRatio: 0.12,
    opacity: 0.8,
    margin: 60,
  });

  /* ---------------- LABEL SETTINGS STATE ---------------- */
  const [labelFontSize, setLabelFontSize] = useState(24); // default 24px
  const [labelFontWeight, setLabelFontWeight] = useState("700"); // bold

  /* ---------------- SAVE LOGIC ---------------- */

  const nameExists = (name: string) =>
    presets.some((p) => p.name.toLowerCase() === name.toLowerCase());

  const handleSaveAsNew = () => {
    if (!presetName.trim()) {
      setNameError(t("error.presetNameRequired"));
      return;
    }

    if (nameExists(presetName)) {
      setNameError(t("error.presetExists"));
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
        watermark,
        labelFontSize,
        labelFontWeight,
      },
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    toast.success(t("toast.presetSaved"));

    setActivePresetId(newPreset.id);
    setNameError(null);
    setIsSaveDialogOpen(false);
  };

  const handleUpdatePreset = () => {
    if (!activePresetId) return;

    if (!presetName.trim()) {
      setNameError(t("error.presetNameRequired"));
      return;
    }

    const duplicate = presets.some(
      (p) =>
        p.name.toLowerCase() === presetName.toLowerCase() &&
        p.id !== activePresetId,
    );

    if (duplicate) {
      setNameError(t("error.presetDuplicate"));
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
              watermark,
              labelFontSize,
              labelFontWeight,
            },
          }
        : p,
    );

    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    toast.success(t("toast.presetUpdated"));

    setNameError(null);
    setIsSaveDialogOpen(false);
  };

  const loadPreset = (preset: Preset) => {
    setTitle(preset.data.title);
    setDescription(preset.data.description);
    setPoints(preset.data.points);
    setDurationInput(preset.data.durationInput);
    setAspectRatio(preset.data.aspectRatio);
    setWatermark(preset.data.watermark || watermark);

    setActivePresetId(preset.id);
    setPresetName(preset.name);
    setLabelFontSize(preset.data.labelFontSize || 24);
    setLabelFontWeight(preset.data.labelFontWeight || "700");

    toast.success(t("toast.presetLoaded"));
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    localStorage.setItem("tradeflight-presets", JSON.stringify(updated));

    if (id === activePresetId) {
      setActivePresetId(null);
      setPresetName("");
    }

    toast.success(t("toast.presetDeleted"));
  };

  /* ---------------- VALIDATION ---------------- */

  const validateTimes = (updatedPoints: Point[]) => {
    for (let i = 0; i < updatedPoints.length; i++) {
      if (!updatedPoints[i].time) {
        setTimeError(t("error.timeMissing"));
        return false;
      }

      if (i > 0) {
        const prev = timeToMinutes(updatedPoints[i - 1].time);
        const current = timeToMinutes(updatedPoints[i].time);

        if (current <= prev) {
          setTimeError(t("error.timeOrder"));
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
      toast.error(t("toast.durationInvalid"));
      return;
    }

    setGeneratedConfig({
      points: [...points],
      aspectRatio,
      duration: parsedDuration,
      title: title || undefined,
      description: description || undefined,
      watermark,
      labelFontSize,
      labelFontWeight,
    });
  };
  //translations
  const { lang, setLang, t } = useTranslation();

  // helper driver js

  const startTour = (t: any) => {
    lockScroll(); // 🔒 block scroll immediately

    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),

      onDestroyed: () => {
        unlockScroll(); // 🔓 always restore scroll
      },

      steps: [
        {
          element: ".tour-title",
          popover: {
            title: t("tour.title"),
            description: t("tour.titleDesc"),
          },
        },
        {
          element: ".tour-description",
          popover: {
            title: t("tour.description"),
            description: t("tour.descriptionDesc"),
          },
        },
        {
          element: ".tour-points",
          popover: {
            title: t("tour.points"),
            description: t("tour.pointsDesc"),
          },
        },
        {
          element: ".tour-animation",
          popover: {
            title: t("tour.animation"),
            description: t("tour.animationDesc"),
          },
        },
        {
          element: ".tour-watermark",
          popover: {
            title: t("tour.watermark"),
            description: t("tour.watermarkDesc"),
          },
        },
        {
          element: ".tour-generate",
          popover: {
            title: t("tour.generate"),
            description: t("tour.generateDesc"),
          },
        },
        {
          element: ".tour-download",
          popover: {
            title: t("tour.download"),
            description: t("tour.downloadDesc"),
          },
        },
      ],
    });

    driverObj.drive();
  };
  const lockScroll = () => {
    document.body.style.overflow = "hidden";
  };

  const unlockScroll = () => {
    document.body.style.overflow = "";
  };
  useEffect(() => {
    const seen = localStorage.getItem("tradeflight-tour-seen");
    if (!seen) {
      setTimeout(() => {
        startTour(t);
        localStorage.setItem("tradeflight-tour-seen", "true");
      }, 800);
    }
  }, [t]);

  return (
    <div className="space-y-8 p-5 md:p-8">
      <Card className="p-6 space-y-6 bg-white border border-zinc-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title */}
          <h2 className="text-xl font-semibold whitespace-nowrap">
            {t("controls.title")}
          </h2>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2 md:justify-end md:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setIsPresetOpen(true)}
            >
              {t("controls.loadPreset")}
            </Button>

            <Select value={lang} onValueChange={(v) => setLang(v as any)}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => startTour(t)}
            >
              <HelpCircle className="w-4 h-4 text-zinc-600" />
            </Button>
          </div>
        </div>

        {/* FORM (UNCHANGED FROM YOUR ORIGINAL) */}

        <div className="space-y-2 tour-title">
          <Label className="text-base font-semibold text-zinc-800">
            {t("form.title")}
          </Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2 tour-description">
          <Label className="text-base font-semibold text-zinc-800">
            {t("form.description")}
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Points */}
        <div className="space-y-4 tour-points">
          <Label className="text-base font-semibold text-zinc-800">
            {t("form.points")}
          </Label>
          {points.map((point, index) => {
            const isInvalid =
              index > 0 &&
              timeToMinutes(point.time) <=
                timeToMinutes(points[index - 1].time);

            return (
              <div key={index} className="space-y-4">
                <div className="grid gap-4 items-center grid-cols-1 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_120px]">
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
                      {t("form.point")} {index + 1}
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
                      {t("form.delete")}
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
            + {t("form.addPoint")}
          </Button>
        </div>

        {/* =============================== */}
        {/* Animation & Label Controls */}
        {/* =============================== */}

        <div className="flex flex-col gap-6 md:flex-row md:flex-wrap md:justify-between md:items-end tour-animation">
          {/* Duration */}
          <div className="flex flex-col gap-2 md:w-40">
            <Label className="text-base font-semibold text-zinc-800">
              {t("form.duration")}
            </Label>
            <Input
              type="number"
              value={durationInput}
              min={1}
              onChange={(e) => setDurationInput(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Aspect Ratio */}
          <div className="flex flex-col gap-2 md:w-40">
            <Label className="text-base font-semibold text-zinc-800">
              {t("form.aspectRatio")}
            </Label>
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

          {/* Font Size */}
          <div className="flex flex-col gap-3 md:w-64">
            <Label className="text-base font-semibold text-zinc-800">
              {t("form.labelSize")}
            </Label>

            <div className="flex items-center gap-3">
              <div className="w-40">
                <Slider
                  min={8}
                  max={64}
                  step={1}
                  value={[labelFontSize]}
                  onValueChange={(value) => setLabelFontSize(value[0])}
                />
              </div>

              <Input
                type="number"
                min={8}
                max={64}
                value={labelFontSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) {
                    const clamped = Math.min(64, Math.max(8, val));
                    setLabelFontSize(clamped);
                  }
                }}
                className="w-20"
              />
            </div>
          </div>

          {/* Font Weight */}
          <div className="flex flex-col gap-2 md:w-48">
            <Label className="text-base font-semibold text-zinc-800">
              {t("form.labelWeight")}
            </Label>

            <Select value={labelFontWeight} onValueChange={setLabelFontWeight}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">
                  <span className="font-thin">{t("form.labelFontThin")}</span>
                </SelectItem>
                <SelectItem value="300">
                  <span className="font-light">{t("form.labelFontLight")}</span>
                </SelectItem>
                <SelectItem value="500">
                  <span className="font-medium">
                    {t("form.labelFontNormal")}
                  </span>
                </SelectItem>
                <SelectItem value="700">
                  <span className="font-bold">{t("form.labelFontBold")}</span>
                </SelectItem>
                <SelectItem value="900">
                  <span className="font-black">{t("form.labelFontThick")}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* WATERMARK CONTROLS */}
        <div className="space-y-4 tour-watermark">
          <Label className="text-base font-semibold text-zinc-800">
            {t("watermark.title")}
          </Label>

          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={watermark.enabled}
              onChange={(e) =>
                setWatermark({ ...watermark, enabled: e.target.checked })
              }
            />
            <span className="text-sm">{t("watermark.enable")}</span>
          </div>

          {watermark.enabled && (
            <>
              {/* WATERMARK CONTROLS ROW */}
              <div className="flex flex-col gap-6 md:flex-row md:flex-wrap md:justify-between md:items-end">
                {/* Type */}
                <div className="flex flex-col gap-2 md:w-48">
                  <Label className="text-base font-semibold text-zinc-800">
                    {t("watermark.type")}
                  </Label>
                  <Select
                    value={watermark.type}
                    onValueChange={(value) =>
                      setWatermark({
                        ...watermark,
                        type: value as "image" | "text",
                        imageUrl: value === "image" ? watermark.imageUrl : "",
                        text: value === "text" ? watermark.text : "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">{t("form.image")}</SelectItem>
                      <SelectItem value="text">{t("form.text")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Position */}
                <div className="flex flex-col gap-2 md:w-56">
                  <Label className="text-base font-semibold text-zinc-800">
                    {t("watermark.position")}
                  </Label>
                  <Select
                    value={watermark.position}
                    onValueChange={(value) =>
                      setWatermark({
                        ...watermark,
                        position: value as
                          | "top-left"
                          | "top-center"
                          | "top-right"
                          | "bottom-left"
                          | "bottom-center"
                          | "bottom-right",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">
                        {t("form.topLeft")}
                      </SelectItem>
                      <SelectItem value="top-center">
                        {t("form.topCenter")}
                      </SelectItem>
                      <SelectItem value="top-right">
                        {t("form.topRight")}
                      </SelectItem>
                      <SelectItem value="bottom-left">
                        {t("form.bottomLeft")}
                      </SelectItem>
                      <SelectItem value="bottom-center">
                        {t("form.bottomCenter")}
                      </SelectItem>
                      <SelectItem value="bottom-right">
                        {t("form.bottomRight")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Size */}
                <div className="flex flex-col gap-3 md:w-64">
                  <Label className="text-base font-semibold text-zinc-800">
                    {t("watermark.size")}
                  </Label>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Slider
                        min={0.05}
                        max={1}
                        step={0.01}
                        value={[watermark.sizeRatio]}
                        onValueChange={(value) =>
                          setWatermark({ ...watermark, sizeRatio: value[0] })
                        }
                      />
                    </div>

                    <Input
                      type="number"
                      step="0.01"
                      min={0.05}
                      max={1}
                      value={watermark.sizeRatio}
                      onChange={(e) =>
                        setWatermark({
                          ...watermark,
                          sizeRatio: Math.min(
                            1,
                            Math.max(0.05, Number(e.target.value)),
                          ),
                        })
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Opacity */}
                <div className="flex flex-col gap-3 md:w-64">
                  <Label className="text-base font-semibold text-zinc-800">
                    {t("watermark.opacity")}
                  </Label>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Slider
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={[watermark.opacity]}
                        onValueChange={(value) =>
                          setWatermark({ ...watermark, opacity: value[0] })
                        }
                      />
                    </div>

                    <Input
                      type="number"
                      step="0.05"
                      min={0.1}
                      max={1}
                      value={watermark.opacity}
                      onChange={(e) =>
                        setWatermark({
                          ...watermark,
                          opacity: Math.min(
                            1,
                            Math.max(0.1, Number(e.target.value)),
                          ),
                        })
                      }
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* IMAGE Upload */}
              {watermark.type === "image" && (
                <div className="space-y-3">
                  {/* Preview if image exists */}
                  {watermark.imageUrl && (
                    <div className="flex items-center gap-4">
                      <Image
                        src={watermark.imageUrl}
                        alt={t("watermark.imagePreview")}
                        width={120}
                        height={40}
                        unoptimized
                        className="h-10 w-auto object-contain border rounded px-2 py-1 bg-white"
                      />

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWatermark({
                            ...watermark,
                            imageUrl: "",
                          })
                        }
                      >
                        {t("form.remove")}
                      </Button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (!e.target.files?.[0]) return;

                      const reader = new FileReader();
                      reader.onload = () => {
                        setWatermark({
                          ...watermark,
                          imageUrl: reader.result as string,
                        });
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }}
                  />
                </div>
              )}

              {/* TEXT Input */}
              {watermark.type === "text" && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-zinc-800">
                    {t("form.watermarkText")}
                  </Label>
                  <Input
                    placeholder={t("form.watermarkPlaceholder")}
                    maxLength={30}
                    value={watermark.text || ""}
                    onChange={(e) =>
                      setWatermark({
                        ...watermark,
                        text: e.target.value.slice(0, 30),
                      })
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Generate + Save */}
        <div className="flex flex-col gap-3 md:flex-row">
          <Button
            className="flex-1 tour-generate"
            onClick={handleGenerate}
            disabled={!!timeError}
          >
            {t("controls.generate")}
          </Button>

          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setIsSaveDialogOpen(true)}
          >
            {t("controls.savePreset")}
          </Button>
        </div>
      </Card>

      {/* SAVE DIALOG WITH UPDATE + SAVE AS NEW */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.savePreset")}</DialogTitle>
          </DialogHeader>

          <Input
            placeholder={t("dialog.presetName")}
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
                <Button onClick={handleUpdatePreset}>
                  {t("dialog.update")}
                </Button>
                <Button variant="secondary" onClick={handleSaveAsNew}>
                  {t("dialog.saveAsNew")}
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveAsNew}>{t("dialog.save")}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* LOAD PRESET DIALOG */}
      <Dialog open={isPresetOpen} onOpenChange={setIsPresetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("preset.saved")}</DialogTitle>
          </DialogHeader>

          <LoadPresetLayout
            presets={presets}
            onLoad={(preset) => {
              loadPreset(preset);
              setIsPresetOpen(false);
            }}
            onDelete={deletePreset}
            t={t}
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
              t={t}
            />
            <div className="mt-6 w-full max-w-md space-y-3">
              <Label className="text-base font-semibold text-zinc-800">
                {t("form.addAudio")}
              </Label>

              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAudioFile(e.target.files[0]);
                    toast.success(t("toast.audioAdded"));
                  }
                }}
              />

              {audioFile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAudioFile(null);
                    toast(t("toast.audioRemoved"));
                  }}
                >
                  {t("form.removeAudio")}
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-4 mt-6 w-full max-w-md md:flex-row tour-download">
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
                {isRecording ? t("download.recording") : t("download.webm")}
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
                {isConverting ? t("download.converting") : t("download.mp4")}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-zinc-400">{t("preview.clickGenerate")}</div>
        )}
      </Card>
    </div>
  );
}
