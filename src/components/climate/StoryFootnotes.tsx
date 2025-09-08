"use client";
import { Card } from "@/components/shared/Card";
import { Info } from "lucide-react";

interface StoryFootnotesProps {
  beforeRange: [number, number];
  afterRange: [number, number];
  coverageWarning?: boolean;
}

export default function StoryFootnotes({ beforeRange, afterRange, coverageWarning }: StoryFootnotesProps) {
  return (
    <Card className="p-4 mt-6">
      <div className="flex items-start gap-2">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-sm mb-2">Analysis Notes</h4>
          <ul className="text-xs text-platform-text/80 space-y-1">
            <li>
              <strong>Time Periods:</strong> Comparing {beforeRange[0]}-{beforeRange[1]} to {afterRange[0]}-{afterRange[1]}
            </li>
            <li>
              <strong>Methodology:</strong> Values are computed using statistical aggregation (mean, sum, max) of available data points within each period.
            </li>
            <li>
              <strong>Data Coverage:</strong> Results are marked with a warning icon when data coverage is below 80% for either period.
            </li>
            {coverageWarning && (
              <li className="text-yellow-600">
                <strong>⚠️ Coverage Warning:</strong> Some metrics have sparse data coverage which may affect the reliability of the comparison.
              </li>
            )}
            <li>
              <strong>Units:</strong> Temperature anomalies are in °F, precipitation in inches, disaster counts as events, and emissions in million tons CO₂ equivalent.
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}