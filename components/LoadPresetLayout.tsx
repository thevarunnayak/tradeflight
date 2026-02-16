"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, PlayCircle, Clock, Ratio, List, Search } from "lucide-react";

type Preset = {
  id: string;
  name: string;
  data: any;
};

interface Props {
  presets: Preset[];
  onLoad: (preset: Preset) => void;
  onDelete: (id: string) => void;
}

export default function LoadPresetLayout({ presets, onLoad, onDelete }: Props) {
  const [search, setSearch] = useState("");

  const filteredPresets = useMemo(() => {
    if (!search.trim()) return presets;

    const query = search.toLowerCase();

    return presets.filter((preset) => {
      return (
        preset.name?.toLowerCase().includes(query) ||
        preset.data?.title?.toLowerCase().includes(query) ||
        preset.data?.description?.toLowerCase().includes(query)
      );
    });
  }, [search, presets]);

  return (
    <div className="space-y-4">
      {/* SEARCH INPUT */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Search presets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* LIST */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
        {filteredPresets.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">
            No matching presets found.
          </div>
        ) : (
          filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className="
                rounded-xl border border-zinc-200
                bg-white/70 backdrop-blur-sm
                p-4 transition-all duration-200
                hover:shadow-md hover:border-zinc-300
              "
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">{preset.name}</h3>

                  {preset.data.title && (
                    <p className="text-sm text-zinc-500">{preset.data.title}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {preset.data.description && (
                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                  {preset.data.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-xs text-zinc-500 mt-3">
                <div className="flex items-center gap-1">
                  <List className="w-3 h-3" />
                  {preset.data.points.length} points
                </div>

                <div className="flex items-center gap-1">
                  <Ratio className="w-3 h-3" />
                  {preset.data.aspectRatio}
                </div>

                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {preset.data.durationInput}s
                </div>
              </div>

              {/* Preview Points */}
              <div className="mt-3 text-xs text-zinc-400">
                {preset.data.points.slice(0, 3).map((p: any, i: number) => (
                  <span key={i}>
                    {p.value} @ {p.time}
                    {i !== Math.min(2, preset.data.points.length - 1) && " • "}
                  </span>
                ))}
                {preset.data.points.length > 3 && " ..."}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex items-center gap-2 flex-1"
                  onClick={() => onLoad(preset)}
                >
                  <PlayCircle className="w-4 h-4" />
                  Load
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={() => onDelete(preset.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
