"use client";
import React from 'react';
import { UiProvider } from './UiContext';
import { LabProvider } from './LabContext';
import { TaxProvider } from './TaxContext';
import { YouProvider } from './YouContext';
import { CrosshairProvider } from './CrosshairContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UiProvider>
      <LabProvider>
        <TaxProvider>
          <YouProvider>
            <CrosshairProvider>
              {children}
            </CrosshairProvider>
          </YouProvider>
        </TaxProvider>
      </LabProvider>
    </UiProvider>
  );
}