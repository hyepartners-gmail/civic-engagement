"use client";
import WarmingStripes from "@/components/charts/WarmingStripes";
import { selectCityTempAnomaly } from "@/lib/selectors/temps";
import { ClimateArtifact } from "@/lib/climateSchema";

const CITIES = [
  { id: 'seattle', name: 'Seattle, WA' },
  { id: 'los-angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'atlanta', name: 'Atlanta, GA' },
  { id: 'new-york', name: 'New York, NY' },
];

export default function CityStripGrid({ artifact }: { artifact: ClimateArtifact }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">City Temperatures</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CITIES.map(city => (
          <div key={city.id}>
            <p className="text-center text-sm mb-2">{city.name}</p>
            <WarmingStripes data={selectCityTempAnomaly(artifact, { cityId: city.id, cadence: 'annual' })} />
          </div>
        ))}
      </div>
    </div>
  );
}