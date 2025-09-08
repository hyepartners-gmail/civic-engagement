"use client";
import { useState, useMemo } from 'react';
import { Plant } from '@/lib/energySchema';
import { Button } from '../ui/button';
import { ArrowUpDown, Download } from 'lucide-react';
import { csvFormat } from 'd3-dsv';

interface EnergyTableProps {
  plants: Plant[];
  onPlantSelect: (plantId: number) => void;
}

type SortKey = keyof Plant;

export default function EnergyTable({ plants, onPlantSelect }: EnergyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('capacity_mw');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedPlants = useMemo(() => {
    return [...plants].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [plants, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleDownload = () => {
    const csv = csvFormat(sortedPlants);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'power_plants.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headers: { key: SortKey; label: string }[] = [
    { key: 'plant_name', label: 'Name' },
    { key: 'state', label: 'State' },
    { key: 'fuel_type', label: 'Fuel' },
    { key: 'capacity_mw', label: 'Capacity (MW)' },
    { key: 'annual_net_gen_mwh', label: 'Output (MWh)' },
    { key: 'co2_intensity_kg_mwh', label: 'CO₂ Intensity' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{plants.length} Plants</h3>
        <Button variant="platform-primary" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-platform-contrast">
            <tr>
              {headers.map(h => (
                <th key={h.key} className="p-2">
                  <Button variant="ghost" size="sm" onClick={() => handleSort(h.key)}>
                    {h.label}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPlants.map(plant => (
              <tr
                key={plant.plant_id}
                className="border-b border-platform-contrast/50 hover:bg-platform-contrast/30 cursor-pointer"
                onClick={() => onPlantSelect(plant.plant_id)}
              >
                <td className="p-2">{plant.plant_name}</td>
                <td className="p-2">{plant.state}</td>
                <td className="p-2">{plant.fuel_type}</td>
                <td className="p-2 text-right">{plant.capacity_mw.toLocaleString()}</td>
                <td className="p-2 text-right">{plant.annual_net_gen_mwh?.toLocaleString() ?? 'N/A'}</td>
                <td className="p-2 text-right">{plant.co2_intensity_kg_mwh?.toLocaleString() ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}