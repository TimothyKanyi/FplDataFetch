import { memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pulseVariants } from "@/lib/animations";

// Tab skeleton that matches the exact layout
const TabSkeleton = memo(() => (
  <div className="grid w-full grid-cols-5 h-12 gap-1 p-1">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-full rounded-md" />
    ))}
  </div>
));

// Storylines skeleton
const StorylinesSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="border-l-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

// Table skeleton that matches standings layout
const StandingsSkeleton = memo(() => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-60" />
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {/* Table header */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-20" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-2">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-16" />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));

// Stats cards skeleton
const StatsSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

// Main loading component
interface EnhancedSkeletonProps {
  type?: "full" | "storylines" | "standings" | "stats";
}

export const EnhancedSkeleton = memo(({ type = "full" }: EnhancedSkeletonProps) => {
  if (type === "storylines") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <StorylinesSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (type === "standings") {
    return <StandingsSkeleton />;
  }

  if (type === "stats") {
    return (
      <div className="space-y-6">
        <StatsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Full loading state
  return (
    <div className="space-y-6">
      {/* Storylines */}
      <motion.div
        variants={pulseVariants}
        initial="initial"
        animate="animate"
      >
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <StorylinesSkeleton />
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <TabSkeleton />

      {/* Standings */}
      <StandingsSkeleton />

      {/* Additional content hint */}
      <div className="text-center py-8">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-muted-foreground text-sm"
        >
          Loading league data...
        </motion.div>
      </div>
    </div>
  );
});
