import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const SimpleHome = () => (
  <div className="min-h-screen bg-maphera-bg p-6">
    <h1 className="text-3xl font-roboto font-bold text-maphera-blue mb-4">
      🗺️ Maphera - Step 2 Test
    </h1>
    <p className="text-gray-700 font-open-sans">
      Testing React Router and React Query...
    </p>
    <div className="mt-6 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Status:</h2>
      <ul className="space-y-2">
        <li className="text-green-600">✅ React rendering</li>
        <li className="text-green-600">✅ Tailwind CSS working</li>
        <li className="text-green-600">✅ React Router working</li>
        <li className="text-green-600">✅ React Query working</li>
      </ul>
    </div>
  </div>
);

const App = () => {
  console.log('Step 2: Adding React Router and React Query');
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<SimpleHome />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
