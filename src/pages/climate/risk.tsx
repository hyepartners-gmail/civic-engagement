"use client";

import { Suspense } from "react";
import StoryLayout from "@/components/shared/StoryLayout";
import { STORIES_PAGE3 } from "@/lib/climate/stories.config";


export default function RiskPage() {
  return (
    <StoryLayout
      title="Risk & Cost"
      description="Quantifying climate risk and its economic impacts across different regions."
      showCity
      showBasePeriod
    >
      <div className="space-y-24">
        {STORIES_PAGE3.map((s) => (
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