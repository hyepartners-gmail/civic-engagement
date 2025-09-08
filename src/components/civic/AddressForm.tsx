import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import PlatformCard from '../PlatformCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { US_STATES, normalizeState } from '../../utils/civic-utils';

interface AddressFormProps {
  addressForm: {
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  };
  setAddressForm: React.Dispatch<React.SetStateAction<{
    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  }>>;
  handleAddressSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  userCity?: string;
  userState?: string;
  userZipCode?: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const AddressForm = React.memo<AddressFormProps>(({ 
  addressForm, 
  setAddressForm, 
  handleAddressSubmit, 
  loading, 
  userCity, 
  userState, 
  userZipCode 
}) => {
  // Ensure state value is always valid for the Select component
  const selectStateValue = useMemo(() => {
    return US_STATES.includes(addressForm.state) ? addressForm.state : "";
  }, [addressForm.state]);

  const handleStreet1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressForm(prev => ({ ...prev, street1: e.target.value }));
  }, [setAddressForm]);

  const handleStreet2Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressForm(prev => ({ ...prev, street2: e.target.value }));
  }, [setAddressForm]);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressForm(prev => ({ ...prev, city: e.target.value }));
  }, [setAddressForm]);

  const handleStateChange = useCallback((value: string) => {
    setAddressForm(prev => ({ ...prev, state: value }));
  }, [setAddressForm]);

  const handleZipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressForm(prev => ({ ...prev, zip: e.target.value }));
  }, [setAddressForm]);

  return (
    <motion.div {...fadeInUp}>
      <PlatformCard className="p-6 max-w-md mx-auto bg-platform-contrast border border-platform-accent/30">
        <h2 className="text-xl font-thin text-platform-text mb-4">Enter Your Address</h2>
        {(userCity || userState || userZipCode) && (
          <div className="bg-platform-accent/20 border border-platform-accent/40 p-3 rounded-lg mb-4">
            <p className="text-sm text-platform-text">
              📍 We've prefilled your city, state, and ZIP from your profile. Just add your street address to get started.
            </p>
          </div>
        )}
        <p className="text-sm text-platform-text/70 mb-6">
          <strong>Full street address required.</strong> ZIP code alone won't give you polling locations or ballot information. 
          Google's Civic API needs your exact address to find your specific precinct and ballot.
        </p>
        
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <Input
            placeholder="Street Address"
            value={addressForm.street1}
            onChange={handleStreet1Change}
            autoFocus={!!(userCity || userState || userZipCode)}
            className="bg-platform-background border-platform-accent/30 text-platform-text placeholder:text-platform-text/50 focus:border-platform-accent focus:ring-platform-accent/20"
            required
          />
          <Input
            placeholder="Apt, Suite, etc. (optional)"
            value={addressForm.street2}
            onChange={handleStreet2Change}
            className="bg-platform-background border-platform-accent/30 text-platform-text placeholder:text-platform-text/50 focus:border-platform-accent focus:ring-platform-accent/20"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="City"
              value={addressForm.city}
              onChange={handleCityChange}
              className="bg-platform-background border-platform-accent/30 text-platform-text placeholder:text-platform-text/50 focus:border-platform-accent focus:ring-platform-accent/20"
              required
            />
            <Select 
              value={selectStateValue}
              onValueChange={handleStateChange}
            >
              <SelectTrigger className="bg-platform-background border-platform-accent/30 text-platform-text focus:border-platform-accent focus:ring-platform-accent/20">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="bg-platform-contrast border-platform-accent/30">
                {US_STATES.map(state => (
                  <SelectItem key={state} value={state} className="text-platform-text hover:bg-platform-accent/20">{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="ZIP Code"
            value={addressForm.zip}
            onChange={handleZipChange}
            className="bg-platform-background border-platform-accent/30 text-platform-text placeholder:text-platform-text/50 focus:border-platform-accent focus:ring-platform-accent/20"
            required
          />
          
          <div className="pt-4">
            <Button type="submit" disabled={loading} variant="platform-primary" className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Get Civic Info
            </Button>
          </div>
        </form>
      </PlatformCard>
    </motion.div>
  );
});

AddressForm.displayName = 'AddressForm';

export default AddressForm;