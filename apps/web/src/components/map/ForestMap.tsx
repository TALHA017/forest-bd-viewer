'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useQuery, useMutation } from '@apollo/client/react';
import { useMapStore } from '@/store/mapStore';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_MAP_STATE } from '@/graphql/auth';
import { GET_FOREST_PLOTS } from '@/graphql/geospatial';
import { FilterPanel } from './FilterPanel';
import { Layers, LogOut, Map as MapIcon } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export function ForestMap() {

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!MAPBOX_TOKEN) {
        console.error('❌ Mapbox token is missing! Check .env.local');
    }else{
        console.log(MAPBOX_TOKEN);
    }
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);

    const { lng, lat, zoom, filters, showCadastre, setViewState, setShowCadastre } = useMapStore();
    const { user, logout, updateUser } = useAuthStore();

    const { data: forestData, loading: loadingForest } = useQuery(GET_FOREST_PLOTS, {
        variables: {
            filters: {
                regionCode: filters.regionCode,
                departementCode: filters.departementCode,
                communeCode: filters.communeCode,
                lieuDit: filters.lieuDit,
            }
        },
        skip: !map.current,
    });

    const [updateMapState] = useMutation(UPDATE_MAP_STATE);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        // Use saved state if available
        const initialLng = user?.lastLng || lng;
        const initialLat = user?.lastLat || lat;
        const initialZoom = user?.lastZoom || zoom;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-v9',
            center: [initialLng, initialLat],
            zoom: initialZoom,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add fullscreen control
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        // Add drawing tool (for Bonus A)
        draw.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            },
            defaultMode: 'simple_select'
        });
        map.current.addControl(draw.current, 'top-right');

        // Save state on move end
        const handleMoveEnd = () => {
            const center = map.current!.getCenter();
            const newZoom = map.current!.getZoom();
            setViewState(center.lng, center.lat, newZoom);

            // Save to backend if logged in
            if (user) {
                updateMapState({
                    variables: {
                        input: {
                            lng: center.lng,
                            lat: center.lat,
                            zoom: newZoom,
                            filters,
                        },
                    },
                }).then((result) => {
                    // @ts-ignore
                    updateUser(result.data.updateMapState);
                }).catch(console.error);
            }
        };

        map.current.on('moveend', handleMoveEnd);

        // Drawing events (Bonus A)
        map.current.on('draw.create', (e) => {
            console.log('Polygon created:', e.features[0]);
            // TODO: Send to backend for analysis
        });

        return () => {
            map.current?.off('moveend', handleMoveEnd);
            map.current?.remove();
        };
    }, [user?.id]); // Re-init if user changes

    // Update forest layer when data changes
    useEffect(() => {
        if (!map.current || !forestData?.forestPlots) return;

        const source = map.current.getSource('forest-plots') as mapboxgl.GeoJSONSource;

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: forestData.forestPlots.map((plot: any) => ({
                type: 'Feature',
                id: plot.id,
                geometry: plot.geometry,
                properties: {
                    essences: plot.essences,
                    surface: plot.surfaceHectares,
                    type: plot.typeForet,
                    commune: plot.codeCommune,
                },
            })),
        };

        if (source) {
            source.setData(geojson);
        } else if (map.current.getLayer('forest-plots-fill')) {
            // Remove old layers first
            map.current.removeLayer('forest-plots-fill');
            map.current.removeLayer('forest-plots-outline');
            map.current.removeSource('forest-plots');

            addForestLayers(map.current, geojson);
        } else {
            addForestLayers(map.current, geojson);
        }
    }, [forestData]);

    const addForestLayers = (mapInstance: mapboxgl.Map, data: GeoJSON.FeatureCollection) => {
        mapInstance.addSource('forest-plots', {
            type: 'geojson',
            data: data,
        });

        // Fill layer with color coding
        mapInstance.addLayer({
            id: 'forest-plots-fill',
            type: 'fill',
            source: 'forest-plots',
            paint: {
                'fill-color': [
                    'match',
                    ['get', 'type'],
                    'Forêt feuillue', '#228B22',      // Forest green
                    'Forêt conifère', '#8B4513',      // Saddle brown
                    'Forêt mixte', '#9ACD32',         // Yellow green
                    'Peupleraie', '#90EE90',          // Light green
                    'Lande ligneuse', '#DAA520',      // Goldenrod
                    '#808080'  // Default gray
                ],
                'fill-opacity': 0.7,
            },
        });

        // Outline layer
        mapInstance.addLayer({
            id: 'forest-plots-outline',
            type: 'line',
            source: 'forest-plots',
            paint: {
                'line-color': '#004d00',
                'line-width': 1.5,
            },
        });

        // Click handler
        mapInstance.on('click', 'forest-plots-fill', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                const props = feature.properties;
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
            <div class="p-3 min-w-[200px]">
              <h4 class="font-bold text-gray-900 mb-2 border-b pb-1">Forest Plot</h4>
              <div class="space-y-1 text-sm">
                <p><span class="font-medium text-gray-600">ID:</span> ${feature.id}</p>
                <p><span class="font-medium text-gray-600">Type:</span> ${props?.type || 'Unknown'}</p>
                <p><span class="font-medium text-gray-600">Species:</span> ${props?.essences?.join(', ') || 'N/A'}</p>
                <p><span class="font-medium text-gray-600">Area:</span> ${props?.surface?.toFixed(2) || 'N/A'} ha</p>
                <p><span class="font-medium text-gray-600">Commune:</span> ${props?.commune || 'N/A'}</p>
              </div>
            </div>
          `)
                    .addTo(mapInstance);
            }
        });

        // Hover effects
        mapInstance.on('mouseenter', 'forest-plots-fill', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', 'forest-plots-fill', () => {
            mapInstance.getCanvas().style.cursor = '';
        });
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/auth';
    };

    return (
        <div className="relative w-full h-screen bg-gray-900">
            {/* Map Container */}
            <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100vh' }} />

            {/* Filter Panel */}
            <FilterPanel />

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                {/* Layer Toggle */}
                <button
                    onClick={() => setShowCadastre(!showCadastre)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border transition-all ${
                        showCadastre
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <Layers size={18} />
                    <span className="text-sm font-medium">Cadastre</span>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg shadow-lg border border-gray-200 hover:bg-red-50 transition-all"
                >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>

            {/* Loading Indicator */}
            {loadingForest && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        Loading forest data...
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-4">
                <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <MapIcon size={16} />
                    Forest Types
                </h4>
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#228B22]" />
                        <span className="text-gray-700">Broadleaf forest</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#8B4513]" />
                        <span className="text-gray-700">Coniferous forest</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#9ACD32]" />
                        <span className="text-gray-700">Mixed forest</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#90EE90]" />
                        <span className="text-gray-700">Poplar plantation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}