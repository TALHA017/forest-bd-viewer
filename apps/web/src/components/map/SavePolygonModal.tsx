'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { SAVE_POLYGON_MUTATION } from '@/graphql/polygons';
import { X, Save, Trees } from 'lucide-react';

interface SavePolygonModalProps {
    geometry: any;
    onClose: () => void;
    onSaved: (result: any) => void;
}

export function SavePolygonModal({ geometry, onClose, onSaved }: SavePolygonModalProps) {
    const [name, setName] = useState('');
    const [savePolygon, { loading }] = useMutation(SAVE_POLYGON_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            const result = await savePolygon({
                variables: {
                    input: {
                        name: name.trim(),
                        geometry,
                    },
                },
            });
            onSaved(result.data.savePolygon);
        } catch (err) {
            console.error('Failed to save:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Trees className="text-green-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-900">Save Polygon</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-gray-600 mb-4">
                    Give your study area a name to save it for later analysis.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Polygon Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Study Area 1, Landes North Sector..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Forest analysis will be available once forest data layers are connected.
                            For now, we'll save the polygon area and location.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Saving...' : <><Save size={18} /> Save Polygon</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}