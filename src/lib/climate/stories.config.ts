import { ComponentType } from "react";
import dynamic from "next/dynamic";

export type StoryId =
  | "warming-century"
  | "rain-patterns"
  | "century-pivot"
  | "heat-energy-shift"
  | "hot-nights"
  | "emissions-context"
  | "city-vs-city"
  | "cost-of-change"
  | "heat-economy"
  | "population-vulnerability"
  | "warming-disasters"
  | "wildfire-trends"
  | "precipitation-disasters"
  | "temp-precip-relationship"
  | "climate-dashboard"
  | "degree-days";

export interface StoryDef {
  id: StoryId;
  title: string;
  blurb: string;
  component: ComponentType<any>;
}

export const STORIES_PAGE1: StoryDef[] = [
  {
    id: "warming-century",
    title: "The Century of Warming",
    blurb: "Local stripes, national mirror: the warmest decades on record.",
    component: dynamic(() => import("@/components/stories/StoryWarmingCentury"), { ssr: false }),
  },
  {
    id: "rain-patterns",
    title: "Rain Isn't the Same",
    blurb: "Precip anomalies vs flood/drought disasters.",
    component: dynamic(() => import("@/components/stories/StoryRainIsntTheSame"), { ssr: false }),
  },
  {
    id: "century-pivot",
    title: "The Century Pivot",
    blurb: "Before/after 1971: a new climate baseline.",
    component: dynamic(() => import("@/components/stories/StoryCenturyPivot"), { ssr: false }),
  },
  {
    id: "precipitation-disasters",
    title: "Precipitation and Disaster Patterns",
    blurb: "How do precipitation patterns in major cities correlate with national disaster frequency?",
    component: dynamic(() => import("@/components/stories/StoryPrecipitationDisasters"), { ssr: false }),
  },
];

export const STORIES_PAGE2: StoryDef[] = [
    {
        id: "heat-energy-shift",
        title: "Heat Rising, Energy Shifting",
        blurb: "Heating vs cooling days and state CO2 emissions.",
        component: dynamic(() => import("@/components/stories/StoryHeatEnergyShift"), { ssr: false }),
    },
    {
        id: "hot-nights",
        title: "Hot Nights, Harder Days",
        blurb: "Warm nights and wildfire risk.",
        component: dynamic(() => import("@/components/stories/StoryHotNightsHarderDays"), { ssr: false }),
    },
    {
        id: "emissions-context",
        title: "Emissions in Context",
        blurb: "National CO₂ emissions and global temperature anomalies.",
        component: dynamic(() => import("@/components/stories/StoryEmissionsInContext"), { ssr: false }),
    },
    {
        id: "heat-economy",
        title: "When Heat Meets the Economy",
        blurb: "Correlating summer temperatures with economic productivity proxies.",
        component: dynamic(() => import("@/components/stories/StoryHeatEconomy"), { ssr: false }),
    },
    {
        id: "temp-precip-relationship",
        title: "Temperature and Precipitation Relationship",
        blurb: "How do temperature anomalies and precipitation patterns relate in major U.S. cities?",
        component: dynamic(() => import("@/components/stories/StoryTempPrecipRelationship"), { ssr: false }),
    },
];

export const STORIES_PAGE3: StoryDef[] = [
  {
    id: "city-vs-city",
    title: "City vs. City: Diverging Futures",
    blurb: "Small multiples showing each city's temperature anomaly trend and extremes.",
    component: dynamic(() => import("@/components/stories/StoryCityVsCity"), { ssr: false }),
  },
  {
    id: "cost-of-change",
    title: "The Cost of a Changing Climate",
    blurb: "FEMA disaster costs and national emissions.",
    component: dynamic(() => import("@/components/stories/StoryCostOfChange"), { ssr: false }),
  },
  {
    id: "population-vulnerability",
    title: "Population Growth and Climate Vulnerability",
    blurb: "How has the growing U.S. population affected exposure to climate-related disasters?",
    component: dynamic(() => import("@/components/stories/StoryPopulationVulnerability"), { ssr: false }),
  },
  {
    id: "warming-disasters",
    title: "Warming and Disaster Frequency",
    blurb: "How does global temperature anomaly correlate with climate-related disaster frequency?",
    component: dynamic(() => import("@/components/stories/StoryWarmingDisasters"), { ssr: false }),
  },
  {
    id: "wildfire-trends",
    title: "Wildfire Trends",
    blurb: "Analyzing the relationship between wildfire frequency and acres burned over time.",
    component: dynamic(() => import("@/components/stories/StoryWildfireTrends"), { ssr: false }),
  },
  {
    id: "climate-dashboard",
    title: "Climate Dashboard",
    blurb: "A comprehensive view of key climate indicators: temperature anomalies, CO₂ emissions, disaster frequency, and wildfire activity.",
    component: dynamic(() => import("@/components/stories/StoryClimateDashboard"), { ssr: false }),
  },
  {
    id: "degree-days",
    title: "Heating and Cooling Demand",
    blurb: "Population-weighted heating and cooling degree days show how energy demand for temperature control has changed over time.",
    component: dynamic(() => import("@/components/stories/StoryDegreeDays"), { ssr: false }),
  },
];