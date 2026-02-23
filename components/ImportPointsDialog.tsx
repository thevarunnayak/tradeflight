"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useTranslation } from "@/app/i18n/languageProvider";

/* ---------------- TYPES ---------------- */

type ImportPoint = {
  value: string; // stored as string (safe for inputs)
  time: string;
};

type FinalPoint = {
  value: number; // converted to number before applying
  time: string;
};

interface Props {
  onApply: (points: FinalPoint[]) => void;
}

/* ---------------- COMPONENT ---------------- */

export default function ImportPointsDialog({ onApply }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [parsedPoints, setParsedPoints] = useState<ImportPoint[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ---------------- RESET ---------------- */

  const resetState = () => {
    setParsedPoints([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ---------------- TIME HELPERS ---------------- */

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const isRowInvalid = (point: ImportPoint, index: number) => {
    if (!point.time || isNaN(Number(point.value))) return true;

    if (index > 0) {
      const prev = timeToMinutes(parsedPoints[index - 1].time);
      const current = timeToMinutes(point.time);
      if (current <= prev) return true;
    }

    return false;
  };

  const hasInvalidRows = parsedPoints.some(isRowInvalid);

  /* ---------------- FILE PARSE ---------------- */

  const handleFileUpload = (file: File) => {
    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processRows(results.data as any[]),
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        processRows(rows as any[]);
      };
      reader.readAsBinaryString(file);
    }
  };

  const processRows = (rows: any[]) => {
    const mapped = rows.map((r) => ({
      value: r.value?.toString() ?? "",
      time: r.time ?? "",
    }));

    if (mapped.length < 2) {
      toast.error(t("importDialog.invalidFileFormat"));
      return;
    }

    setParsedPoints(mapped);
    toast.success(t("importDialog.fileParsed"));
  };

  /* ---------------- EDIT CELL ---------------- */

  const updateCell = (
    index: number,
    field: "value" | "time",
    value: string,
  ) => {
    const updated = [...parsedPoints];
    updated[index][field] = value;
    setParsedPoints(updated);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="h-9 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Upload className="w-4 h-4" />
        {t("importDialog.openButton")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) resetState();
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden px-4 md:px-8">
          <DialogHeader>
            <DialogTitle>{t("importDialog.title")}</DialogTitle>
          </DialogHeader>

          {/* Hidden File Input */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            {t("importDialog.chooseFile")}
          </Button>

          {/* TABLE PREVIEW */}
          {parsedPoints.length > 0 && (
            <div className="mt-6 border rounded-md flex flex-col overflow-hidden">
              {/* Horizontal scroll wrapper */}
              <div className="overflow-x-auto">
                {/* Vertical scroll (approx 5 rows visible) */}
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">
                          {t("importDialog.index")}
                        </TableHead>
                        <TableHead>{t("importDialog.value")}</TableHead>
                        <TableHead>{t("importDialog.time")}</TableHead>
                        <TableHead>{t("importDialog.status")}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {parsedPoints.map((point, index) => {
                        const invalid = isRowInvalid(point, index);

                        return (
                          <TableRow
                            key={index}
                            className={invalid ? "bg-red-50" : ""}
                          >
                            <TableCell>{index + 1}</TableCell>

                            <TableCell>
                              <Input
                                type="number"
                                className="w-[12ch] md:w-full min-w-[12ch] px-2"
                                value={point.value}
                                onChange={(e) =>
                                  updateCell(index, "value", e.target.value)
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <Input
                                type="time"
                                className="w-[9ch] min-w-[9ch] px-2"
                                value={point.time}
                                onChange={(e) =>
                                  updateCell(index, "time", e.target.value)
                                }
                              />
                            </TableCell>

                            <TableCell className="text-xs whitespace-nowrap">
                              {invalid ? (
                                <span className="bg-red-600 px-3 py-1 rounded-full text-white font-semibold">
                                  {t("importDialog.invalid")}
                                </span>
                              ) : (
                                <span className="bg-green-600 px-3 py-1 rounded-full text-white font-semibold">
                                  {t("importDialog.valid")}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="px-4 py-2 bg-muted text-xs text-muted-foreground">
                {parsedPoints.length} {t("importDialog.pointsDetected")}
                {hasInvalidRows && (
                  <span className="text-red-600 ml-3">
                    {t("importDialog.fixInvalidRows")}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              disabled={!parsedPoints.length || hasInvalidRows}
              onClick={() => {
                const cleaned: FinalPoint[] = parsedPoints.map((p) => ({
                  value: Number(p.value),
                  time: p.time,
                }));

                onApply(cleaned);
                setOpen(false);
                resetState();
                toast.success(t("toast.pointsApplied"));
              }}
            >
              {t("importDialog.apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
