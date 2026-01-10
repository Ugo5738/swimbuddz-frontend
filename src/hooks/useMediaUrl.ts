'use client';

import { useEffect, useState } from 'react';
import { getMediaUrl, getMediaUrlFromCache, prefetchMediaUrls } from '@/lib/media';

/**
 * Hook to resolve a media ID to its file URL
 * Returns: [url: string | null, isLoading: boolean]
 */
export function useMediaUrl(mediaId: string | null | undefined): [string | null, boolean] {
    const [url, setUrl] = useState<string | null>(() => getMediaUrlFromCache(mediaId));
    const [isLoading, setIsLoading] = useState(!url && !!mediaId);

    useEffect(() => {
        if (!mediaId) {
            setUrl(null);
            setIsLoading(false);
            return;
        }

        // Check cache first
        const cached = getMediaUrlFromCache(mediaId);
        if (cached) {
            setUrl(cached);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        getMediaUrl(mediaId)
            .then(resolvedUrl => {
                setUrl(resolvedUrl);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [mediaId]);

    return [url, isLoading];
}

/**
 * Hook to prefetch and resolve multiple media IDs
 * Returns: Map of mediaId -> url
 */
export function useMediaUrls(mediaIds: (string | null | undefined)[]): Map<string, string | null> {
    const [urlMap, setUrlMap] = useState<Map<string, string | null>>(new Map());

    useEffect(() => {
        const validIds = mediaIds.filter((id): id is string => !!id);
        if (validIds.length === 0) return;

        prefetchMediaUrls(validIds).then(() => {
            const newMap = new Map<string, string | null>();
            validIds.forEach(id => {
                newMap.set(id, getMediaUrlFromCache(id));
            });
            setUrlMap(newMap);
        });
    }, [JSON.stringify(mediaIds)]);

    return urlMap;
}
