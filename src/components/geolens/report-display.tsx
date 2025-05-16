
"use client";

import type { GenerateBiasReportOutput } from "@/ai/flows/generate-bias-report";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ReportDisplayProps {
  report: GenerateBiasReportOutput;
}

export function ReportDisplay({ report }: ReportDisplayProps) {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Bias Report Summary</CardTitle>
          <CardDescription>
            Detailed analysis of potential biases in the provided geospatial dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Coverage Statistics</h3>
            <p className="text-muted-foreground">{report.coverageStatistics}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-1">Gini Coefficient</h3>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {report.giniCoefficient.toFixed(4)}
            </Badge>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-1">Fairness Metrics</h3>
            <p className="text-muted-foreground">{report.fairnessMetrics}</p>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold text-lg mb-1">Potential Biases</h3>
            <p className="text-muted-foreground">{report.potentialBiases}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
