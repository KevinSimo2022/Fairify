
"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet"; // Removed Popup as it's used in onEachFeature
import type { LatLngExpression, Layer } from "leaflet"; // Removed GeoJSON as LeafletGeoJSON as it's not directly used
import "leaflet/dist/leaflet.css";
import L from 'leaflet'; 

interface ConservationZoneProperties {
  Zone_Name: string;
  Region: string;
  Observation_Count: number;
}

type ConservationZoneFeature = Feature<Point, ConservationZoneProperties>;
type ConservationZoneFeatureCollection = FeatureCollection<Point, ConservationZoneProperties>;

const Legend = () => (
  <div className="absolute bottom-4 right-4 bg-card p-3 rounded-md shadow-lg z-[1000] border border-border">
    <h4 className="text-sm font-semibold mb-2 text-card-foreground">Observation Count Legend</h4>
    <div className="space-y-1">
      <div className="flex items-center">
        <span className="inline-block w-4 h-4 mr-2 rounded-full bg-red-500"></span>
        <span className="text-xs text-muted-foreground">Low (&lt;20)</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-4 h-4 mr-2 rounded-full bg-yellow-500"></span>
        <span className="text-xs text-muted-foreground">Medium (20-49)</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-4 h-4 mr-2 rounded-full bg-green-500"></span>
        <span className="text-xs text-muted-foreground">High (50+)</span>
      </div>
    </div>
  </div>
);

export function MapView() {
  const [geoData, setGeoData] = useState<ConservationZoneFeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const [mapReady, setMapReady] = useState(false); // Removed mapReady state

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/data/biased_conservation_dataset.geojson");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: ConservationZoneFeatureCollection = await response.json();
        setGeoData(data);
      } catch (e) {
        console.error("Failed to load GeoJSON data:", e);
        setError(e instanceof Error ? e.message : "Unknown error loading map data");
      }
    };
    fetchData();
  }, []);

  const getColor = (observationCount: number) => {
    if (observationCount >= 50) return "green"; 
    if (observationCount >= 20) return "yellow"; 
    return "red"; 
  };

  const pointToLayer = (feature: ConservationZoneFeature, latlng: LatLngExpression): Layer => {
    const { Observation_Count } = feature.properties;
    return L.circleMarker(latlng, {
      radius: 8,
      fillColor: getColor(Observation_Count),
      color: "#000", // border color for the circle
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    });
  };

  const onEachFeature = (feature: ConservationZoneFeature, layer: Layer) => {
    const { Zone_Name, Region, Observation_Count } = feature.properties;
    const popupContent = `
      <div class="p-1">
        <h3 class="font-semibold text-base mb-1">${Zone_Name}</h3>
        <p class="text-sm"><strong>Region:</strong> ${Region}</p>
        <p class="text-sm"><strong>Observations:</strong> ${Observation_Count}</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  };
  
  // Removed !mapReady check
  if (error) {
    return (
      <div className="aspect-[16/9] w-full bg-destructive/10 text-destructive rounded-lg shadow flex items-center justify-center p-4">
        <p>Error loading map data: {error}</p>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="aspect-[16/9] w-full bg-muted rounded-lg shadow flex items-center justify-center">
        <p className="text-muted-foreground">Loading geospatial data...</p>
      </div>
    );
  }
  
  const defaultCenter: LatLngExpression = [40.758896, -73.985130]; 
  const center = geoData.features.length > 0 && geoData.features[0].geometry?.type === 'Point'
    ? [geoData.features[0].geometry.coordinates[1], geoData.features[0].geometry.coordinates[0]] as LatLngExpression
    : defaultCenter;

  return (
    <div className="relative aspect-[16/9] w-full bg-muted rounded-lg overflow-hidden shadow">
      <MapContainer
        center={center}
        zoom={7} // Adjusted default zoom
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0" 
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoData && ( // Ensure geoData is available before rendering GeoJSON
          <GeoJSON
            key={JSON.stringify(geoData)} 
            data={geoData}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
      <Legend />
    </div>
  );
}
