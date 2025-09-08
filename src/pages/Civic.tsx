"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react'; // Removed Loader2
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import AddressForm from '../components/civic/AddressForm';
import ElectionHeader from '../components/civic/ElectionHeader';
import PollingInfo from '../components/civic/PollingInfo';
import VoterRegistration from '../components/civic/VoterRegistration';
import MailOnlyNotice from '../components/civic/MailOnlyNotice';
import BallotContests from '../components/civic/BallotContests';
import Officials from '../components/civic/Officials';
import ErrorState from '../components/civic/ErrorState';
import { 
  normalizeState, 
  getUserStateFromAddress, 
  isElectionRelevantToState 
} from '../utils/civic-utils';
import MainLayout from '../components/MainLayout';
import LoadingSpinner from '../components/LoadingSpinner'; // Import the new LoadingSpinner

// Animation variants
const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const CivicPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [civicData, setCivicData] = useState<any>(null);
  const [availableElections, setAvailableElections] = useState<any[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string | undefined>(undefined);
  const [showAllEarlyVoting, setShowAllEarlyVoting] = useState(false);
  const [showAllDropOff, setShowAllDropOff] = useState(false);
  const [earlyVotingSearch, setEarlyVotingSearch] = useState('');
  const [dropOffSearch, setDropOffSearch] = useState('');
  
  const isUserAuthenticated = status === 'authenticated';
  const userZipCode = (session?.user as any)?.zipCode;
  const userCity = (session?.user as any)?.city;
  const userState = (session?.user as any)?.state;
  const userViewedCivicPage = (session?.user as any)?.viewedCivicPage;

  // Address form state
  const [addressForm, setAddressForm] = useState(() => ({
    street1: '',
    street2: '',
    city: userCity || '',
    state: normalizeState(userState),
    zip: userZipCode || ''
  }));

  // Update form with user profile data when available
  useEffect(() => {
    if (userCity || userState || userZipCode) {
      setAddressForm(prev => ({
        ...prev,
        city: userCity || prev.city,
        state: normalizeState(userState) || prev.state,
        zip: userZipCode || prev.zip
      }));
    }
  }, [userCity, userState, userZipCode]);

  // Cache management
  const getCachedAddress = useCallback(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('civicAddress');
      if (cached) {
        try {
          const address = JSON.parse(cached);
          const addressParts = address.split(',');
          if (addressParts.length >= 3) {
            const streetPart = addressParts[0].trim();
            const hasStreetAddress = /\d+.*[a-zA-Z]|[a-zA-Z].*\d+|^[a-zA-Z]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)$/i.test(streetPart);
            if (hasStreetAddress) return address;
          }
          localStorage.removeItem('civicAddress');
        } catch (e) {
          localStorage.removeItem('civicAddress');
        }
      }
    }
    return null;
  }, []);

  const setCachedAddress = useCallback((address: string) => {
    if (typeof window !== 'undefined') {
      const addressParts = address.split(',');
      if (addressParts.length >= 3) {
        const streetPart = addressParts[0].trim();
        const hasStreetAddress = /\d+.*[a-zA-Z]|[a-zA-Z].*\d+|^[a-zA-Z]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)$/i.test(streetPart);
        if (hasStreetAddress) {
          localStorage.setItem('civicAddress', JSON.stringify(address));
        }
      }
    }
  }, []);

  // Fetch civic data
  const fetchCivicData = useCallback(async (address?: string, skipCache = false, electionId?: string) => {
    let queryAddress = address || getCachedAddress();
    if (!queryAddress) return;

    // Validate address has street component
    const addressParts = queryAddress.split(',');
    if (addressParts.length >= 3) {
      const streetPart = addressParts[0].trim();
      const hasStreetAddress = /\d+.*[a-zA-Z]|[a-zA-Z].*\d+|^[a-zA-Z]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)$/i.test(streetPart);
      if (!hasStreetAddress) {
        setError('Please provide a complete street address. City and ZIP code alone are not sufficient for civic information lookup.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/civic-info?address=${encodeURIComponent(queryAddress)}`;
      if (electionId) url += `&electionId=${electionId}`;
      if (skipCache) url += `&clearCache=true`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch civic information.');
      }
      
      const data = await response.json();
      setCivicData(data);
      setCachedAddress(queryAddress);
      
      // Reset search states
      setShowAllEarlyVoting(false);
      setShowAllDropOff(false);
      setEarlyVotingSearch('');
      setDropOffSearch('');
      
      // Filter elections by state
      if (data.raw?.elections && data.raw.elections.length > 1) {
        const userState = getUserStateFromAddress(queryAddress);
        const futureElections = data.raw.elections.filter((election: any) => {
          const electionDate = new Date(election.electionDay);
          const isFuture = electionDate >= new Date();
          const isRelevant = isElectionRelevantToState(election, userState);
          return isFuture && isRelevant;
        });
        setAvailableElections(futureElections);
        
        // Set the selected election ID to the current election if it's not already set
        // and if the current election is in the available elections
        if (!selectedElectionId && data.summary.election) {
          const currentElectionInList = futureElections.find((e: any) => e.id === data.summary.election.id);
          if (currentElectionInList) {
            setSelectedElectionId(data.summary.election.id);
          } else if (futureElections.length > 0) {
            // If current election is not in the list, default to the first available election
            setSelectedElectionId(futureElections[0].id);
          }
        }
      } else {
        setAvailableElections([]);
        // If there's only one election or no elections, clear the selected election ID
        if (data.summary.election) {
          setSelectedElectionId(data.summary.election.id);
        }
      }
      
      if (skipCache) {
        toast({
          title: "Information Updated",
          description: "Civic information has been refreshed successfully.",
        });
      }

    } catch (err: any) {
      console.error('Error fetching civic data:', err);
      if (err.message?.includes('quota') || err.message?.includes('temporarily unavailable')) {
        setError('Service temporarily unavailable due to API quota limits. Please try again in 10 minutes.');
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('No civic information found for this address. Please try a different address.');
      } else {
        setError(err.message || 'Failed to load civic information. Please try again later.');
      }
      
      toast({
        title: "Error",
        description: err.message || 'Failed to load civic information.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [getCachedAddress, setCachedAddress, toast]);

  // Handle address form submission
  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.street1 || !addressForm.city || !addressForm.state || !addressForm.zip) {
      toast({
        title: "Incomplete Address",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    const fullAddress = `${addressForm.street1}${addressForm.street2 ? ' ' + addressForm.street2 : ''}, ${addressForm.city}, ${addressForm.state} ${addressForm.zip}`;
    fetchCivicData(fullAddress);
  }, [addressForm, fetchCivicData, toast]);

  // Clear civic data and reset states
  const clearCivicData = useCallback(() => {
    setCivicData(null);
    setError(null);
    setAvailableElections([]);
    setSelectedElectionId(undefined);
    setShowAllEarlyVoting(false);
    setShowAllDropOff(false);
    setEarlyVotingSearch('');
    setDropOffSearch('');
    localStorage.removeItem('civicAddress');
  }, []);

  // Handle election change
  const handleElectionChange = useCallback((electionId: string) => {
    setSelectedElectionId(electionId);
    fetchCivicData(undefined, false, electionId);
  }, [fetchCivicData]);

  // Get the current selected election ID for the dropdown
  const getCurrentElectionId = useCallback(() => {
    if (selectedElectionId) {
      // Check if the selected election is still in the available elections
      const isStillAvailable = availableElections.find(e => e.id === selectedElectionId);
      if (isStillAvailable) {
        return selectedElectionId;
      }
    }
    
    // If no valid selected election, try to use the current election from civic data
    if (civicData?.summary?.election?.id) {
      const currentElectionInList = availableElections.find(e => e.id === civicData.summary.election.id);
      if (currentElectionInList) {
        return civicData.summary.election.id;
      }
    }
    
    // Fallback to the first available election
    return availableElections[0]?.id || '';
  }, [selectedElectionId, availableElections, civicData]);

  // Ensure we have a valid selected election when available elections change
  useEffect(() => {
    if (availableElections.length > 0) {
      const currentId = getCurrentElectionId();
      if (currentId && currentId !== selectedElectionId) {
        setSelectedElectionId(currentId);
      }
    }
  }, [availableElections, getCurrentElectionId, selectedElectionId]);

  // Initialize component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('civicAddress');
      if (cached) {
        try {
          const address = JSON.parse(cached);
          const addressParts = address.split(',');
          if (addressParts.length >= 3) {
            const streetPart = addressParts[0].trim();
            const hasStreetAddress = /\d+.*[a-zA-Z]|[a-zA-Z].*\d+|^[a-zA-Z]+\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|pl|place|way|pkwy|parkway)$/i.test(streetPart);
            if (!hasStreetAddress) {
              localStorage.removeItem('civicAddress');
            }
          } else {
            localStorage.removeItem('civicAddress');
          }
        } catch (e) {
          localStorage.removeItem('civicAddress');
        }
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;

    if (!isUserAuthenticated) {
      router.push('/auth');
      return;
    }

    // Award "Civic Explorer" badge on first visit
    if (!userViewedCivicPage && session?.user?.id) {
      fetch('/api/user-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'view_civic_page' }),
      }).catch(error => console.error('Error recording civic page view action:', error));
    }

    // Load data if we have cached address
    const cachedAddress = getCachedAddress();
    if (cachedAddress) {
      fetchCivicData();
    }
  }, [status, isUserAuthenticated, fetchCivicData, router, userViewedCivicPage, session?.user?.id, getCachedAddress]);

  // Loading state
  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <LoadingSpinner spinnerSize="lg" message="loading civic information" /> {/* Use the new spinner */}
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (!isUserAuthenticated) return null;

  return (
    <MainLayout>
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-thin text-platform-text">My Vote</h1>
        <div className="flex gap-3">
          {civicData && (
            <Button variant="platform-primary" onClick={clearCivicData}>
              Enter New Address
            </Button>
          )}
          <Button variant="platform-secondary" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Topics
          </Button>
        </div>
      </motion.div>

      {/* Content */}
      {error ? (
        <ErrorState 
          error={error}
          loading={loading}
          onRetry={() => fetchCivicData(undefined, true, selectedElectionId)}
          onChangeAddress={() => {
            setError(null);
            setCivicData(null);
          }}
        />
      ) : !civicData ? (
        <AddressForm 
          addressForm={addressForm}
          setAddressForm={setAddressForm}
          handleAddressSubmit={handleAddressSubmit}
          loading={loading}
          userCity={userCity}
          userState={userState}
          userZipCode={userZipCode}
        />
      ) : (
        <motion.div 
          className="space-y-6"
          variants={staggerChildren}
          initial="initial"
          animate="animate"
        >
          <ElectionHeader 
            civicData={civicData}
            availableElections={availableElections}
            selectedElectionId={selectedElectionId}
            loading={loading}
            getCachedAddress={getCachedAddress}
            onRefresh={() => fetchCivicData(undefined, true, selectedElectionId)}
            onChangeAddress={clearCivicData}
            onElectionChange={handleElectionChange}
            getCurrentElectionId={getCurrentElectionId}
          />

          <MailOnlyNotice civicData={civicData} />

          <BallotContests civicData={civicData} />

          <PollingInfo 
            civicData={civicData}
            earlyVotingSearch={earlyVotingSearch}
            setEarlyVotingSearch={setEarlyVotingSearch}
            showAllEarlyVoting={showAllEarlyVoting}
            setShowAllEarlyVoting={setShowAllEarlyVoting}
            dropOffSearch={dropOffSearch}
            setDropOffSearch={setDropOffSearch}
            showAllDropOff={showAllDropOff}
            setShowAllDropOff={setShowAllDropOff}
          />

          <VoterRegistration civicData={civicData} />

          <Officials civicData={civicData} />
        </motion.div>
      )}
    </MainLayout>
  );
};

export default CivicPage;