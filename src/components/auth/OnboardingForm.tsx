"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import FormField from '@/components/FormField';
import AddressInput from '@/components/AddressInput';
import { isValidZipCode } from '@/utils/validation';

// Birth year validation function
const isValidBirthYear = (year: string): boolean => {
  if (!/^\d{4}$/.test(year)) return false; // Must be exactly 4 digits
  const yearNum = parseInt(year, 10);
  return year.startsWith('19') || year.startsWith('20'); // Must start with 19 or 20
};
import { useToast } from '@/hooks/use-toast';
import zipcodes from 'zipcodes'; // Import the zipcodes package
import { Check } from 'lucide-react'; // Import Check icon
import { colors } from '@/lib/theme'; // Import centralized colors

interface OnboardingFormProps {
  userId: string | undefined; // New prop for userId
  username: string;
  setUsername: (username: string) => void;
  zipCode: string;
  setZipCode: (zipCode: string) => void;
  birthYear: string;
  setBirthYear: (birthYear: string) => void;
  politicalAlignmentChoice: 'Left' | 'Center' | 'Right' | undefined; // Changed to undefined
  setPoliticalAlignmentChoice: (choice: 'Left' | 'Center' | 'Right' | undefined) => void; // Changed to undefined
  specificPartyPreference: string;
  setSpecificPartyPreference: (preference: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  error: string;
  isSubmitting: boolean;
  // New props for location data
  city: string | undefined;
  setCity: (city: string | undefined) => void;
  state: string | undefined;
  setState: (state: string | undefined) => void;
  metroArea: string | undefined;
  setMetroArea: (metroArea: string | undefined) => void;
  congressionalDistrict: string | undefined;
  setCongressionalDistrict: (district: string | undefined) => void;
}

const PARTY_OPTIONS = {
  Left: ['Moderate', 'Liberal', 'Progressive', 'Socialist', 'Communist'],
  Center: ['Independent', 'Moderate', 'No Affiliation'],
  Right: ['Libertarian', 'Republican', 'Conservative', 'MAGA', 'Authoritarian', 'Christian Nationalist'],
};

const OnboardingForm: React.FC<OnboardingFormProps> = ({
  userId, // Destructure new prop
  username,
  setUsername,
  zipCode,
  setZipCode,
  birthYear,
  setBirthYear,
  politicalAlignmentChoice,
  setPoliticalAlignmentChoice,
  specificPartyPreference,
  setSpecificPartyPreference,
  onSubmit,
  error,
  isSubmitting,
  city,
  setCity,
  state,
  setState,
  metroArea,
  setMetroArea,
  congressionalDistrict,
  setCongressionalDistrict,
}) => {
  const { toast } = useToast();
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);

  // Effect to lookup city/state/district when zipCode changes
  useEffect(() => {
    const lookupZip = async () => {
      setCity(undefined);
      setState(undefined);
      setMetroArea(undefined);
      setCongressionalDistrict(undefined);

      if (isValidZipCode(zipCode)) {
        setIsZipLookupLoading(true);
        // Use zipcodes package for instant city/state lookup
        const zipData = zipcodes.lookup(zipCode);
        if (zipData) {
          setCity(zipData.city);
          setState(zipData.state);
          // zipcodes package doesn't directly provide metroArea, so it remains undefined for now
        }

        // Call backend API for congressional district
        try {
          const response = await fetch(`/api/civic-info?zipCode=${zipCode}`);
          if (response.ok) {
            const data = await response.json();
            setCongressionalDistrict(data.congressionalDistrict);
            // If metroArea was provided by civic-info API, set it here
            if (data.metroArea) {
              setMetroArea(data.metroArea);
            }
          } else {
            console.error('Failed to fetch civic info, status:', response.status);
            // Don't show error toast for civic info failures - it's optional data
            // The user can still complete their profile without congressional district
          }
        } catch (err) {
          console.error('Network error fetching civic info:', err);
          // Don't show error toast for civic info failures - it's optional data
        } finally {
          setIsZipLookupLoading(false);
        }
      } else {
        setIsZipLookupLoading(false);
      }
    };

    const handler = setTimeout(() => {
      lookupZip();
    }, 500); // Debounce lookup to avoid too many API calls

    return () => {
      clearTimeout(handler);
    };
  }, [zipCode, setCity, setState, setMetroArea, setCongressionalDistrict, toast]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { // Check if userId is available
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User ID not found. Please try signing in again.' });
      return;
    }
    if (!username.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a username.' });
      return;
    }
    if (!isValidZipCode(zipCode)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a valid 5-digit zip code.' });
      return;
    }
    if (!isValidBirthYear(birthYear)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a valid 4-digit birth year starting with 19 or 20.' });
      return;
    }
    if (!city || !state) { // Ensure city and state are populated from lookup
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Unable to determine city and state from zip code. Please try a different zip code or contact support.' });
      return;
    }
    if (politicalAlignmentChoice === undefined) { // Check for undefined
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select your political alignment.' });
      return;
    }
    if (politicalAlignmentChoice && !specificPartyPreference) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select your specific party preference.' });
      return;
    }
    await onSubmit(e);
  };

  const PoliticalAlignmentButton: React.FC<{
    label: string;
    value: 'Left' | 'Center' | 'Right';
    colorClass: string;
  }> = ({ label, value, colorClass }) => (
    <Button
      type="button"
      onClick={() => {
        setPoliticalAlignmentChoice(value);
        setSpecificPartyPreference('');
      }}
      className={
        politicalAlignmentChoice === value
          ? `${colorClass} text-white font-semibold px-6 py-3 rounded-md flex items-center gap-2` // Added flex items-center gap-2
          : "bg-platform-contrast text-platform-text border border-platform-accent hover:bg-platform-accent/10 font-normal px-6 py-3 rounded-md"
      }
      disabled={isSubmitting}
      role="radio"
      aria-checked={politicalAlignmentChoice === value}
    >
      {politicalAlignmentChoice === value && <Check className="h-4 w-4" />} {/* Checkmark icon */}
      {label}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4" data-testid="onboarding-form"> {/* Increased space-y */}
      <FormField htmlFor="username" label="Create a Username">
        <Input
          id="username"
          type="text"
          placeholder="Your display name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      <AddressInput 
        value={zipCode}
        onChange={(e) => setZipCode(e.target.value)}
      />
      <FormField htmlFor="birthYear" label="Birth Year">
        <Input
          id="birthYear"
          type="text"
          placeholder="YYYY (e.g., 1990)"
          value={birthYear}
          onChange={(e) => {
            const value = e.target.value;
            // Only allow digits and limit to 4 characters
            if (/^\d{0,4}$/.test(value)) {
              setBirthYear(value);
            }
          }}
          maxLength={4}
          required
          className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal"
          disabled={isSubmitting}
        />
      </FormField>
      {isZipLookupLoading && (
        <p className="text-sm text-platform-text/70 font-normal">Looking up location...</p>
      )}
      {(city || state || congressionalDistrict) && !isZipLookupLoading && (
        <div className="text-sm text-platform-text/80 font-normal bg-platform-contrast p-4 rounded-md border border-platform-accent/50"> {/* Increased padding */}
          <p>Detected Location:</p>
          {city && state && <p className="font-semibold">{city}, {state}</p>}
          {congressionalDistrict && <p>Congressional District: {congressionalDistrict}</p>}
          {metroArea && <p>Metro Area: {metroArea}</p>}
        </div>
      )}
      {/* Political Alignment Section - Manual Labeling for Accessibility */}
      <div>
        <Label htmlFor="political-alignment-buttons" id="political-alignment-label" className="font-medium text-platform-text">
          How do you feel politically?
        </Label>
        <div 
          role="radiogroup" 
          aria-labelledby="political-alignment-label" 
          className="flex space-x-4 sm:space-x-6 justify-center mt-4" /* Increased space-x and mt */
        >
          <PoliticalAlignmentButton label="Left" value="Left" colorClass="bg-political-left hover:bg-political-left/90" />
          <PoliticalAlignmentButton label="Center" value="Center" colorClass="bg-political-center hover:bg-political-center/90" />
          <PoliticalAlignmentButton label="Right" value="Right" colorClass="bg-political-right hover:bg-political-right/90" />
        </div>
      </div>

      {politicalAlignmentChoice && (
        <FormField htmlFor="specific-party" label="Select your specific preference">
          <Select 
            key={politicalAlignmentChoice} // Keep key tied to alignment choice to reset options
            value={specificPartyPreference} 
            onValueChange={(value) => {
              if (value) { 
                setSpecificPartyPreference(value);
              } else {
                console.log('Select onValueChange triggered with empty value, ignoring.');
              }
            }}

          >
            <SelectTrigger 
              className="bg-platform-contrast text-platform-text border-platform-accent font-normal"
              data-testid="political-select" // Added data-testid
            >
              <SelectValue placeholder="Select a party" />
            </SelectTrigger>
            <SelectContent 
              className="bg-platform-contrast text-platform-text border-platform-accent font-normal z-[9999]" 
              data-testid="political-select-content" // Added data-testid
            >
              {PARTY_OPTIONS[politicalAlignmentChoice].map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}

      {error && <p className="text-sm text-red-500 font-normal">{error}</p>}
      <Button type="submit" variant="platform-primary" className="w-full px-6 py-3 text-sm sm:text-base" disabled={isSubmitting || isZipLookupLoading || !userId}>
        {isSubmitting ? 'Saving Profile...' : 'Complete Profile'}
      </Button>
    </form>
  );
};

export default OnboardingForm;