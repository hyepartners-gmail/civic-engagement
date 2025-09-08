"use client";

import { Suspense } from "react";
import Link from "next/link";
import StoryLayout from "@/components/shared/StoryLayout";
import { STORIES_PAGE1, STORIES_PAGE2, STORIES_PAGE3 } from "@/lib/climate/stories.config";
import NarrativeSwitcher from "@/components/ui/NarrativeSwitcher";
import { useUrlState } from "@/hooks/useUrlState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Zap, TrendingUp, MapPin, AlertTriangle } from "lucide-react";

// Force dynamic rendering since we use client-side state
export const dynamic = 'force-dynamic';

// Combine all stories into one array for the switcher
const ALL_STORIES = [...STORIES_PAGE1, ...STORIES_PAGE2, ...STORIES_PAGE3];

// Special climate pages
const SPECIAL_PAGES = [
  { 
    id: 'energy', 
    title: 'Energy Explorer', 
    description: 'Interactive map and analysis of U.S. power plants', 
    href: '/climate/energy',
    icon: Zap
  },
  { 
    id: 'economy', 
    title: 'Climate & Economy', 
    description: 'Analyzing economic impacts of climate change', 
    href: '/climate/economy',
    icon: TrendingUp
  },
  { 
    id: 'city', 
    title: 'City Explorer', 
    description: 'City-level climate data and projections', 
    href: '/climate/seattle',
    icon: MapPin
  },
  { 
    id: 'risk', 
    title: 'Risk Assessment', 
    description: 'Climate hazard and vulnerability mapping', 
    href: '/climate/risk',
    icon: AlertTriangle
  }
];

export default function ClimatePage() {
  // Get the selected story ID from URL, default to the first story
  const [storyId, setStoryId] = useUrlState<string>('n', ALL_STORIES[0]?.id);
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'stories');
  
  // Find the selected story, default to the first one if not found
  const selectedStory = ALL_STORIES.find(story => story.id === storyId) || ALL_STORIES[0];

  return (
    <StoryLayout
      title="Climate Data Explorer"
      description="Explore the impacts of climate change through various data stories and interactive tools."
      showCity={false}
      showBasePeriod={false}
      showFiscalYear={false}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 grid grid-cols-2 w-full max-w-md mx-auto">
          <TabsTrigger value="stories">Data Stories</TabsTrigger>
          <TabsTrigger value="tools">Interactive Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stories" className="space-y-8">
          {/* Narrative Switcher */}
          <div className="mb-8 relative z-[500]">
            <NarrativeSwitcher 
              items={ALL_STORIES.map(story => ({ 
                id: story.id, 
                label: story.title, 
                description: story.blurb 
              }))} 
            />
          </div>
          
          {/* Render only the selected story */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-platform-contrast" />}>
            <selectedStory.component />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SPECIAL_PAGES.map((page) => (
              <Link key={page.id} href={page.href} className="block group">
                <Card className="h-full bg-platform-card-background group-hover:bg-platform-contrast/30 transition-colors duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-platform-accent/10 p-3 rounded-lg">
                        <page.icon className="h-6 w-6 text-platform-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-platform-text flex items-center gap-2">
                          {page.title}
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-platform-text/70 mt-1">{page.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </StoryLayout>
  );
}