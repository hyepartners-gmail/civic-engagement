"use client";
import { useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StateEnergyData } from "@/lib/energySchema";
import { RegionalMetric } from "@/hooks/useEnergyState";
import { scaleLinear } from "d3-scale";
import { scaleQuantile } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";

// ---- DEBUG switch -------------------------------------------------
const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.log("[EnergyMap]", ...args);

// ---- Leaflet default icon fix ------------------------------------
const defaultIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

// Neon ramp: blue -> pink
const NEON_BLUE = "#00E5FF";
const NEON_PINK = "#FF00E5";
const NEON_PALETTE_9 = Array.from({ length: 9 }, (_, i) =>
  interpolateRgb(NEON_BLUE, NEON_PINK)(i / 8)
);

// ---- Types --------------------------------------------------------
interface EnergyMapProps {
  plants: StateEnergyData[];
  usStatesGeoJson: any;
  regionalSummaries: Record<string, { capacity: number; generation: number; emissions: number }>;
  regionalMetric: RegionalMetric;
  rpsData: Record<string, { target: number | null; year: number | null; notes: string }>;
  showRpsOverlay: boolean;
  onPlantSelect: (stateCode: string) => void;
  zoomToPlant: string | null;
  colorMode: "fuel" | "co2";
}

// ---- Helpers ------------------------------------------------------
const NAME_TO_ABBR: Record<string, string> = {
  Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA",
  Colorado:"CO", Connecticut:"CT", Delaware:"DE", Florida:"FL", Georgia:"GA",
  Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN", Iowa:"IA",
  Kansas:"KS", Kentucky:"KY", Louisiana:"LA", Maine:"ME", Maryland:"MD",
  Massachusetts:"MA", Michigan:"MI", Minnesota:"MN", Mississippi:"MS", Missouri:"MO",
  Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH", "New Jersey":"NJ",
  "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND",
  Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA", "Rhode Island":"RI",
  "South Carolina":"SC", "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT",
  Vermont:"VT", Virginia:"VA", Washington:"WA", "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY",
  "District of Columbia":"DC", "Puerto Rico":"PR"
};

function abbrFromFeature(feature: any): string | undefined {
  const p = feature?.properties || {};
  return p.state || p.STUSPS || NAME_TO_ABBR[p.NAME] || NAME_TO_ABBR[p.name];
}

function normalizeFuelKey(k: string): string {
  const s = k.toLowerCase();
  if (s === "gas" || s === "natural_gas" || s === "natgas") return "lng";
  if (s === "hydro" || s === "hydroelectric") return "dam";
  return s;
}

const fuelColors: Record<string, string> = {
  coal:"#2f4f4f", lng:"#8b0000", gas:"#8b0000",
  oil:"#ff8c00", nuclear:"#9370db",
  dam:"#4169e1", hydro:"#4169e1",
  wind:"#00ff7f", solar:"#ffff00",
  biomass:"#8b4513", geothermal:"#ff6347",
  other:"#a9a9a9", unknown:"#808080"
};

function dominantFuel(s: StateEnergyData): string {
  const m = s.capacity_by_fuel_mw;
  if (!m) return "unknown";
  let max = -1;
  let best = "unknown";
  for (const [raw, val] of Object.entries(m)) {
    const v = typeof val === "number" ? val : Number(val);
    if (v > max) { max = v; best = normalizeFuelKey(raw); }
  }
  return best;
}

// ---- Component ----------------------------------------------------
export default function EnergyMap({
  plants,
  usStatesGeoJson,
  regionalSummaries,   // not used for coloring in this debug build
  regionalMetric,
  rpsData,
  showRpsOverlay,
  onPlantSelect,
  zoomToPlant,
  colorMode
}: EnergyMapProps) {

  useEffect(() => {
    log("mounted. props:", {
      plants: plants?.length ?? 0,
      geojson: !!usStatesGeoJson,
      metric: regionalMetric,
      colorMode,
      showRpsOverlay
    });
  }, [plants, usStatesGeoJson, regionalMetric, colorMode, showRpsOverlay]);

  // Normalize GeoJSON so every feature has properties.state (USPS)
  const normalizedStates = useMemo(() => {
    if (!usStatesGeoJson?.features) {
      log("no GeoJSON.features; received:", usStatesGeoJson);
      return usStatesGeoJson;
    }
    const features = usStatesGeoJson.features.map((f: any) => {
      const abbr = abbrFromFeature(f);
      return abbr && f?.properties?.state !== abbr
        ? { ...f, properties: { ...f.properties, state: abbr } }
        : f;
    });
    const fc = { ...usStatesGeoJson, features };
    const sample = features.slice(0, 5).map((f: any) => f.properties);
    log("GeoJSON normalized. featureCount:", features.length, "sampleProperties:", sample);
    return fc;
  }, [usStatesGeoJson]);

  // Fast lookup by USPS state code
  const byState = useMemo(() => {
    const m = new Map<string, StateEnergyData>();
    for (const s of plants || []) m.set(s.state, s);
    log("built byState map for", m.size, "states. example CA:", m.get("CA"), "TX:", m.get("TX"));
    return m;
  }, [plants]);

  // Metric -> raw numeric on StateEnergyData
  const getMetricValue = (s: StateEnergyData): number | undefined => {
    if (!s) return undefined;
    switch (regionalMetric) {
      case "capacity":   return s.capacity_mw;
      case "generation": return s.annual_net_gen_mwh;
      case "emissions":  return s.annual_co2_tons;
      default:           return undefined; // 'none'
    }
  };

  // Choropleth for regionalMetric (capacity/generation/emissions)
// Use quantiles so more states land in visibly different buckets.
const choroplethScale = useMemo(() => {
  if (regionalMetric === "none") return null;

  const vals = (plants || [])
    .map(s => {
      switch (regionalMetric) {
        case "capacity":   return s.capacity_mw;
        case "generation": return s.annual_net_gen_mwh;
        case "emissions":  return s.annual_co2_tons;
        default:           return undefined;
      }
    })
    .filter((v): v is number => typeof v === "number" && isFinite(v));

  if (!vals.length) return null;

  return scaleQuantile<string>()
    .domain(vals)
    .range(NEON_PALETTE_9); // neon blue -> neon pink
}, [plants, regionalMetric]);

// CO2 intensity (kg/MWh) — same neon quantile ramp for strong separation
const co2Scale = useMemo(() => {
  const vals = (plants || [])
    .map(p => p.annual_net_gen_mwh > 0
      ? (p.annual_co2_tons / p.annual_net_gen_mwh) * 1000
      : 0)
    .filter(v => Number.isFinite(v));

  if (!vals.length) return null;

  return scaleQuantile<string>()
    .domain(vals)
    .range(NEON_PALETTE_9);
}, [plants]);


  // // CO₂ intensity (kg/MWh) scale
  // const co2Scale = useMemo(() => {
  //   const vals = (plants || [])
  //     .map((p) => p.annual_net_gen_mwh > 0 ? (p.annual_co2_tons / p.annual_net_gen_mwh) * 1000 : 0)
  //     .filter((v) => isFinite(v));
  //   const max = vals.length ? Math.max(...vals) : 1;
  //   const s = scaleLinear<string>().domain([0, max]).range(["#E8F5E9", "#B71C1C"]);
  //   log("co2Scale: max", max, "example(0)->", s(0), "example(max)->", s(max));
  //   return s;
  // }, [plants]);

  const rpsScale = useMemo(() => {
    const targets = Object.values(rpsData)
      .map((d) => d.target)
      .filter((t): t is number => typeof t === "number");
    const max = targets.length ? Math.max(...targets) : 1;
    const s = scaleLinear<string>().domain([0, max]).range(["#E8F5E9", "#1B5E20"]);
    log("rpsScale: targets", targets.length, "max", max);
    return s;
  }, [rpsData]);

  // Limit per-render feature logs
  const loggedCountRef = useRef(0);

  const styleFn = (feature: any) => {
    const abbr = abbrFromFeature(feature);
    const s = abbr ? byState.get(abbr) : undefined;

    let branch = "fallback";
    let fillColor = "#9ca3af"; // gray-400 visible fallback
    let fillOpacity = 0.75;

    if (showRpsOverlay && abbr) {
      const rps = rpsData[abbr];
      fillColor = rps?.target ? rpsScale(rps.target) : "#bdbdbd";
      branch = "rps";
    } else if (regionalMetric !== "none" && s && choroplethScale) {
      const v = getMetricValue(s);
      if (typeof v === "number" && isFinite(v)) {
        fillColor = choroplethScale(v);
        branch = "metric";
      }
    } else if (colorMode === "fuel" && s) {
      fillColor = fuelColors[dominantFuel(s)] || "#808080";
      branch = "fuel";
    } else if (colorMode === "co2" && s && co2Scale) { // Added null check for co2Scale
      const kgPerMWh = s.annual_net_gen_mwh > 0
        ? (s.annual_co2_tons / s.annual_net_gen_mwh) * 1000
        : 0;
      if (isFinite(kgPerMWh)) {
        fillColor = co2Scale(kgPerMWh);
        branch = "co2";
      }
    }

    // Log first N features each render to avoid spamming
    if (DEBUG && loggedCountRef.current < 12) {
      const v = s ? getMetricValue(s) : undefined;
      log("style:", { abbr, branch, metric: regionalMetric, value: v, fillColor, hasStateData: !!s });
      loggedCountRef.current += 1;
    }

    return {
      fill: true,
      fillColor,
      fillOpacity,
      weight: 1.2,
      color: "#475569", // slate-600 stroke (always visible)
      opacity: 0.9,
      dashArray: "2",
    };
  };

  return (
    <MapContainer
      key={`states-${regionalMetric}-${colorMode}-${showRpsOverlay}`} // forces layer refresh on toggles
      center={[39.8283, -98.5795]}
      zoom={4}
      className="h-full w-full rounded-lg z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {normalizedStates && (
        <GeoJSON
          key={usStatesGeoJson?.features?.length ?? 0}
          data={normalizedStates}
          style={styleFn}
          onEachFeature={(feature, layer) => {
            const abbr = abbrFromFeature(feature);
            const name = feature?.properties?.name || feature?.properties?.NAME || abbr || "Unknown";
            const s = abbr ? byState.get(abbr) : undefined;

            if (DEBUG) log("onEachFeature:", { abbr, name, hasStateData: !!s });

            if (s) {
              const html = `
                <div class="text-sm">
                  <h4 class="font-bold">${name}</h4>
                  <p><strong>Capacity:</strong> ${s.capacity_mw.toLocaleString()} MW</p>
                  <p><strong>Generation:</strong> ${s.annual_net_gen_mwh.toLocaleString()} MWh</p>
                  <p><strong>CO₂ Emissions:</strong> ${s.annual_co2_tons.toLocaleString()} tons</p>
                </div>`;
              layer.bindPopup(html);
            }

            layer.on("click", () => abbr && onPlantSelect(abbr));
          }}
        />
      )}
    </MapContainer>
  );
}