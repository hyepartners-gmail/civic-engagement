import { useState, useEffect } from 'react';
import EmploymentClientPage from './EmploymentClientPage';
import MainLayout from '@/components/MainLayout';

export default function EmploymentPage() {
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [showError, setShowError] = useState(false);

  // Listen for error events from the EmploymentClientPage
  useEffect(() => {
    const handleError = () => {
      console.log('[EmploymentPage] Received employment-data-error event');
      setErrorOccurred(true);
      setShowError(true);
    };

    const handleSuccess = () => {
      console.log('[EmploymentPage] Received employment-data-success event');
      // If we had an error but now have success, hide the error banner
      if (showError) {
        console.log('[EmploymentPage] Hiding error banner after successful data load');
        setShowError(false);
      }
    };

    console.log('[EmploymentPage] Adding event listeners for employment-data-error and employment-data-success');
    window.addEventListener('employment-data-error', handleError);
    window.addEventListener('employment-data-success', handleSuccess);
    
    // Also log the current error state
    console.log('[EmploymentPage] Initial errorOccurred state:', errorOccurred);
    console.log('[EmploymentPage] Initial showError state:', showError);
    
    return () => {
      console.log('[EmploymentPage] Removing event listeners for employment-data-error and employment-data-success');
      window.removeEventListener('employment-data-error', handleError);
      window.removeEventListener('employment-data-success', handleSuccess);
    };
  }, [errorOccurred, showError]);

  // If we had an error but then the data loaded successfully, hide the error after a delay
  useEffect(() => {
    if (!errorOccurred && showError) {
      console.log('[EmploymentPage] Data loaded successfully after error, hiding error banner');
      const timer = setTimeout(() => {
        setShowError(false);
      }, 1000); // Hide after 1 second
      
      return () => clearTimeout(timer);
    }
  }, [errorOccurred, showError]);

  return (
    <MainLayout>
      {showError ? (
        <div className="container mx-auto p-4 md:p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-red-700 mb-2">Data Loading Issue</h2>
            <p className="text-red-600 mb-2">
              We're experiencing issues loading the complete employment dataset. Some data points may be missing or invalid.
            </p>
            <p className="text-gray-600 text-sm">
              We're displaying what we can, but the visualization may not include all available data.
              This is typically caused by NaN values in the dataset that represent periods where data wasn't collected.
            </p>
          </div>
        </div>
      ) : null}
      <EmploymentClientPage />
    </MainLayout>
  );
}