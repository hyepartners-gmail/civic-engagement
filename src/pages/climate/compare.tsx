"use client";

import { Suspense } from "react";
import StoryLayout from "@/components/shared/StoryLayout";
import { STORIES_PAGE2 } from "@/lib/climate/stories.config";


export default function ComparePage() {


  return (
    <StoryLayout
      title="Heat, Energy & Health"
      description="Analyzing the relationships between rising temperatures, energy consumption, and health risks."
      showCity
      showBasePeriod
      showFiscalYear
    >
      <div className="space-y-24">
        {STORIES_PAGE2.map((s) => (
          <section id={s.id} key={s.id} className="scroll-mt-24">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-platform-contrast" />}>
              <s.component />
            </Suspense>
          </section>
        ))}
      </div>
    </StoryLayout>
  );
}