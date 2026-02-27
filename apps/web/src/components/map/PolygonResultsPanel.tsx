'use client';

import { X, Trees, Ruler, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PolygonResultsPanelProps {
    result: {
        id: string;
        name: string;
        areaHectares: number;
        status: string;
        analysisResults?: {
            plotCount?: number;
            totalForestArea?: number;
            forestTypes?: string[];
            speciesDistribution?: Array<{
                species: string;
                areaHectares: number;
                percentage: number;
            }>;
        } | null;
    };
    onClose: () => void;
}

export function PolygonResultsPanel({ result, onClose }: PolygonResultsPanelProps) {
    const hasAnalysis = result.status === 'completed' && result.analysisResults;

    return (
        <div className="absolute bottom-3 left-90 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[80vh] overflow-y-auto m-4">
        <div className=" bottom-4 left-4 z-20 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between sticky top-0">
                <div>
                    <h3 className="font-semibold text-lg">{result.name}</h3>
                    <p className="text-green-100 text-sm">Polygon Analysis</p>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 rounded p-1">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Basic Info - Always shown */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Ruler size={16} />
                            <span className="text-xs font-medium">Total Area</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                            {result.areaHectares.toFixed(2)} <span className="text-sm">ha</span>
                        </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-700 mb-1">
                            {result.status === 'completed' ? <CheckCircle size={16} className="text-green-600" /> :
                                result.status === 'pending' ? <Clock size={16} className="text-yellow-600" /> :
                                    <AlertCircle size={16} className="text-red-600" />}
                            <span className="text-xs font-medium">Status</span>
                        </div>
                        <p className="text-lg font-bold text-gray-900 capitalize">
                            {result.status}
                        </p>
                    </div>
                </div>

                {/* Forest Analysis - Conditional */}
                {hasAnalysis ? (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 text-green-800 mb-2">
                                <Trees size={18} />
                                <span className="font-medium">Forest Coverage</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-green-600">Plots:</span>
                                    <span className="ml-1 font-semibold">{result.analysisResults?.plotCount}</span>
                                </div>
                                <div>
                                    <span className="text-green-600">Forest Area:</span>
                                    <span className="ml-1 font-semibold">
                    {result.analysisResults?.totalForestArea?.toFixed(2)} ha
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* Forest Types */}
                        {result.analysisResults?.forestTypes && result.analysisResults.forestTypes.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Forest Types</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.analysisResults.forestTypes.map((type) => (
                                        <span key={type} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {type}
                    </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Species Distribution */}
                        {result.analysisResults?.speciesDistribution && result.analysisResults.speciesDistribution.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Species Distribution</h4>
                                <div className="space-y-2">
                                    {result.analysisResults.speciesDistribution.map((item) => (
                                        <div key={item.species} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600 truncate max-w-[120px]">{item.species}</span>
                                            <div className="flex items-center gap-2 flex-1 ml-2">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500"
                                                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-gray-900 font-medium w-20 text-right text-xs">
                          {item.areaHectares.toFixed(1)} ha
                        </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* No forest data yet */
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Clock className="text-yellow-600 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-medium text-yellow-800">Forest Data Pending</h4>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Your polygon has been saved with an area of <strong>{result.areaHectares.toFixed(2)} hectares</strong>.
                                </p>
                                <p className="text-sm text-yellow-700 mt-2">
                                    Forest species analysis will be available once forest data layers are connected to the system.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>);

}