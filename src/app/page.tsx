
"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import { FileUploadForm } from "@/components/geolens/file-upload-form";
// import { MapView } from "@/components/geolens/map-view"; // Replaced with dynamic import
import { ReportDisplay } from "@/components/geolens/report-display";
import {
  generateBiasReport,
  type GenerateBiasReportInput,
  type GenerateBiasReportOutput,
} from "@/ai/flows/generate-bias-report";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Globe, FileText, BarChartBig, UploadCloud, Loader2 } from "lucide-react";

const MapView = dynamic(
  () => import('@/components/geolens/map-view').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] w-full bg-muted rounded-lg shadow flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    ),
  }
);

export default function GeoLensPage() {
  const [report, setReport] = useState<GenerateBiasReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [showAnalysisSection, setShowAnalysisSection] = useState(false);
  const [showMapView, setShowMapView] = useState(false);

  const handleFormSubmit = async (data: GenerateBiasReportInput) => {
    setIsLoading(true);
    setError(null);
    setReport(null); // Clear previous report
    setShowAnalysisSection(true); // Show map and report sections

    try {
      const result = await generateBiasReport(data);
      setReport(result);
      setShowMapView(true); // Set to true after data is successfully processed
      toast({
        title: "Report Generated Successfully",
        description: "The bias report for your dataset is ready.",
      });
    } catch (e) {
      console.error("Error generating report:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error Generating Report",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-8 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Globe className="w-10 h-10 text-primary" />
            <h1 className="text-5xl font-bold text-primary">GeoLens</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Unveiling Insights, Promoting Fairness in Geospatial Data
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 space-y-12">
        <section id="upload-data">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/50 border-b">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-6 h-6 text-primary" />
                <CardTitle className="text-2xl">Upload Your Geospatial Data</CardTitle>
              </div>
              <CardDescription>
                Submit your GeoJSON or CSV file along with a brief description to begin the bias analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <FileUploadForm
                onFormSubmit={handleFormSubmit}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </section>

        {showAnalysisSection && (
          <>
            <Separator />
            <section id="analysis-dashboard" className="space-y-12">
              <h2 className="text-3xl font-semibold text-center text-primary flex items-center justify-center gap-2">
                <BarChartBig className="w-8 h-8" />
                Data Analysis & Bias Report
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="lg:sticky lg:top-8">
                  <Card className="shadow-lg">
                    <CardHeader>
                       <div className="flex items-center gap-3">
                        <Globe className="w-6 h-6 text-accent" />
                        <CardTitle className="text-xl">Geospatial Overview</CardTitle>
                      </div>
                      <CardDescription>An interactive map displaying conservation zones from your data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {showMapView && <MapView />}
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <Card className="shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-accent" />
                        <CardTitle className="text-xl">Bias Report Details</CardTitle>
                      </div>
                      <CardDescription>Generated analysis based on your uploaded dataset.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[200px]"> {/* Ensure content area has some height */}
                      {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full p-8">
                           <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                           <p className="text-lg text-muted-foreground">Generating your report, please wait...</p>
                        </div>
                      )}
                      {error && !isLoading && (
                        <Alert variant="destructive" className="my-4">
                          <AlertTitle>Analysis Failed</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      {report && !isLoading && <ReportDisplay report={report} />}
                      {!report && !isLoading && !error && (
                        <div className="text-center p-8 text-muted-foreground">
                          <p>Your generated bias report will appear here once the analysis is complete.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="py-8 mt-12 border-t border-border bg-card">
        <div className="container mx-auto px-4 md:px-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GeoLens. All rights reserved.</p>
          <p>Promoting fairness in geospatial data analysis.</p>
        </div>
      </footer>
    </div>
  );
}
