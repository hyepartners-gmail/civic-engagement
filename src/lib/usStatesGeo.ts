// src/lib/usStatesGeo.ts
import { feature } from "topojson-client";
import states10 from "us-atlas/states-10m.json";

// FIPS -> USPS (includes DC=11, PR=72)
const FIPS2USPS: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC",
  "12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY",
  "22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT",
  "31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
  "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX","49":"UT",
  "50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY","72":"PR"
};

// Name -> USPS (fallback if needed)
const NAME2USPS: Record<string, string> = {
  Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA",
  Colorado:"CO", Connecticut:"CT", Delaware:"DE", Florida:"FL", Georgia:"GA",
  Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN", Iowa:"IA",
  Kansas:"KS", Kentucky:"KY", Louisiana:"LA", Maine:"ME", Maryland:"MD",
  Massachusetts:"MA", Michigan:"MI", Minnesota:"MN", Mississippi:"MS", Missouri:"MO",
  Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH", "New Jersey":"NJ",
  "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND",
  Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA", "Rhode Island":"RI",
  "South Carolina":"SC", "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT",
  Vermont:"VT", Virginia:"VA", Washington:"WA", "West Virginia":"WV", Wisconsin:"WI",
  Wyoming:"WY", "District of Columbia":"DC", "Puerto Rico":"PR"
};

export function getUSStatesGeo() {
  // states10: { type: 'Topology', objects: { states: ... } }
  const topo = states10 as any;
  const fc = feature(topo, topo.objects.states) as any; // -> GeoJSON FeatureCollection

  fc.features = fc.features.map((f: any) => {
    // us-atlas puts numeric FIPS on f.id and the full name in properties.name
    const fips = String(f.id).padStart(2, "0");
    const name: string = f.properties?.name || f.properties?.NAME || "";
    const usps = FIPS2USPS[fips] || NAME2USPS[name];

    return {
      ...f,
      properties: {
        ...f.properties,
        NAME: name || f.properties?.NAME,
        STUSPS: usps,
        state: usps, // your components read .properties.state
      },
    };
  });

  // Optional: quick sanity log (remove if noisy)
  console.log("[usStatesGeo] features:", fc.features.length, "sample:",
    fc.features.slice(0, 3).map((f: any) => f.properties?.state));

  return fc;
}
