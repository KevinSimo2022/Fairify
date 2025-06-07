
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Map } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-maphera-blue/5 to-maphera-green/5">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-maphera-blue to-maphera-green rounded-lg flex items-center justify-center mx-auto mb-6">
            <Map className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-roboto font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-roboto font-semibold text-gray-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 font-open-sans mb-8">
            Oops! The page you're looking for seems to have wandered off the map. 
            Let's get you back on track.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            asChild
            className="w-full bg-maphera-blue hover:bg-blue-600"
          >
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Link>
          </Button>
          
          <Button 
            asChild
            variant="outline" 
            className="w-full border-maphera-green text-maphera-green hover:bg-maphera-green hover:text-white"
          >
            <Link to="/upload">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start Analysis
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500 font-open-sans">
          <p>
            If you believe this is an error, please{" "}
            <a href="mailto:support@maphera.com" className="text-maphera-blue hover:underline">
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
