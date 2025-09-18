import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Ship, Anchor, AlertTriangle, Users, Settings, Bell, Activity } from 'lucide-react';

// Mock data structures following the cookbook's protobuf schema
const mockVessels = [
  { mmsi: 123456789, lat: 25.7617, lon: -80.1918, sog: 12.5, cog: 45, heading: 47, name: "ATLANTIC PIONEER", type: "Oil Tanker", status: "Under way using engine" },
  { mmsi: 987654321, lat: 40.7128, lon: -74.0060, sog: 0.0, cog: 0, heading: 180, name: "LIBERTY STAR", type: "Oil Tanker", status: "At anchor" },
  { mmsi: 456789123, lat: 51.5074, lon: -0.1278, sog: 8.3, cog: 90, heading: 85, name: "OCEAN GLORY", type: "Oil Tanker", status: "Under way using engine" },
  { mmsi: 789123456, lat: 35.6762, lon: 139.6503, sog: 15.2, cog: 270, heading: 275, name: "PACIFIC DREAM", type: "Oil Tanker", status: "Under way using engine" },
  { mmsi: 321654987, lat: -33.8688, lon: 151.2093, sog: 0.0, cog: 0, heading: 45, name: "SOUTHERN CROSS", type: "Oil Tanker", status: "Moored" }
];

const mockAlerts = [
  { id: 1, mmsi: 123456789, type: "GEOFENCE_BREACH", message: "ATLANTIC PIONEER entered restricted zone", timestamp: Date.now() - 300000 },
  { id: 2, mmsi: 987654321, type: "ANCHORED_TOO_LONG", message: "LIBERTY STAR anchored for >24h", timestamp: Date.now() - 1800000 },
  { id: 3, mmsi: 456789123, type: "SPEED_ANOMALY", message: "OCEAN GLORY unusual speed pattern", timestamp: Date.now() - 600000 }
];

// Simple map component (represents MapLibre + Deck.gl functionality)
const TankerMap = ({ vessels, selectedVessel, onVesselSelect, viewBounds }) => {
  const mapRef = useRef(null);
  
  const getVesselIcon = (vessel) => {
    if (vessel.sog < 0.5) return '⚓';
    return '🚢';
  };

  const getVesselColor = (vessel) => {
    if (vessel.sog < 0.5) return '#ef4444'; // Red for stationary
    if (vessel.sog > 10) return '#22c55e'; // Green for fast
    return '#3b82f6'; // Blue for normal
  };

  return (
    <div 
      ref={mapRef}
      className="relative w-full h-full bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(120, 160, 255, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(120, 200, 255, 0.2) 0%, transparent 50%)
        `
      }}
    >
      {/* Grid overlay for coordinate reference */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-white/30" style={{ left: `${i * 5}%`, height: '100%' }} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-white/30" style={{ top: `${i * 8.33}%`, width: '100%' }} />
        ))}
      </div>

      {/* Vessels */}
      {vessels.map((vessel) => {
        // Simple projection (not geographically accurate, for demo)
        const x = ((vessel.lon + 180) / 360) * 100;
        const y = ((-vessel.lat + 90) / 180) * 100;
        
        return (
          <div
            key={vessel.mmsi}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 ${
              selectedVessel?.mmsi === vessel.mmsi ? 'scale-150 z-20' : 'z-10'
            }`}
            style={{ 
              left: `${x}%`, 
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${vessel.heading}deg)`
            }}
            onClick={() => onVesselSelect(vessel)}
          >
            <div className="relative">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white"
                style={{ backgroundColor: getVesselColor(vessel) }}
              >
                {getVesselIcon(vessel)}
              </div>
              {selectedVessel?.mmsi === vessel.mmsi && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                  {vessel.name}
                </div>
              )}
              {/* Speed vector */}
              {vessel.sog > 1 && (
                <div 
                  className="absolute w-px bg-yellow-400 origin-bottom"
                  style={{ 
                    height: `${vessel.sog * 2}px`,
                    left: '50%',
                    bottom: '12px',
                    transform: `translateX(-50%) rotate(${vessel.cog}deg)`
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="bg-black/50 text-white p-2 rounded hover:bg-black/70 transition-colors">
          <MapPin size={16} />
        </button>
        <button className="bg-black/50 text-white p-2 rounded hover:bg-black/70 transition-colors">
          +
        </button>
        <button className="bg-black/50 text-white p-2 rounded hover:bg-black/70 transition-colors">
          -
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded">
        <div className="text-sm font-bold mb-2">Vessel Status</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Anchored/Moored</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Under Way (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>High Speed (>10 knots)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// WebSocket connection mock (represents real-time updates)
const useWebSocketConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Simulate WebSocket connection
    const timer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    // Simulate periodic updates
    const updateInterval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(updateInterval);
    };
  }, []);

  return { connectionStatus, lastUpdate };
};

const TankerTrackerApp = () => {
  const [vessels, setVessels] = useState(mockVessels);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [activeTab, setActiveTab] = useState('map');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { connectionStatus, lastUpdate } = useWebSocketConnection();

  // Simulate real-time vessel movement
  useEffect(() => {
    const interval = setInterval(() => {
      setVessels(prev => prev.map(vessel => {
        if (vessel.sog > 0) {
          // Simple movement simulation
          const speedKnots = vessel.sog;
          const courseRad = (vessel.cog * Math.PI) / 180;
          const deltaLat = (speedKnots * Math.cos(courseRad)) / 3600; // Rough approximation
          const deltaLon = (speedKnots * Math.sin(courseRad)) / 3600;
          
          return {
            ...vessel,
            lat: vessel.lat + deltaLat,
            lon: vessel.lon + deltaLon
          };
        }
        return vessel;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleVesselSelect = useCallback((vessel) => {
    setSelectedVessel(vessel);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 bg-gray-800 border-r border-gray-700 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Ship className="text-blue-400" size={24} />
              <h1 className="text-xl font-bold">Tanker Tracker</h1>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <Activity size={16} className={getStatusColor(connectionStatus)} />
            {!sidebarCollapsed && (
              <div>
                <div className={`font-medium ${getStatusColor(connectionStatus)}`}>
                  {connectionStatus.toUpperCase()}
                </div>
                {lastUpdate && <div className="text-gray-400 text-xs">Last: {lastUpdate}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex gap-1">
              {['map', 'vessels', 'alerts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded text-sm capitalize transition-colors ${
                    activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'vessels' && (
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-gray-300 mb-3">Active Vessels ({vessels.length})</h3>
                {vessels.map((vessel) => (
                  <div
                    key={vessel.mmsi}
                    onClick={() => setSelectedVessel(vessel)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedVessel?.mmsi === vessel.mmsi ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{vessel.name}</div>
                    <div className="text-sm text-gray-300">MMSI: {vessel.mmsi}</div>
                    <div className="text-sm text-gray-400">
                      Speed: {vessel.sog} kts | Course: {vessel.cog}°
                    </div>
                    <div className="text-xs text-gray-500">{vessel.status}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-yellow-500" size={16} />
                  <h3 className="font-semibold text-gray-300">Active Alerts ({alerts.length})</h3>
                </div>
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-yellow-900/30 border border-yellow-600 rounded">
                    <div className="font-medium text-yellow-300">{alert.type.replace('_', ' ')}</div>
                    <div className="text-sm text-gray-300">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedVessel && activeTab === 'map' && (
              <div className="p-4">
                <h3 className="font-semibold text-gray-300 mb-3">Vessel Details</h3>
                <div className="bg-gray-700 p-4 rounded space-y-2">
                  <div><span className="text-gray-400">Name:</span> {selectedVessel.name}</div>
                  <div><span className="text-gray-400">MMSI:</span> {selectedVessel.mmsi}</div>
                  <div><span className="text-gray-400">Type:</span> {selectedVessel.type}</div>
                  <div><span className="text-gray-400">Status:</span> {selectedVessel.status}</div>
                  <div><span className="text-gray-400">Position:</span> {selectedVessel.lat.toFixed(4)}, {selectedVessel.lon.toFixed(4)}</div>
                  <div><span className="text-gray-400">Speed:</span> {selectedVessel.sog} knots</div>
                  <div><span className="text-gray-400">Course:</span> {selectedVessel.cog}°</div>
                  <div><span className="text-gray-400">Heading:</span> {selectedVessel.heading}°</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Global Tanker Tracking</h2>
            <div className="text-sm text-gray-400">
              {vessels.filter(v => v.sog > 0).length} vessels moving | {vessels.filter(v => v.sog === 0).length} stationary
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-700 rounded">
              <Bell size={16} />
            </button>
            <button className="p-2 hover:bg-gray-700 rounded">
              <Users size={16} />
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1">
          <TankerMap 
            vessels={vessels}
            selectedVessel={selectedVessel}
            onVesselSelect={handleVesselSelect}
          />
        </div>

        {/* Bottom Status Bar */}
        <div className="h-8 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 text-xs text-gray-400">
          <div>Last update: {lastUpdate || 'Initializing...'}</div>
          <div>Updates via WebSocket | Kafka Streaming</div>
        </div>
      </div>
    </div>
  );
};

export default TankerTrackerApp;