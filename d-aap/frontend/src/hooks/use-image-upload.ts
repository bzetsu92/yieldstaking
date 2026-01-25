import { useState, useCallback, useRef, useEffect } from 'react';

import { uploadImage, uploadImageWithIPFS, deleteFromS3, unpinFromIPFS } from '@/lib/api/tickets';

export interface UploadState {
    isUploading: boolean;
    progress: number;
    uploadedUrl: string | null;
    ipfsHash: string | null;
    gatewayUrl: string | null;
    error: string | null;
}

export interface UseImageUploadOptions {
    uploadToIPFS?: boolean;
    onUploadComplete?: (result: { url: string; ipfsHash?: string; gatewayUrl?: string }) => void;
    onUploadError?: (error: Error) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
    const { uploadToIPFS = false, onUploadComplete, onUploadError } = options;

    const [uploadState, setUploadState] = useState<UploadState>({
        isUploading: false,
        progress: 0,
        uploadedUrl: null,
        ipfsHash: null,
        gatewayUrl: null,
        error: null,
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const isSubmittedRef = useRef<boolean>(false);

    const upload = useCallback(
        async (file: File) => {
            if (!file) return;

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            setUploadState({
                isUploading: true,
                progress: 0,
                uploadedUrl: null,
                ipfsHash: null,
                gatewayUrl: null,
                error: null,
            });

            try {
                let result: { url: string; ipfsHash?: string; gatewayUrl?: string };

                if (uploadToIPFS) {
                    result = await uploadImageWithIPFS(file);
                } else {
                    const uploadResult = await uploadImage(file);
                    result = { url: uploadResult.url };
                }

                setUploadState({
                    isUploading: false,
                    progress: 100,
                    uploadedUrl: result.url,
                    ipfsHash: result.ipfsHash || null,
                    gatewayUrl: result.gatewayUrl || null,
                    error: null,
                });

                onUploadComplete?.(result);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';

                setUploadState({
                    isUploading: false,
                    progress: 0,
                    uploadedUrl: null,
                    ipfsHash: null,
                    gatewayUrl: null,
                    error: errorMessage,
                });

                onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
            }
        },
        [uploadToIPFS, onUploadComplete, onUploadError],
    );

    const cleanup = useCallback(async () => {
        if (isSubmittedRef.current) {
            return;
        }

        const { uploadedUrl, ipfsHash } = uploadState;

        if (uploadedUrl) {
            try {
                await deleteFromS3(uploadedUrl);
            } catch {
                // Failed to cleanup S3 file
            }
        }

        if (ipfsHash) {
            try {
                await unpinFromIPFS(ipfsHash);
            } catch {
                // Failed to cleanup IPFS file
            }
        }
    }, [uploadState.uploadedUrl, uploadState.ipfsHash]);

    const markAsSubmitted = useCallback(() => {
        isSubmittedRef.current = true;
    }, []);

    const reset = useCallback(
        async (shouldCleanup = true) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            if (shouldCleanup) {
                await cleanup();
            }

            isSubmittedRef.current = false;
            setUploadState({
                isUploading: false,
                progress: 0,
                uploadedUrl: null,
                ipfsHash: null,
                gatewayUrl: null,
                error: null,
            });
        },
        [cleanup],
    );

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (uploadState.uploadedUrl || uploadState.ipfsHash) {
                cleanup().catch(() => {
                    // Cleanup failed
                });
            }
        };
    }, [uploadState.uploadedUrl, uploadState.ipfsHash, cleanup]);

    return {
        uploadState,
        upload,
        reset,
        cleanup,
        markAsSubmitted,
    };
}
