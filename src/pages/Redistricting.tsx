"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '../components/ui/button';
import { ArrowLeft, Map, Layers, Share2, Download, ChevronLeft } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import PlatformCard from '../components/PlatformCard';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from '../components/MainLayout'; // Import MainLayout

// Dynamically import Leaflet-dependent components
const RedistrictingMap = dynamic(() => import('../components/RedistrictingMap'), { ssr: false });
const DistrictInfoPanel = dynamic(() => import('../components/Redistricting/DistrictInfoPanel'), { ssr: false });

interface DistrictProperties {
  id: string;
  name: string;
  population: number;
  population_deviation?: number;
  edges_score?: number;
  partisan_lean?: string;
  packing_cracking_flag?: 'Packed' | 'Cracked' | 'None';
  compactness?: number;
}

interface DistrictVoteData {
  margin: number;
  winner: 'D' | 'R' | 'Other';
}

interface NationalMapData {
  type: 'FeatureCollection';
  features: any[];
}

interface StateMapData {
  currentDistrictsGeoJson: any;
  proposedPlans: {
    compact: any;
    population: any;
    counties: any;
    populationCenters: any;
    vra: any;
  };
  blocksGeoJson: any;
  voteData: { [year: string]: any };
  evaluationData: any;
}

// Hardcoded list of states that are likely to have data
const DEFAULT_STATES_WITH_DATA = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const RedistrictingPage: React.FC = () => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [nationalData, setNationalData] = useState<NationalMapData | null>(null);
  const [stateData, setStateData] = useState<StateMapData | null>(null);

  const [activeLayers, setActiveLayers] = useState({
    currentDistricts: true,
    planCompact: false,
    planPopulation: false, // Default to false, will be set true when state is selected
    planCounties: false,
    planPopulationCenters: false,
    planVra: false,
    populationBlocks: false,
    voteMargin: false,
    compactness: false,
  });

  const [selectedVoteYear, setSelectedVoteYear] = useState<string>('2020');
  const [selectedDistrictData, setSelectedDistrictData] = useState<{ district: DistrictProperties; voteData: DistrictVoteData | null } | null>(null);

  const isUserAuthenticated = status === 'authenticated';
  const isAdmin = (session?.user as any)?.role === 'admin';
  const hasCivicExplorerBadge = (session?.user as any)?.viewedCivicPage;

  // Helper to fetch JSON and handle 404s gracefully
  const fetchJsonOrEmpty = useCallback(async (url: string, defaultValue: any = {}) => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      } else if (res.status === 404) {
        console.warn(`[RedistrictingPage] File not found (404): ${url}. Returning empty data.`);
        return defaultValue;
      } else {
        console.error(`[RedistrictingPage] Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        return defaultValue;
      }
    } catch (err) {
      console.error(`[RedistrictingPage] Network error fetching ${url}:`, err);
      return defaultValue;
    }
  }, []);

  // Function to simulate fetching national data from hardcoded list
  const simulateFetchNationalData = useCallback(async () => {
    console.log('[RedistrictingPage] Simulating fetchNationalData...');
    setLoading(true);
    setError(null);
    try {
      const promises = DEFAULT_STATES_WITH_DATA.map(async (code: string) => {
        // Attempt to fetch a representative plan for each state
        const geojson = await fetchJsonOrEmpty(`/maps/${code}/plan_population.geojson`, { type: 'FeatureCollection', features: [] });
        if (geojson && geojson.features && geojson.features.length > 0) {
          geojson.features.forEach((f: any) => {
            f.properties = f.properties || {};
            f.properties.state = code; // Add state property for click handling
          });
          return geojson.features;
        }
        return null;
      });

      const featureArrays = await Promise.all(promises);
      const allFeatures = featureArrays.flat().filter(Boolean);

      const finalNationalData: NationalMapData = {
        type: 'FeatureCollection',
        features: allFeatures,
      };
      setNationalData(finalNationalData);
      console.log(`[RedistrictingPage] Simulated nationalData loaded with ${allFeatures.length} features.`);

    } catch (err: any) {
      console.error('[RedistrictingPage] Error in simulateFetchNationalData:', err);
      setError(err.message || 'Failed to load national map data.');
    } finally {
      setLoading(false);
    }
  }, [fetchJsonOrEmpty]);

  const fetchStateData = useCallback(async (stateCode: string) => {
    console.log(`[RedistrictingPage] Starting fetchStateData for ${stateCode}...`);
    setLoading(true);
    setError(null);
    try {
      const [
        currentDistrictsGeoJson, planCompact, planPopulation, planCounties,
        planPopulationCenters, planVra, blocksGeoJson, votes2016,
        votes2020, evaluationData,
      ] = await Promise.all([
        fetchJsonOrEmpty(`/maps/${stateCode}/districts_2020.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/plan_compact.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/plan_population.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/plan_counties.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/plan_populationcenters.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/plan_vra.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/tracts_2020.geojson`, { type: 'FeatureCollection', features: [] }),
        fetchJsonOrEmpty(`/maps/${stateCode}/voting_general_2016.json`, {}),
        fetchJsonOrEmpty(`/maps/${stateCode}/voting_general_2020.json`, {}),
        fetchJsonOrEmpty(`/maps/${stateCode}/evaluation.json`, {}),
      ]);
      
      setStateData({
        currentDistrictsGeoJson,
        proposedPlans: {
          compact: planCompact,
          population: planPopulation,
          counties: planCounties,
          populationCenters: planPopulationCenters,
          vra: planVra,
        },
        blocksGeoJson,
        voteData: {
          '2016': votes2016,
          '2020': votes2020,
        },
        evaluationData,
      });
      console.log(`[RedistrictingPage] Successfully loaded state data for ${stateCode}.`);
    } catch (err: any) {
      console.error(`[RedistrictingPage] Error in fetchStateData for ${stateCode}:`, err);
      setError(`Failed to load detailed data for ${stateCode}.`);
    } finally {
      console.log(`[RedistrictingPage] fetchStateData for ${stateCode} finished.`);
      setLoading(false);
    }
  }, [fetchJsonOrEmpty]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!isUserAuthenticated || (!isAdmin && !hasCivicExplorerBadge)) {
      toast({ variant: 'destructive', title: 'Access Denied' });
      router.push('/');
      return;
    }
    // Call the simulated fetch for national data
    simulateFetchNationalData();
  }, [status, isUserAuthenticated, isAdmin, hasCivicExplorerBadge, router, simulateFetchNationalData, toast]);

  useEffect(() => {
    if (selectedState) {
      setStateData(null);
      fetchStateData(selectedState);
      // When a state is selected, activate the 'planPopulation' layer by default
      setActiveLayers(prev => ({ ...prev, planPopulation: true }));
    } else {
      setStateData(null);
      // When no state is selected, deactivate all proposed plans
      setActiveLayers(prev => ({ 
        ...prev, 
        planPopulation: false, 
        planCompact: false, 
        planCounties: false, 
        planPopulationCenters: false, 
        planVra: false 
      }));
    }
  }, [selectedState, fetchStateData]);

  const handleLayerToggle = (layerName: keyof typeof activeLayers) => {
    setActiveLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const handleDistrictClick = (districtProperties: DistrictProperties, voteDataForDistrict: DistrictVoteData | null) => {
    setSelectedDistrictData({ district: districtProperties, voteData: voteDataForDistrict });
  };

  const handleStateClick = (stateCode: string) => {
    setSelectedState(stateCode);
    setSelectedDistrictData(null); // Close district panel when changing state
  };

  if (status === 'loading' || (loading && !nationalData && !stateData)) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-platform-background text-platform-text">
          <p className="text-xl font-normal">Loading redistricting explorer...</p>
        </div>
      </MainLayout>
    );
  }
  
  console.log('[RedistrictingPage] Rendering component. Selected state:', selectedState);
  console.log('[RedistrictingPage] nationalData state:', nationalData);

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-thin text-platform-text">Redistricting Explorer</h1>
        {/* Removed "Back to Topics" button */}
      </div>

      <div className="flex flex-1 gap-6 relative">
        <AnimatePresence>
          {selectedState && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-xs"
            >
              <PlatformCard variant="default" className="p-6 h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-thin flex items-center gap-2">
                    <Layers className="h-5 w-5 text-platform-accent" /> {selectedState} Layers
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedState(null)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> US Map
                  </Button>
                </div>
                {stateData ? (
                  <div className="space-y-4">
                    {/* Layer controls here */}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="currentDistricts" checked={activeLayers.currentDistricts} onCheckedChange={() => handleLayerToggle('currentDistricts')} />
                      <Label htmlFor="currentDistricts">Current Districts</Label>
                    </div>
                    <h3 className="text-base font-thin pt-2">Proposed Plans</h3>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="planPopulation" checked={activeLayers.planPopulation} onCheckedChange={() => handleLayerToggle('planPopulation')} />
                      <Label htmlFor="planPopulation">Population Balanced</Label>
                    </div>
                    {/* Add other plan toggles here */}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="planCompact" checked={activeLayers.planCompact} onCheckedChange={() => handleLayerToggle('planCompact')} />
                      <Label htmlFor="planCompact">Compact Shapes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="planCounties" checked={activeLayers.planCounties} onCheckedChange={() => handleLayerToggle('planCounties')} />
                      <Label htmlFor="planCounties">Preserve Counties</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="planPopulationCenters" checked={activeLayers.planPopulationCenters} onCheckedChange={() => handleLayerToggle('planPopulationCenters')} />
                      <Label htmlFor="planPopulationCenters">Population Centers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="planVra" checked={activeLayers.planVra} onCheckedChange={() => handleLayerToggle('planVra')} />
                      <Label htmlFor="planVra">VRA Compliant</Label>
                    </div>
                    <h3 className="text-base font-thin pt-2">Color Overlays</h3>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="voteMargin" checked={activeLayers.voteMargin} onCheckedChange={() => handleLayerToggle('voteMargin')} />
                      <Label htmlFor="voteMargin">Vote Margin</Label>
                    </div>
                    {activeLayers.voteMargin && (
                      <RadioGroup value={selectedVoteYear} onValueChange={setSelectedVoteYear} className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="2016" id="r1" /><Label htmlFor="r1">2016</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="2020" id="r2" /><Label htmlFor="r2">2020</Label></div>
                      </RadioGroup>
                    )}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="compactness" checked={activeLayers.compactness} onCheckedChange={() => handleLayerToggle('compactness')} />
                      <Label htmlFor="compactness">Compactness Score</Label>
                    </div>
                  </div>
                ) : (
                  <p>Loading layers for {selectedState}...</p>
                )}
              </PlatformCard>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 h-[80vh]">
          <PlatformCard variant="background" className="h-full p-0 overflow-hidden">
            <RedistrictingMap
              selectedState={selectedState}
              nationalData={nationalData}
              stateData={stateData}
              activeLayers={activeLayers}
              selectedVoteYear={selectedVoteYear}
              onStateClick={handleStateClick}
              onDistrictClick={handleDistrictClick}
            />
          </PlatformCard>
        </div>
      </div>
      {selectedDistrictData && (
        <DistrictInfoPanel
          isOpen={!!selectedDistrictData}
          onClose={() => setSelectedDistrictData(null)}
          district={selectedDistrictData.district}
          voteData={selectedDistrictData.voteData}
        />
      )}
    </MainLayout>
  );
};

export default RedistrictingPage;