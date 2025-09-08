"use client";

import { useState, useEffect } from 'react';
import { useUrlState } from '@/hooks/useUrlState';

interface TypeFilterChipsProps {
  types: string[];
  allTypes: string[];
}

export default function TypeFilterChips({ types, allTypes }: TypeFilterChipsProps) {
  const [encodedTypes, setEncodedTypes] = useUrlState<string | null>('types', null);
  
  // Update URL when types change
  useEffect(() => {
    if (types.length === 0 || types.length === allTypes.length) {
      setEncodedTypes(null); // Don't encode if all types are selected
    } else {
      setEncodedTypes(types.join('|'));
    }
  }, [types, allTypes.length, setEncodedTypes]);
  
  const toggleType = (type: string) => {
    if (types.includes(type)) {
      // Remove type
      const newTypes = types.filter(t => t !== type);
      // If removing the last type, select all types
      setEncodedTypes(newTypes.length > 0 ? newTypes.join('|') : null);
    } else {
      // Add type
      const newTypes = [...types, type];
      setEncodedTypes(newTypes.join('|'));
    }
  };
  
  const selectAll = () => {
    setEncodedTypes(null); // Reset to default (all types)
  };
  
  const clearAll = () => {
    // This would effectively select no types, which isn't useful
    // Instead, we'll just leave it as is
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allTypes.map(type => {
        const isSelected = types.includes(type);
        const displayName = type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
        
        return (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-pressed={isSelected}
          >
            {displayName}
          </button>
        );
      })}
      
      <button
        onClick={selectAll}
        className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        Select All
      </button>
    </div>
  );
}