import React from 'react';
import { Clock, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatHours, getFilteredLocations } from '../../utils/civic-utils';

interface LocationsListProps {
  title: string;
  locations: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showAll: boolean;
  onToggleShowAll: (show: boolean) => void;
}

const LocationsList: React.FC<LocationsListProps> = ({
  title,
  locations,
  searchTerm,
  onSearchChange,
  showAll,
  onToggleShowAll
}) => {
  const { locations: filteredLocations, remaining, isFiltered } = getFilteredLocations(
    locations, 
    searchTerm, 
    showAll
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-platform-text">
          {title} {locations.length > 5 && `(${locations.length} total)`}
        </h4>
      </div>
      
      {/* Search Input */}
      {locations.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-platform-text/50" />
          <Input
            placeholder="Search by address, name, or area..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 bg-platform-background border-platform-accent/30 text-platform-text placeholder:text-platform-text/50 focus:border-platform-accent focus:ring-platform-accent/20"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-platform-accent/20"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      {/* Results Info */}
      {isFiltered && (
        <div className="mb-3 text-sm text-platform-text/70">
          {filteredLocations.length === 0 ? (
            <span>No locations found matching "{searchTerm}"</span>
          ) : (
            <span>
              Showing {filteredLocations.length} of {locations.length} locations
              {filteredLocations.length < locations.length && ` matching "${searchTerm}"`}
            </span>
          )}
        </div>
      )}
      
      {/* Show More/Less Button */}
      {!isFiltered && remaining > 0 && (
        <div className="flex justify-center mb-3">
          {!showAll ? (
            <Button 
              variant="platform-secondary" 
              size="sm"
              onClick={() => onToggleShowAll(true)}
              className="text-platform-accent"
            >
              Show All {locations.length} Locations
            </Button>
          ) : (
            <Button 
              variant="platform-secondary" 
              size="sm"
              onClick={() => onToggleShowAll(false)}
              className="text-platform-accent"
            >
              Show Less (First 5)
            </Button>
          )}
        </div>
      )}
      
      {/* Locations List */}
      <div className="space-y-3">
        {filteredLocations.length === 0 && isFiltered ? (
          <div className="text-center py-8 text-platform-text/70">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No locations found matching your search.</p>
            <Button 
              variant="link" 
              onClick={() => onSearchChange('')}
              className="text-platform-accent mt-2 text-xs h-auto p-0"
            >
              Clear search to see all locations
            </Button>
          </div>
        ) : (
          filteredLocations.map((location: any, index: number) => (
            <div key={index} className="bg-platform-contrast/30 p-4 rounded-lg">
              <p className="font-medium">{location.location}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-platform-text/70">
                <Clock className="h-4 w-4" />
                {formatHours(location.hours)}
              </div>
              {location.notes && (
                <p className="text-sm text-platform-text/70 mt-2">{location.notes}</p>
              )}
              <button 
                className="mt-2 text-xs bg-platform-accent/20 px-2 py-1 rounded text-platform-accent hover:bg-platform-accent/30 transition-colors"
                onClick={() => {
                  const url = location.latitude && location.longitude 
                    ? `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
                    : `https://maps.google.com/maps?q=${encodeURIComponent(location.location)}`;
                  window.open(url, '_blank');
                }}
              >
                Open in Maps
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationsList;