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
import ImportPointsDialog from "./ImportPointsDialog";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import InfoSection from "./InfoSection";
import PointsSection from "./PointsSection";
import SettingsSection from "./SettingsSection";

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
    <div className="space-y-2 p-5 md:p-8">
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

        <div className="w-full flex justify-end">
            <ImportPointsDialog
    onApply={(newPoints) => {
      validateTimes(newPoints);
      setPoints(newPoints);
    }}
  />
        </div>

        {/* FORM (UNCHANGED FROM YOUR ORIGINAL) */}
        <div className="py-4">

<Accordion
  type="multiple"
  defaultValue={["info", "points", "settings"]}
  className="w-full space-y-4 overflow-hidden"
>
  {/* ================= INFO ================= */}
  <AccordionItem
    value="info"
    className="rounded-xl border border-zinc-200 bg-zinc-50 px-5"
  >
    <AccordionTrigger className="text-base font-semibold">
      {t("form.infoSection")}
    </AccordionTrigger>

    <AccordionContent className="pt-4 pb-6">
      <InfoSection
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        t={t}
      />
    </AccordionContent>
  </AccordionItem>

  {/* ================= POINTS ================= */}
  <AccordionItem
    value="points"
    className="rounded-xl border border-zinc-200 bg-zinc-50 px-5"
  >
    <AccordionTrigger className="text-base font-semibold">
      {t("form.pointsSection")}
    </AccordionTrigger>

    <AccordionContent className="pt-4 pb-6">
      <PointsSection
        points={points}
        updatePoint={updatePoint}
        moveValue={moveValue}
        deletePoint={deletePoint}
        addPoint={addPoint}
        timeError={timeError}
        t={t}
      />
    </AccordionContent>
  </AccordionItem>

  {/* ================= SETTINGS ================= */}
  <AccordionItem
    value="settings"
    className="rounded-xl border border-zinc-200 bg-zinc-50 px-5"
  >
    <AccordionTrigger className="text-base font-semibold">
      {t("form.settingsSection")}
    </AccordionTrigger>

    <AccordionContent className="pt-4 pb-6">
      <SettingsSection
        durationInput={durationInput}
        setDurationInput={setDurationInput}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        labelFontSize={labelFontSize}
        setLabelFontSize={setLabelFontSize}
        labelFontWeight={labelFontWeight}
        setLabelFontWeight={setLabelFontWeight}
        watermark={watermark}
        setWatermark={setWatermark}
        t={t}
      />
    </AccordionContent>
  </AccordionItem>
</Accordion>
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
