'use client';

import { useState } from 'react';
import { Layers, Eye, EyeOff, Info } from 'lucide-react';
import { WMS_LAYERS, WMSLayerConfig } from '@/services/wmsLayers';

interface LayerControlPanelProps {
    layers: WMSLayerConfig[];
    onToggleLayer: (layerId: string) => void;
    currentZoom: number;
}

export function LayerControlPanel({ layers, onToggleLayer, currentZoom }: LayerControlPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getLayerStatus = (layer: WMSLayerConfig) => {
        if (!layer.visible) return 'hidden';
        if (currentZoom < layer.minZoom) return 'zoom-in';
        if (currentZoom > layer.maxZoom) return 'zoom-out';
        return 'visible';
    };

    return (
        <div className="absolute top-20 right-4 z-10">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border transition-all ${
                    isExpanded ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
            >
                <Layers size={18} />
                <span className="text-sm font-medium">Layers</span>
            </button>

            {isExpanded && (
                <div className="mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-semibold text-sm text-gray-900">Map Layers</h3>
                        <p className="text-xs text-gray-500 mt-1">Zoom: {currentZoom.toFixed(1)}</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {layers.map((layer) => {
                            const status = getLayerStatus(layer);

                            return (
                                <div
                                    key={layer.id}
                                    className={`p-3 hover:bg-gray-50 transition-colors ${
                                        status === 'visible' ? 'opacity-100' : 'opacity-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: layer.color }}
                                            />
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900">
                                                    {layer.name}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    {layer.minZoom}-{layer.maxZoom} zoom
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => onToggleLayer(layer.id)}
                                            className={`p-1.5 rounded transition-colors ${
                                                layer.visible
                                                    ? 'text-blue-600 hover:bg-blue-50'
                                                    : 'text-gray-400 hover:bg-gray-100'
                                            }`}
                                        >
                                            {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </div>

                                    {status === 'zoom-in' && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <Info size={12} />
                                            Zoom in to see ({layer.minZoom}+)
                                        </p>
                                    )}
                                    {status === 'zoom-out' && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <Info size={12} />
                                            Zoom out to see (&lt;{layer.maxZoom})
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}