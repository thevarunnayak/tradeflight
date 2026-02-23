"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
  sizeRatio: number;
  opacity: number;
  margin: number;
};

type Props = {
  durationInput: string;
  setDurationInput: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  labelFontSize: number;
  setLabelFontSize: (v: number) => void;
  labelFontWeight: string;
  setLabelFontWeight: (v: string) => void;
  watermark: WatermarkConfig;
  setWatermark: (v: WatermarkConfig) => void;
  t: any;
};

export default function SettingsSection({
  durationInput,
  setDurationInput,
  aspectRatio,
  setAspectRatio,
  labelFontSize,
  setLabelFontSize,
  labelFontWeight,
  setLabelFontWeight,
  watermark,
  setWatermark,
  t,
}: Props) {
  return (
    <div className="space-y-8">
      {/* ================= Animation & Label Controls ================= */}
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
            <div className="flex-1">
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
                <span className="font-medium">{t("form.labelFontNormal")}</span>
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

      {/* ================= WATERMARK CONTROLS ================= */}
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
            {/* CONTROLS ROW */}
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
                      position: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">{t("form.topLeft")}</SelectItem>
                    <SelectItem value="top-center">{t("form.topCenter")}</SelectItem>
                    <SelectItem value="top-right">{t("form.topRight")}</SelectItem>
                    <SelectItem value="bottom-left">{t("form.bottomLeft")}</SelectItem>
                    <SelectItem value="bottom-center">{t("form.bottomCenter")}</SelectItem>
                    <SelectItem value="bottom-right">{t("form.bottomRight")}</SelectItem>
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
                          Math.max(0.05, Number(e.target.value))
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
                          Math.max(0.1, Number(e.target.value))
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
                        setWatermark({ ...watermark, imageUrl: "" })
                      }
                    >
                      {t("form.remove")}
                    </Button>
                  </div>
                )}

                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (!e.target.files?.[0]) return;
                    const reader = new FileReader();
                    reader.onload = () =>
                      setWatermark({
                        ...watermark,
                        imageUrl: reader.result as string,
                      });
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
    </div>
  );
}