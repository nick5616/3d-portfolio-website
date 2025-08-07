import React, { useState, useEffect } from "react";
import { azureStorageService } from "../../utils/azureStorage";
import { isAzureStorageConfigured } from "../../configs/azureConfig";

export const AzureStorageTest: React.FC = () => {
    const [artPieces, setArtPieces] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testUrl, setTestUrl] = useState<string>("");

    const testArtPiece = "marvin-martian";

    useEffect(() => {
        const loadArtPieces = async () => {
            if (!isAzureStorageConfigured()) {
                setError("Azure Storage not properly configured");
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // First test the connection
                const connectionTest =
                    await azureStorageService.testConnection();
                if (!connectionTest.success) {
                    setError(`Connection failed: ${connectionTest.error}`);
                    return;
                }

                const pieces = await azureStorageService.listArtPieces();
                setArtPieces(pieces);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load art pieces"
                );
            } finally {
                setLoading(false);
            }
        };

        loadArtPieces();
    }, []);

    const testSingleArtPiece = async () => {
        if (!isAzureStorageConfigured()) {
            setError("Azure Storage not properly configured");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = await azureStorageService.getArtPieceUrl(testArtPiece);
            setTestUrl(url);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load art piece"
            );
        } finally {
            setLoading(false);
        }
    };

    const clearCache = () => {
        azureStorageService.clearCache();
        setTestUrl("");
        setError("Cache cleared");
    };

    return (
        <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg max-w-sm z-50">
            <h3 className="text-lg font-bold mb-2">Azure Storage Test</h3>

            <div className="mb-4">
                <p className="text-sm">
                    <strong>Configured:</strong>{" "}
                    {isAzureStorageConfigured() ? "Yes" : "No"}
                </p>
            </div>

            <div className="mb-4">
                <button
                    onClick={testSingleArtPiece}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm mr-2"
                >
                    {loading ? "Loading..." : "Test Single Art Piece"}
                </button>

                <button
                    onClick={clearCache}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                    Clear Cache
                </button>
            </div>

            {testUrl && (
                <div className="mb-4">
                    <p className="text-sm font-bold">Test URL:</p>
                    <p className="text-xs break-all">{testUrl}</p>
                </div>
            )}

            {error && (
                <div className="mb-4">
                    <p className="text-sm font-bold text-red-400">Error:</p>
                    <p className="text-xs text-red-300">{error}</p>
                </div>
            )}

            {artPieces.length > 0 && (
                <div>
                    <p className="text-sm font-bold">
                        Available Art Pieces ({artPieces.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                        {artPieces.slice(0, 10).map((piece, index) => (
                            <p key={index} className="text-xs">
                                {piece}
                            </p>
                        ))}
                        {artPieces.length > 10 && (
                            <p className="text-xs text-gray-400">
                                ... and {artPieces.length - 10} more
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
