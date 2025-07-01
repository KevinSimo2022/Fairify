import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import 'leaflet.heat';

// Add CSS for animations
const mapStyles = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = mapStyles;
  document.head.appendChild(styleElement);
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DataPoint {
  id: string;
  lat: number;
  lng: number;
  value?: number;
  bias?: number;
  category?: string;
  coverageBias?: number; // Added coverageBias
}

interface LayerState {
  dataDensity: boolean;
  coverageGaps: boolean;
  biasIndicators: boolean;
  dataPoints: boolean;
  clusterMarkers: boolean;
  outliers: boolean;
}

interface InteractiveMapProps {
  dataPoints: DataPoint[];
  layers: LayerState;
  selectedDataset?: {
    id: string;
    name: string;
    analysisResults?: any;
  };
  onPointClick?: (point: DataPoint) => void;
}

// Custom hook to handle map updates
const MapUpdater: React.FC<{ dataPoints: DataPoint[]; layers: LayerState }> = ({ dataPoints, layers }) => {
  const map = useMap();

  useEffect(() => {
    if (dataPoints.length > 0) {
      // Create bounds from data points
      const group = new L.FeatureGroup(
        dataPoints.map(point => L.marker([point.lat, point.lng]))
      );
      
      // Fit map to show all data points
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }
  }, [dataPoints, map]);

  // Handle heatmap layer
  useEffect(() => {
    let heatmapLayer: any = null;

    if (layers.dataDensity && dataPoints.length > 0) {
      // Create heatmap data
      const heatData = dataPoints.map(point => [
        point.lat, 
        point.lng, 
        (point.value || 50) / 100 // Normalize intensity
      ]);

      // @ts-ignore
      heatmapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: 'blue',
          0.2: 'cyan',
          0.4: 'lime',
          0.6: 'yellow',
          0.8: 'orange',
          1.0: 'red'
        }
      }).addTo(map);
    }

    return () => {
      if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
      }
    };
  }, [layers.dataDensity, dataPoints, map]);

  return null;
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  dataPoints,
  layers,
  selectedDataset,
  onPointClick
}) => {
  const mapRef = useRef<L.Map>(null);

  const displayDataPoints = dataPoints; // Always use dataPoints prop

  // Color function based on coverage bias
  const getColorByCoverageBias = (coverageBias: number = 1) => {
    if (coverageBias < 0.8) return '#ef4444'; // under-covered (red)
    if (coverageBias < 1.2) return '#10b981'; // well-covered (green)
    return '#3b82f6'; // over-covered (blue)
  };

  // Size function based on value
  const getSizeByValue = (value: number = 50) => {
    return Math.max(5, Math.min(20, value / 5));
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer
        ref={mapRef}
        center={[40.7128, -74.0060]} // Default to NYC
        zoom={10}
        className="w-full h-full rounded-lg"
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater dataPoints={displayDataPoints} layers={layers} />
        
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Data Points Layer */}
        {layers.dataPoints && displayDataPoints.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={getSizeByValue(point.value)}
            pathOptions={{
              fillColor: getColorByCoverageBias(point.coverageBias),
              color: '#fff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.7
            }}
            eventHandlers={{
              click: () => onPointClick?.(point)
            }}
          >
            <Popup>
              <div className="text-sm">
                <h3 className="font-semibold mb-1">Data Point {point.id}</h3>
                <p><strong>Value:</strong> {point.value || 'N/A'}</p>
                <p><strong>Coverage Bias:</strong> {point.coverageBias !== undefined ? point.coverageBias.toFixed(2) : 'N/A'}</p>
                <p><strong>Category:</strong> {point.category || 'Unknown'}</p>
                <p><strong>Location:</strong> {point.lat.toFixed(4)}, {point.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Bias Indicators Layer */}
        {layers.biasIndicators && displayDataPoints
          .filter(point => (point.bias || 0) > 0.5)
          .map((point) => (
            <Marker
              key={`bias-${point.id}`}
              position={[point.lat, point.lng]}
              icon={L.divIcon({
                className: 'bias-indicator',
                html: `<div style="
                  width: 20px; 
                  height: 20px; 
                  background-color: #ef4444; 
                  border: 2px solid white; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  color: white; 
                  font-size: 12px; 
                  font-weight: bold;
                ">!</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-red-600 mb-1">High Bias Area</h3>
                  <p><strong>Bias Score:</strong> {point.bias?.toFixed(2)}</p>
                  <p className="text-red-600 text-xs mt-1">Requires attention</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Coverage Gaps Indicators */}
        {layers.coverageGaps && (
          <>
            {/* Mock coverage gap areas */}
            <CircleMarker
              center={[40.6900, -74.0200]}
              radius={15}
              pathOptions={{
                fillColor: '#6b7280',
                color: '#374151',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-gray-600 mb-1">Coverage Gap</h3>
                  <p>This area has insufficient data coverage</p>
                </div>
              </Popup>
            </CircleMarker>
            
            <CircleMarker
              center={[40.7200, -73.9500]}
              radius={12}
              pathOptions={{
                fillColor: '#6b7280',
                color: '#374151',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
              }}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-gray-600 mb-1">Coverage Gap</h3>
                  <p>This area has insufficient data coverage</p>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Cluster Markers Layer */}
        {layers.clusterMarkers && displayDataPoints.length > 0 && (
          <>
            {/* Generate clusters based on data point density */}
            {(() => {
              // Simple clustering algorithm - group nearby points
              const clusters: { center: [number, number]; count: number; points: DataPoint[] }[] = [];
              const processedPoints = new Set<string>();
              
              displayDataPoints.forEach(point => {
                if (processedPoints.has(point.id)) return;
                
                // Find nearby points within 0.01 degrees (~1km)
                const clusterPoints = displayDataPoints.filter(p => {
                  const distance = Math.sqrt(
                    Math.pow(p.lat - point.lat, 2) + Math.pow(p.lng - point.lng, 2)
                  );
                  return distance <= 0.01 && !processedPoints.has(p.id);
                });
                
                if (clusterPoints.length >= 3) {
                  // Mark points as processed
                  clusterPoints.forEach(p => processedPoints.add(p.id));
                  
                  // Calculate cluster center
                  const centerLat = clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length;
                  const centerLng = clusterPoints.reduce((sum, p) => sum + p.lng, 0) / clusterPoints.length;
                  
                  clusters.push({
                    center: [centerLat, centerLng],
                    count: clusterPoints.length,
                    points: clusterPoints
                  });
                }
              });

              return clusters.map((cluster, index) => (
                <Marker
                  key={`cluster-${index}`}
                  position={cluster.center}
                  icon={L.divIcon({
                    className: 'cluster-marker',
                    html: `<div style="
                      width: ${Math.min(40, 20 + cluster.count * 2)}px; 
                      height: ${Math.min(40, 20 + cluster.count * 2)}px; 
                      background-color: #3b82f6; 
                      border: 3px solid white; 
                      border-radius: 50%; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      color: white; 
                      font-size: 12px; 
                      font-weight: bold;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">${cluster.count}</div>`,
                    iconSize: [Math.min(40, 20 + cluster.count * 2), Math.min(40, 20 + cluster.count * 2)],
                    iconAnchor: [Math.min(20, 10 + cluster.count), Math.min(20, 10 + cluster.count)]
                  })}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-semibold text-blue-600 mb-1">Data Cluster</h3>
                      <p><strong>Data Points:</strong> {cluster.count}</p>
                      <p><strong>Avg Value:</strong> {(cluster.points.reduce((sum, p) => sum + (p.value || 0), 0) / cluster.count).toFixed(1)}</p>
                      <p><strong>Avg Bias:</strong> {(cluster.points.reduce((sum, p) => sum + (p.bias || 0), 0) / cluster.count).toFixed(2)}</p>
                      <p className="text-blue-600 text-xs mt-1">High density area</p>
                    </div>
                  </Popup>
                </Marker>
              ));
            })()}
          </>
        )}

        {/* Outliers Layer */}
        {layers.outliers && displayDataPoints.length > 0 && (
          <>
            {(() => {
              // Identify outliers based on value and bias scores
              const avgValue = displayDataPoints.reduce((sum, p) => sum + (p.value || 0), 0) / displayDataPoints.length;
              const avgBias = displayDataPoints.reduce((sum, p) => sum + (p.bias || 0), 0) / displayDataPoints.length;
              
              // Calculate standard deviations
              const valueStdDev = Math.sqrt(
                displayDataPoints.reduce((sum, p) => sum + Math.pow((p.value || 0) - avgValue, 2), 0) / displayDataPoints.length
              );
              const biasStdDev = Math.sqrt(
                displayDataPoints.reduce((sum, p) => sum + Math.pow((p.bias || 0) - avgBias, 2), 0) / displayDataPoints.length
              );
              
              // Find outliers (points that are > 2 standard deviations from mean)
              const outliers = displayDataPoints.filter(point => {
                const valueOutlier = Math.abs((point.value || 0) - avgValue) > 2 * valueStdDev;
                const biasOutlier = Math.abs((point.bias || 0) - avgBias) > 2 * biasStdDev;
                return valueOutlier || biasOutlier;
              });

              return outliers.map((point) => (
                <Marker
                  key={`outlier-${point.id}`}
                  position={[point.lat, point.lng]}
                  icon={L.divIcon({
                    className: 'outlier-marker',
                    html: `<div style="
                      width: 16px; 
                      height: 16px; 
                      background-color: #f59e0b; 
                      border: 2px solid white; 
                      border-radius: 50%; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      color: white; 
                      font-size: 10px; 
                      font-weight: bold;
                      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                      animation: pulse 2s infinite;
                    ">⚠</div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  })}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-semibold text-amber-600 mb-1">Statistical Outlier</h3>
                      <p><strong>Value:</strong> {point.value?.toFixed(1) || 'N/A'}</p>
                      <p><strong>Bias Score:</strong> {point.bias?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Category:</strong> {point.category || 'Unknown'}</p>
                      <p className="text-amber-600 text-xs mt-1">
                        {Math.abs((point.value || 0) - avgValue) > 2 * valueStdDev ? 'Value outlier' : ''}
                        {Math.abs((point.bias || 0) - avgBias) > 2 * biasStdDev ? ' Bias outlier' : ''}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ));
            })()}
          </>
        )}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[90]">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-1 text-xs">
          {layers.dataPoints && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                <span>Low Bias (≤0.3)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full border border-white"></div>
                <span>Medium Bias (0.3-0.6)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                <span>High Bias ({'>'}0.6)</span>
              </div>
            </>
          )}
          {layers.biasIndicators && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-white flex items-center justify-center text-white text-xs">!</div>
              <span>Bias Alert</span>
            </div>
          )}
          {layers.coverageGaps && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full border border-white opacity-60"></div>
              <span>Coverage Gap</span>
            </div>
          )}
          {layers.clusterMarkers && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border border-white flex items-center justify-center text-white text-xs">3</div>
              <span>Data Clusters</span>
            </div>
          )}
          {layers.outliers && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full border border-white flex items-center justify-center text-white text-xs">⚠</div>
              <span>Statistical Outliers</span>
            </div>
          )}
          {layers.clusterMarkers && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
              <span>Data Cluster</span>
            </div>
          )}
          {layers.outliers && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full border border-white"></div>
              <span>Statistical Outlier</span>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Info */}
      {selectedDataset && (
        <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[90] max-w-xs">
          <h4 className="font-semibold text-sm mb-1">{selectedDataset.name}</h4>
          <div className="text-xs text-gray-600">
            <p>Data Points: {displayDataPoints.length}</p>
            {selectedDataset.analysisResults && (
              <>
                <p>Coverage: {selectedDataset.analysisResults.coverage?.coveragePercentage?.toFixed(1) || 'N/A'}%</p>
                <p>Avg Bias: {selectedDataset.analysisResults.bias?.biasScore?.toFixed(2) || 'N/A'}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
