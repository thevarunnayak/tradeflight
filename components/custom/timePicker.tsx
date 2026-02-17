"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TimePickerProps {
  value: string; // expects "HH:MM" (24h)
  onChange: (value: string) => void;
  label?: string;
  stepMinutes?: number; // default 5
}

export default function TimePicker({
  value,
  onChange,
  label,
  stepMinutes = 5,
}: TimePickerProps) {
  /* -----------------------------
     Utilities
  ----------------------------- */

  const pad = (num: number) => num.toString().padStart(2, "0");

  const wrapHour = (num: number) => {
    if (num > 12) return 1;
    if (num < 1) return 12;
    return num;
  };

  const wrapMinute = (num: number) => {
    if (num >= 60) return 0;
    if (num < 0) return 60 - stepMinutes;
    return num;
  };

  const roundToStep = (num: number) => {
    return Math.round(num / stepMinutes) * stepMinutes;
  };

  const convert24To12 = (val: string) => {
    if (!val) return { hour: 9, minute: 0, period: "AM" };

    const [h, m] = val.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;

    return {
      hour: hour12,
      minute: m,
      period,
    };
  };

  const convert12To24 = (h: number, m: number, p: string) => {
    let hour = h;
    if (p === "PM" && hour !== 12) hour += 12;
    if (p === "AM" && hour === 12) hour = 0;
    return `${pad(hour)}:${pad(m)}`;
  };

  /* -----------------------------
     State
  ----------------------------- */

  const initial = convert24To12(value);

  const [hour, setHour] = useState<number>(initial.hour);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(
    initial.period as "AM" | "PM",
  );

  /* -----------------------------
     Sync when parent value changes
  ----------------------------- */

  useEffect(() => {
    const parsed = convert24To12(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period as "AM" | "PM");
  }, [value]);

  /* -----------------------------
     Emit value to parent
  ----------------------------- */

  useEffect(() => {
    const formatted = convert12To24(hour, minute, period);
    onChange(formatted);
  }, [hour, minute, period]);

  /* -----------------------------
     Handlers
  ----------------------------- */

  const handleHourChange = (val: string) => {
    const num = Number(val.replace(/\D/g, ""));
    if (!num) return;
    setHour(wrapHour(num));
  };

  const handleMinuteChange = (val: string) => {
    const num = Number(val.replace(/\D/g, ""));
    if (isNaN(num)) return;

    const stepped = roundToStep(num);
    setMinute(wrapMinute(stepped));
  };

  const handleHourKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHour((prev) => wrapHour(prev + 1));
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHour((prev) => wrapHour(prev - 1));
    }
  };

  const handleMinuteKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMinute((prev) => wrapMinute(prev + stepMinutes));
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMinute((prev) => wrapMinute(prev - stepMinutes));
    }
  };

  /* -----------------------------
     Render
  ----------------------------- */

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label className="text-sm font-semibold text-zinc-800">
          {label}
        </Label>
      )}

      <div className="flex items-end gap-3">
        {/* Hour */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-zinc-500">Hour</Label>
          <Input
            type="number"
            value={pad(hour)}
            onChange={(e) => handleHourChange(e.target.value)}
            onKeyDown={handleHourKey}
            min={1}
            max={12}
            className="w-20"
          />
        </div>

        {/* Minute */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-zinc-500">Minute</Label>
          <Input
            type="number"
            value={pad(minute)}
            onChange={(e) => handleMinuteChange(e.target.value)}
            onKeyDown={handleMinuteKey}
            min={0}
            max={59}
            step={stepMinutes}
            className="w-20"
          />
        </div>

        {/* AM/PM */}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-zinc-500">Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as "AM" | "PM")}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
