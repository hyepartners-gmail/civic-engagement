import React from 'react';
import MainLayout from './MainLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout>
      {/* Budget-specific sub-navigation or layout elements could go here in the future */}
      {children}
    </MainLayout>
  );
}