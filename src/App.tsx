import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
      
      {/* Vercel Speed Insights - Tracks and reports Core Web Vitals and performance metrics */}
      {/* Automatically sends data to Vercel Analytics dashboard when deployed on Vercel */}
      <SpeedInsights />
      
      {/* Vercel Web Analytics - Tracks page views, visitor data, and user engagement */}
      {/* Sends analytics data to Vercel dashboard for insights on traffic and user behavior */}
      <Analytics />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
