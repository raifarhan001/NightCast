"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ServerSource,
  LanguageType,
  LanguageBucket,
  groupSourcesByLanguage
} from '../utils/languageDetector';

const STORAGE_KEY = 'nightcast_audio_lang';

export interface UseLanguageSourcesReturn {
  buckets: LanguageBucket;
  english: ServerSource[];
  hindi: ServerSource[];
  unknown: ServerSource[];
  selectedLanguage: LanguageType;
  selectLanguage: (lang: LanguageType) => void;
  activeSources: ServerSource[];
  activeSource: ServerSource | null;
  setActiveSourceId: (id: string) => void;
  failedSourceIds: string[];
  handleSourceError: (sourceId?: string) => void;
  toastMessage: string | null;
  clearToast: () => void;
  isFallback: boolean;
}

export function useLanguageSources(sources: ServerSource[] = []): UseLanguageSourcesReturn {
  const [selectedLanguage, setSelectedLanguageState] = useState<LanguageType>(() => {
    if (typeof window === 'undefined') return 'english';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hindi' || saved === 'english' || saved === 'unknown') {
        return saved as LanguageType;
      }
    } catch (e) {
      console.warn('Unable to access localStorage for audio preference:', e);
    }
    return 'english';
  });

  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [failedSourceIds, setFailedSourceIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Group raw sources into language buckets
  const buckets: LanguageBucket = useMemo(() => {
    return groupSourcesByLanguage(sources);
  }, [sources]);

  // Determine effective language (fallback to English or Unknown if selected bucket is empty)
  const { effectiveLanguage, isFallback } = useMemo(() => {
    if (buckets[selectedLanguage] && buckets[selectedLanguage].length > 0) {
      return { effectiveLanguage: selectedLanguage, isFallback: false };
    }
    // Fallback hierarchy: english -> unknown -> hindi
    if (buckets.english.length > 0) {
      return { effectiveLanguage: 'english' as LanguageType, isFallback: selectedLanguage !== 'english' };
    }
    if (buckets.unknown.length > 0) {
      return { effectiveLanguage: 'unknown' as LanguageType, isFallback: selectedLanguage !== 'unknown' };
    }
    if (buckets.hindi.length > 0) {
      return { effectiveLanguage: 'hindi' as LanguageType, isFallback: selectedLanguage !== 'hindi' };
    }
    return { effectiveLanguage: selectedLanguage, isFallback: false };
  }, [buckets, selectedLanguage]);

  // Active sources for the current effective language bucket
  const activeSources = useMemo(() => {
    return buckets[effectiveLanguage] || [];
  }, [buckets, effectiveLanguage]);

  // Filter non-failed active sources
  const nonFailedActiveSources = useMemo(() => {
    return activeSources.filter((s) => !failedSourceIds.includes(s.id));
  }, [activeSources, failedSourceIds]);

  // Determine active source object
  const activeSource = useMemo(() => {
    if (activeSourceId) {
      const found = sources.find((s) => s.id === activeSourceId && !failedSourceIds.includes(s.id));
      if (found) return found;
    }
    if (nonFailedActiveSources.length > 0) {
      return nonFailedActiveSources[0];
    }
    // Fall back to any non-failed source across all buckets
    const anySource = sources.find((s) => !failedSourceIds.includes(s.id));
    return anySource || sources[0] || null;
  }, [activeSourceId, sources, failedSourceIds, nonFailedActiveSources]);

  // User trigger to switch language
  const selectLanguage = useCallback((lang: LanguageType) => {
    setSelectedLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        console.warn('Failed to save audio language preference:', e);
      }
    }
    // Reset active source selection so auto-select picks primary source in new bucket
    setActiveSourceId(null);
  }, []);

  // Handle source playback failure and auto-fallback
  const handleSourceError = useCallback(
    (sourceId?: string) => {
      const targetId = sourceId || (activeSource ? activeSource.id : null);
      if (!targetId) return;

      console.warn(`[useLanguageSources] Source failed: ${targetId}`);
      setFailedSourceIds((prev) => (prev.includes(targetId) ? prev : [...prev, targetId]));

      const failedSourceObj = sources.find((s) => s.id === targetId);
      const sourceName = failedSourceObj ? failedSourceObj.name : targetId;

      // Find alternative source
      const remainingInBucket = activeSources.filter(
        (s) => s.id !== targetId && !failedSourceIds.includes(s.id)
      );

      if (remainingInBucket.length > 0) {
        setActiveSourceId(remainingInBucket[0].id);
        setToastMessage(`Source ${sourceName} failed. Switched to ${remainingInBucket[0].name}.`);
      } else {
        // Fallback to next bucket
        const allRemaining = sources.filter(
          (s) => s.id !== targetId && !failedSourceIds.includes(s.id)
        );
        if (allRemaining.length > 0) {
          setActiveSourceId(allRemaining[0].id);
          setToastMessage(`Language source unavailable. Auto-fallback to ${allRemaining[0].name}.`);
        } else {
          setToastMessage(`Playback failed across all available sources for this title.`);
        }
      }
    },
    [activeSource, activeSources, failedSourceIds, sources]
  );

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Clear failed sources when title/sources change completely
  useEffect(() => {
    setFailedSourceIds([]);
    setToastMessage(null);
  }, [sources.map((s) => s.id).join(',')]);

  return {
    buckets,
    english: buckets.english,
    hindi: buckets.hindi,
    unknown: buckets.unknown,
    selectedLanguage: effectiveLanguage,
    selectLanguage,
    activeSources,
    activeSource,
    setActiveSourceId,
    failedSourceIds,
    handleSourceError,
    toastMessage,
    clearToast,
    isFallback
  };
}
