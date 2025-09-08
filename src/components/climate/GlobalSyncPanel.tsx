"use client";
import WarmingStripes from "@/components/charts/WarmingStripes";
import { selectNationalTempAnomaly } from "@/lib/selectors/temps";
import { ClimateArtifact } from "@/lib/climateSchema";

export default function GlobalSyncPanel({ artifact }: { artifact: ClimateArtifact }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">National & Global Context</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-center text-sm mb-2">National Average</p>
          <WarmingStripes data={selectNationalTempAnomaly(artifact, { cadence: 'annual' })} />
        </div>
        <div>
          <p className="text-center text-sm mb-2">Global Average (Placeholder)</p>
          {/* Placeholder until global data is added to artifact */}
          <WarmingStripes data={selectNationalTempAnomaly(artifact, { cadence: 'annual' })} />
        </div>
      </div>
    </div>
  );
}