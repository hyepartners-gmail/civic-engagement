import React from 'react';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  htmlFor: string;
  label: string;
  description?: string;
  children: React.ReactNode; // This will be the Input or Textarea component
}

const FormField: React.FC<FormFieldProps> = ({ 
  htmlFor, 
  label, 
  description, 
  children, 
  className, 
  ...props 
}) => {
  // Create a unique ID for the label itself, derived from htmlFor
  const labelId = `${htmlFor}-label`;

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Label htmlFor={htmlFor} id={labelId} className="font-medium text-platform-text">{label}</Label>
      {children}
      {description && <p className="text-xs text-platform-text/70 font-normal">{description}</p>}
    </div>
  );
};

export default FormField;