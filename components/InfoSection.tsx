"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  t: any;
};

export default function InfoSection({
  title,
  setTitle,
  description,
  setDescription,
  t,
}: Props) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}