import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Upload from "@/pages/Upload";
import MapView from "@/pages/MapView";
import Dashboard from "@/pages/Dashboard";
import Results from "@/pages/Results";
import Settings from "@/pages/Settings";
import AdminPanel from "@/pages/AdminPanel";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/results" element={<Results />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
