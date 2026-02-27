'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useQuery, useMutation } from '@apollo/client/react';
import { useMapStore } from '@/store/mapStore';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_MAP_STATE } from '@/graphql/auth';
import { GET_FOREST_PLOTS } from '@/graphql/geospatial';
import { GET_MY_POLYGONS, SAVE_POLYGON_MUTATION } from '@/graphql/polygons';
import { FilterPanel } from './FilterPanel';
import { SavePolygonModal } from './SavePolygonModal';
import { PolygonResultsPanel } from './PolygonResultsPanel';
import { SavedPolygonsList } from './SavedPolygonsList';
import { LayerControlPanel } from './LayerControlPanel';
import { WMS_LAYERS, getWMSTileUrl, WMSLayerConfig } from '@/services/wmsLayers';

import { Layers, LogOut, Map as MapIcon } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export function ForestMap() {
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(5);
    const [wmsLayers, setWmsLayers] = useState<WMSLayerConfig[]>(WMS_LAYERS);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);

    const { lng, lat, zoom, filters, showCadastre, setViewState, setShowCadastre } = useMapStore();
    const { user, logout, updateUser } = useAuthStore();

    const { data: savedPolygonsData, refetch: refetchPolygons } = useQuery(GET_MY_POLYGONS);

    const [updateMapState] = useMutation(UPDATE_MAP_STATE);
    const [savePolygon] = useMutation(SAVE_POLYGON_MUTATION);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        const initialLng = user?.lastLng || lng;
        const initialLat = user?.lastLat || lat;
        const initialZoom = user?.lastZoom || zoom;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/satellite-v9',
            center: [initialLng, initialLat],
            zoom: initialZoom,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        draw.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            defaultMode: 'simple_select'
        });
        map.current.addControl(draw.current, 'top-right');

        // Track zoom for layer visibility
        const updateZoom = () => {
            const newZoom = map.current!.getZoom();
            setCurrentZoom(newZoom);
            updateWMSLayerVisibility(newZoom);
        };

        map.current.on('load', () => {
            setMapLoaded(true);
            addWMSLayers(map.current!);
            updateZoom();
        });

        map.current.on('zoom', updateZoom);

        map.current.on('moveend', () => {
            const center = map.current!.getCenter();
            const newZoom = map.current!.getZoom();
            setViewState(center.lng, center.lat, newZoom);

            if (user) {
                updateMapState({
                    variables: {
                        input: {
                            lng: center.lng,
                            lat: center.lat,
                            zoom: newZoom,
                            filters,
                            activeLayers: wmsLayers.filter(l => l.visible).map(l => l.id),
                        },
                    },
                }).then((result) => {
                    updateUser(result.data.updateMapState);
                }).catch(console.error);
            }
        });

        map.current.on('draw.create', (e) => {
            const geometry = e.features[0].geometry;
            setDrawnGeometry(geometry);
            setShowSaveModal(true);
        });

        return () => {
            map.current?.remove();
        };
    }, [user?.id]);

    // Add WMS layers to map
    const addWMSLayers = (mapInstance: mapboxgl.Map) => {
        WMS_LAYERS.forEach((layer) => {
            const sourceId = `wms-${layer.id}`;
            const layerId = `wms-layer-${layer.id}`;

            // Add source
            mapInstance.addSource(sourceId, {
                type: 'raster',
                tiles: [getWMSTileUrl(layer.layerName)],
                tileSize: 256,
                scheme: 'xyz',
            });

            // Add layer
            mapInstance.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: {
                    'raster-opacity': layer.visible ? layer.opacity : 0,
                },
                layout: {
                    visibility: layer.visible ? 'visible' : 'none',
                },
            });
        });

        updateWMSLayerVisibility(mapInstance.getZoom());
    };

    // Update layer visibility based on zoom
    const updateWMSLayerVisibility = (zoom: number) => {
        if (!map.current) return;

        wmsLayers.forEach((layer) => {
            const layerId = `wms-layer-${layer.id}`;
            const sourceId = `wms-${layer.id}`;

            if (!map.current!.getLayer(layerId)) return;

            const shouldBeVisible = layer.visible && zoom >= layer.minZoom && zoom <= layer.maxZoom;

            map.current!.setLayoutProperty(
                layerId,
                'visibility',
                shouldBeVisible ? 'visible' : 'none'
            );

            if (shouldBeVisible) {
                map.current!.setPaintProperty(layerId, 'raster-opacity', layer.opacity);
            }
        });
    };

    // Toggle layer visibility
    const handleToggleLayer = (layerId: string) => {
        const updatedLayers = wmsLayers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
        );
        setWmsLayers(updatedLayers);

        // Immediately update map
        if (map.current) {
            const layer = updatedLayers.find(l => l.id === layerId);
            const mapLayerId = `wms-layer-${layerId}`;

            if (layer && map.current.getLayer(mapLayerId)) {
                const shouldBeVisible = layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
                map.current.setLayoutProperty(
                    mapLayerId,
                    'visibility',
                    shouldBeVisible ? 'visible' : 'none'
                );
            }
        }
    };

    // Display saved polygons when data loads
    useEffect(() => {
        if (!map.current || !savedPolygonsData?.myPolygons || !mapLoaded) return;

        const timer = setTimeout(() => {
            displaySavedPolygonsOnMap(map.current!, savedPolygonsData.myPolygons);
        }, 500);

        return () => clearTimeout(timer);
    }, [savedPolygonsData, mapLoaded]);

    const displaySavedPolygonsOnMap = (mapInstance: mapboxgl.Map, polygons: any[]) => {
        if (!mapInstance.isStyleLoaded()) {
            setTimeout(() => displaySavedPolygonsOnMap(mapInstance, polygons), 200);
            return;
        }

        // Clean up existing
        if (mapInstance.getLayer('saved-polygons-fill')) {
            mapInstance.removeLayer('saved-polygons-fill');
        }
        if (mapInstance.getLayer('saved-polygons-outline')) {
            mapInstance.removeLayer('saved-polygons-outline');
        }
        if (mapInstance.getSource('saved-polygons')) {
            mapInstance.removeSource('saved-polygons');
        }

        if (polygons.length === 0) return;

        // Parse and validate
        const validPolygons = polygons.map((p) => {
            let geometry = p.geometry;
            if (typeof geometry === 'string') {
                try {
                    geometry = JSON.parse(geometry);
                } catch {
                    return null;
                }
            }
            if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {
                return null;
            }
            const isValidType = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
            if (!isValidType) return null;
            return { ...p, geometry };
        }).filter((p): p is NonNullable<typeof p> => p !== null);

        if (validPolygons.length === 0) {
            console.error('❌ No valid polygons to display!');
            return;
        }

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: validPolygons.map((p) => ({
                type: 'Feature',
                id: p.id,
                geometry: p.geometry,
                properties: {
                    name: p.name,
                    area: p.areaHectares,
                    status: p.status,
                },
            })),
        };

        try {
            mapInstance.addSource('saved-polygons', {
                type: 'geojson',
                data: geojson,
            });

            mapInstance.addLayer({
                id: 'saved-polygons-fill',
                type: 'fill',
                source: 'saved-polygons',
                paint: {
                    'fill-color': '#3B82F6',
                    'fill-opacity': 0.3,
                },
            });

            mapInstance.addLayer({
                id: 'saved-polygons-outline',
                type: 'line',
                source: 'saved-polygons',
                paint: {
                    'line-color': '#2563EB',
                    'line-width': 2,
                    'line-dasharray': [2, 2],
                },
            });

            // Fit bounds
            const allCoords = validPolygons.flatMap(p => p.geometry.coordinates[0]);
            if (allCoords.length > 0) {
                const bounds = allCoords.reduce(
                    (bounds: mapboxgl.LngLatBounds, coord: number[]) => {
                        return bounds.extend(coord as [number, number]);
                    },
                    new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
                );
                mapInstance.fitBounds(bounds, { padding: 100 });
            }
        } catch (error) {
            console.error('Error adding polygons:', error);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/auth';
    };

    return (
        <div className="relative w-full h-screen bg-gray-900">
            <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100vh' }} />

            <FilterPanel />

            {/* Layer Control Panel */}
            <LayerControlPanel
                layers={wmsLayers}
                onToggleLayer={handleToggleLayer}
                currentZoom={currentZoom}
            />

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
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

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg shadow-lg border border-gray-200 hover:bg-red-50 transition-all"
                >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>

            <SavedPolygonsList onSelectPolygon={(p) => {
                setAnalysisResult(p);
                setShowResults(true);
            }} />

            {showSaveModal && drawnGeometry && (
                <SavePolygonModal
                    geometry={drawnGeometry}
                    onClose={() => {
                        setShowSaveModal(false);
                        setDrawnGeometry(null);
                        draw.current?.deleteAll();
                    }}
                    onSaved={(result) => {
                        setAnalysisResult(result);
                        setShowResults(true);
                        setShowSaveModal(false);
                        setDrawnGeometry(null);
                        draw.current?.deleteAll();
                        refetchPolygons();
                    }}
                />
            )}

            {showResults && analysisResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="pointer-events-auto">
                        <PolygonResultsPanel
                            result={analysisResult}
                            onClose={() => setShowResults(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}