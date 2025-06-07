import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const App = () => {
  console.log('Step 1: Basic app with UI components');
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-maphera-bg p-6">
        <h1 className="text-3xl font-roboto font-bold text-maphera-blue mb-4">
          🗺️ Maphera - Step 1 Test
        </h1>
        <p className="text-gray-700 font-open-sans">
          Testing basic UI components and Tailwind CSS...
        </p>
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Status:</h2>
          <ul className="space-y-2">
            <li className="text-green-600">✅ React rendering</li>
            <li className="text-green-600">✅ Tailwind CSS working</li>
            <li className="text-green-600">✅ Custom colors (maphera-blue, maphera-bg)</li>
            <li className="text-green-600">✅ UI components (TooltipProvider)</li>
          </ul>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
};

export default App;
