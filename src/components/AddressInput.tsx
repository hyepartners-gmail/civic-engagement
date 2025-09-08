import React from 'react';
import { Input } from './ui/input';
import FormField from './FormField'; // Import FormField

interface AddressInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AddressInput: React.FC<AddressInputProps> = ({ value, onChange }) => {
  return (
    <FormField 
      htmlFor="zipCode" 
      label="Zip Code" 
      description="Your zip code helps us connect you with relevant local topics."
    >
      <Input 
        id="zipCode" 
        placeholder="Enter your 5-digit zip code" 
        value={value}
        onChange={onChange}
        required // Mark as required for signup flow
        className="bg-platform-contrast border-platform-accent text-platform-text placeholder:text-platform-text/70 font-normal" 
      />
    </FormField>
  );
};

export default AddressInput;