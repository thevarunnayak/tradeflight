"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Point = {
  value: number;
  time: string;
};

type Props = {
  points: Point[];
  updatePoint: (index: number, field: "value" | "time", value: string) => void;
  moveValue: (index: number, direction: "up" | "down") => void;
  deletePoint: (index: number) => void;
  addPoint: () => void;
  timeError: string | null;
  t: any;
};

export default function PointsSection({
  points,
  updatePoint,
  moveValue,
  deletePoint,
  addPoint,
  timeError,
  t,
}: Props) {
  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  return (
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
              {/* move buttons */}
              <div className="flex items-center gap-4">
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
                onChange={(e) => updatePoint(index, "value", e.target.value)}
              />

              <Input
                type="time"
                value={point.time}
                onChange={(e) => updatePoint(index, "time", e.target.value)}
                className={isInvalid ? "border-red-500" : ""}
              />

              {index >= 2 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deletePoint(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

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
  );
}