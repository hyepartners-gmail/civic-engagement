"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

import { useEnergyData } from "@/hooks/useEnergyData";
import { useEnergyState } from "@/hooks/useEnergyState";

import { filterStateEnergyData, selectRegionComparison, selectRegionalSummaryWithRenewables } from "@/lib/selectors/stateEnergy"; // Corrected import path for selectRegionalSummaryWithRenewables

import ChartContainer from "@/components/shared/ChartContainer";
import { Card } from "@/components/shared/Card";
import EnergyFilters from "@/components/energy/EnergyFilters";
import MapLegend from "@/components/energy/MapLegend";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RenewableBuildChart from "@/components/energy/RenewableBuildChart";
import InsightsPanel from "@/components/energy/InsightsPanel";
import { getUSStatesGeo } from "@/lib/usStatesGeo";

// Lazy UI pieces
const EnergyMap = dynamic(() => import("@/components/energy/EnergyMap"), { ssr: false });
const PowerPlantMap = dynamic(() => import("@/components/energy/PowerPlantMap"), { ssr: false });
const EnergyTable = dynamic(() => import("@/components/energy/EnergyTable"), { ssr: false });
const PlantDetailPanel = dynamic(() => import("@/components/energy/PlantDetailPanel"), { ssr: false });
const RegionalSummary = dynamic(() => import("@/components/energy/RegionalSummary"), { ssr: false });
const CompareRegions = dynamic(() => import("@/components/energy/CompareRegions"), { ssr: false });

export default function EnergyPage() {
  // ---------- data + filters ----------
  const { data: stateEnergyData, isLoading, isError, error } = useEnergyData();
  const filters = useEnergyState();
  const { regionalMetric, showRpsOverlay } = filters;

  // ---------- local UI state ----------
  const [colorMode, setColorMode] = useState<"fuel" | "co2">("fuel");
  const [mapView, setMapView] = useState<"state" | "plants">("state");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [compareState1, setCompareState1] = useState<string>("CA");
  const [compareState2, setCompareState2] = useState<string>("TX");

  // ---------- GeoJSON: use us-atlas helper, no network fetch ----------
  const usStatesGeoJson = useMemo(() => {
    const fc = getUSStatesGeo();
    const sample = fc.features.slice(0, 5).map((f: any) => ({
      state: f.properties?.state,
      STUSPS: f.properties?.STUSPS,
      NAME: f.properties?.NAME,
    }));
    console.log("[EnergyPage] Geo loaded from us-atlas:", {
      type: fc.type,
      featureCount: fc.features.length,
      sample,
    });
    return fc;
  }, []);

  // ---------- RPS data (still small fetch) ----------
  const [rpsData, setRpsData] = useState<Record<string, { target: number | null; year: number | null; notes: string }>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/climate/rps_targets.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`RPS fetch failed: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) {
          setRpsData(data);
          console.log("[EnergyPage] RPS loaded:", { states: Object.keys(data).length });
        }
      } catch (e) {
        console.error("[EnergyPage] RPS load error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- selectors / memos ----------
  const filteredStateData = useMemo(() => {
    if (!stateEnergyData) return [];
    const filtered = filterStateEnergyData(stateEnergyData, filters);
    console.log("[EnergyPage] Filtered states:", filtered.length, filtered.slice(0, 5).map((s) => s.state));
    return filtered;
  }, [stateEnergyData, filters]);

  const regionalSummaries = useMemo(() => {
    if (!filteredStateData) return {};
    // Directly construct summary from filteredStateData
    const summaries: Record<string, { capacity: number; generation: number; emissions: number }> = {};
    filteredStateData.forEach(stateData => {
      summaries[stateData.state] = {
        capacity: stateData.capacity_mw,
        generation: stateData.annual_net_gen_mwh,
        emissions: stateData.annual_co2_tons,
      };
    });
    console.log("[EnergyPage] Regional summaries:", Object.keys(summaries).length);
    return summaries;
  }, [filteredStateData]);

  const regionalSummariesWithRenewables = useMemo(
    () => (filteredStateData ? selectRegionalSummaryWithRenewables(filteredStateData) : {}),
    [filteredStateData]
  );

  const regionComparison: {
    region1: { capacity: number; generation: number; emissions: number; renewable_share: number; };
    region2: { capacity: number; generation: number; emissions: number; renewable_share: number; };
  } = useMemo(
    () =>
      filteredStateData
        ? selectRegionComparison(filteredStateData, compareState1, compareState2)
        : {
            region1: { capacity: 0, generation: 0, emissions: 0, renewable_share: 0 },
            region2: { capacity: 0, generation: 0, emissions: 0, renewable_share: 0 },
          },
    [filteredStateData, compareState1, compareState2]
  );

  const states = useMemo(() => {
    const arr = stateEnergyData ? Array.from(new Set(stateEnergyData.map((d) => d.state))).sort() : [];
    console.log("[EnergyPage] Unique states in energy data:", arr.length);
    return arr;
  }, [stateEnergyData]);

  // ---------- lifecycle debug ----------
  useEffect(() => {
    if (isError) console.error("[EnergyPage] Energy data error:", error);
    if (stateEnergyData?.length) {
      console.log("[EnergyPage] Energy data ready:", {
        count: stateEnergyData.length,
        first10: stateEnergyData.slice(0, 10).map((d) => d.state),
      });
    }
  }, [isError, error, stateEnergyData]);

  useEffect(() => {
    console.log("[EnergyPage] Map view:", mapView, "| regionalMetric:", regionalMetric, "| colorMode:", colorMode);
  }, [mapView, regionalMetric, colorMode]);

  const chartError = error as Error | null;

  // ---------- handlers ----------
  const handleStateSelect = (stateCode: string) => {
    console.log("[EnergyPage] State selected:", stateCode);
    setSelectedState(stateCode);
  };

  // ---------- render ----------
  return (
    <div className="min-h-screen bg-platform-background text-platform-text p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-thin text-platform-text">U.S. Power Plant Explorer</h1>
        <p className="text-platform-text/80 mt-1">
          Explore capacity, generation, and emissions data for major power plants across the United States.
        </p>
      </header>

      <div className="min-h-[80vh]">
        <ChartContainer isLoading={isLoading || !usStatesGeoJson} isError={isError} error={chartError}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[80vh]">
            {/* Left column */}
            <Card className="lg:col-span-1 flex flex-col gap-6">
              <Tabs defaultValue="filters" className="flex-1 flex flex-col">
                <TabsList>
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="regions">Regions</TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="mt-4 flex-1">
                  <EnergyFilters />
                </TabsContent>

                <TabsContent value="insights" className="mt-4 flex-1">
                  {/* TODO: Update InsightsPanel to work with state data */}
                  <div className="text-sm text-platform-text/70">
                    Insights panel needs to be updated for state-level data
                  </div>
                </TabsContent>

                <TabsContent value="regions" className="mt-4 flex-1">
                  <div className="space-y-4">
                    <h3 className="font-medium text-platform-text">Regional Analysis</h3>
                    <p className="text-sm text-platform-text/70">
                      Explore energy metrics by state and compare regional performance.
                    </p>
                    {stateEnergyData && (
                      <RegionalSummary
                        data={regionalSummariesWithRenewables}
                        selectedRegion={selectedState || "CA"}
                        onRegionChange={setSelectedState}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-auto">
                <MapLegend onColorModeChange={setColorMode} />
              </div>
            </Card>

            {/* Right column */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <Card className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">Power Plant Map</h2>
                  <div className="flex space-x-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        mapView === "state" ? "bg-blue-500 text-white" : "bg-gray-200"
                      }`}
                      onClick={() => setMapView("state")}
                    >
                      State View
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        mapView === "plants" ? "bg-blue-500 text-white" : "bg-gray-200"
                      }`}
                      onClick={() => setMapView("plants")}
                    >
                      Plant View
                    </button>
                  </div>
                </div>

                {mapView === "state" ? (
                  <EnergyMap
                    plants={filteredStateData}
                    usStatesGeoJson={usStatesGeoJson}
                    regionalSummaries={regionalSummaries}
                    regionalMetric={regionalMetric}
                    rpsData={rpsData}
                    showRpsOverlay={showRpsOverlay}
                    zoomToPlant={null}
                    onPlantSelect={handleStateSelect}
                    colorMode={colorMode}
                  />
                ) : (
                  <PowerPlantMap
                    plants={filteredStateData}
                    usStatesGeoJson={usStatesGeoJson}
                    selectedState={selectedState}
                    onPlantSelect={handleStateSelect}
                  />
                )}
              </Card>

              <Card className="flex-1 max-h-[40vh]">
                <Tabs defaultValue="table" className="h-full flex flex-col">
                  <TabsList>
                    <TabsTrigger value="table">Data Table</TabsTrigger>
                    <TabsTrigger value="renewables">Renewable Growth</TabsTrigger>
                    <TabsTrigger value="compare">Compare Regions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-4 flex-1">
                    {/* TODO: Update EnergyTable to work with state data */}
                    <div className="text-sm text-platform-text/70 p-4">
                      Data table needs to be updated for state-level data
                    </div>
                  </TabsContent>

                  <TabsContent value="renewables" className="mt-4 flex-1">
                    {/* TODO: Update RenewableBuildChart to work with state data */}
                    <div className="text-sm text-platform-text/70 p-4">
                      Renewable growth chart needs to be updated for state-level data
                    </div>
                  </TabsContent>

                  <TabsContent value="compare" className="mt-4 flex-1">
                    {stateEnergyData && (
                      <CompareRegions
                        data={regionComparison}
                        region1={compareState1}
                        region2={compareState2}
                        regions={states}
                        onRegion1Change={setCompareState1}
                        onRegion2Change={setCompareState2}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* TODO: Update PlantDetailPanel to work with state data */}
      <div className="fixed bottom-4 right-4 bg-platform-contrast p-4 rounded-lg shadow-lg">
        <p className="text-sm">Plant detail panel needs to be updated for state-level data</p>
      </div>
    </div>
  );
}