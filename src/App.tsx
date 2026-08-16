import { useEffect, Suspense, lazy } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Disable refetching when tab is hidden to save resources
focusManager.setEventListener((handleFocus) => {
  const handleVisibilityChange = () => {
    handleFocus(document.visibilityState === "visible");
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
});

const App = () => {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Toast notifications for user feedback */}
      <Toaster />
      <Sonner />
      
      {/* Cookie consent banner (gates future ad script loading) */}
      <CookieConsentBanner />

      {/* Vercel Speed Insights - Tracks and reports Core Web Vitals and performance metrics */}
      {/* Automatically sends data to Vercel Analytics dashboard when deployed on Vercel */}
      <SpeedInsights />
      
      {/* Vercel Web Analytics - Tracks page views, visitor data, and user engagement */}
      {/* Sends analytics data to Vercel dashboard for insights on traffic and user behavior */}
      <Analytics />
      
      <BrowserRouter>
        <Suspense fallback={<LoadingSkeleton />}>
          <ErrorBoundary name="app">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/privacy" element={<Privacy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
