
"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MapViewProps {
  // In a real scenario, this might take geoData or coordinates
  // For now, it's just a placeholder
}

export function MapView({}: MapViewProps) {
  return (
    <div className="aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden shadow">
      <Image
        src="https://placehold.co/800x450.png"
        alt="Placeholder map view"
        width={800}
        height={450}
        className="object-cover w-full h-full"
        data-ai-hint="map data"
      />
    </div>
  );
}
