/**
 * Language Detector Utility for NightCast Streaming App
 * Classifies streaming server sources into language buckets based on name, label, language, and URL heuristics.
 */

export interface ServerSource {
  id: string;
  name: string;
  url: string;
  type: 'hls' | 'iframe' | string;
  language?: string;
  language_name?: string;
  is_dub?: boolean;
  audio_tracks?: Array<{ id?: string | number; lang?: string; label?: string }>;
  [key: string]: any;
}

export type LanguageType = 'english' | 'hindi' | 'unknown';

export interface LanguageBucket {
  english: ServerSource[];
  hindi: ServerSource[];
  unknown: ServerSource[];
}

export interface LanguagePatternDefinition {
  type: LanguageType;
  label: string;
  isoCode: string;
  patterns: RegExp[];
}

/**
 * Extensible configuration array of supported language matching patterns.
 * To support additional languages in the future (e.g. Tamil, Telugu), add new entries to this array.
 */
export const LANGUAGE_PATTERN_DEFINITIONS: LanguagePatternDefinition[] = [
  {
    type: 'hindi',
    label: 'Hindi Dubbed',
    isoCode: 'hi',
    patterns: [
      /\b(hin|hindi|dual[- _]?audio|hindub)\b/i,
      /[?&]ds_lang=hi\b/i,
      /vsrc\.su/i
    ]
  },
  {
    type: 'english',
    label: 'English / Original',
    isoCode: 'en',
    patterns: [
      /\b(eng|english|org|original|autoembed)\b/i,
      /vidsrc-embed\.ru/i,
      /vidsrc-embed\.su/i,
      /vidsrcme\.su/i
    ]
  }
];

/**
 * Classifies a single ServerSource into a LanguageType based on explicit attributes and string heuristics.
 *
 * @param source The ServerSource to classify
 * @returns LanguageType ('english' | 'hindi' | 'unknown')
 */
export function classifySourceLanguage(source: ServerSource): LanguageType {
  if (!source) return 'unknown';

  // 1. Explicit boolean or language property checks
  if (source.is_dub || source.language === 'hi') {
    return 'hindi';
  }

  // 2. Check if the source explicitly targets English
  if (source.language === 'en') {
    // Verify it doesn't contain Hindi keywords in its name
    const combinedString = `${source.name || ''} ${source.id || ''} ${source.url || ''}`.toLowerCase();
    if (!/\b(hin|hindi|dual[- _]?audio)\b/i.test(combinedString)) {
      return 'english';
    }
  }

  // 3. String heuristics against source name, ID, URL, and language_name
  const targetText = [
    source.name || '',
    source.id || '',
    source.url || '',
    source.language_name || '',
    source.language || ''
  ].join(' ').toLowerCase();

  // Test against defined language patterns
  for (const langDef of LANGUAGE_PATTERN_DEFINITIONS) {
    for (const pattern of langDef.patterns) {
      if (pattern.test(targetText)) {
        return langDef.type;
      }
    }
  }

  // 4. Check internal audio_tracks if present (e.g., HLS multi-audio manifests)
  if (Array.isArray(source.audio_tracks) && source.audio_tracks.length > 0) {
    const hasHindiTrack = source.audio_tracks.some(
      (t) => t.lang === 'hi' || /\bhindi\b/i.test(t.label || '')
    );
    const hasEnglishTrack = source.audio_tracks.some(
      (t) => t.lang === 'en' || /\benglish\b/i.test(t.label || '')
    );

    if (hasHindiTrack && !hasEnglishTrack) return 'hindi';
    if (hasEnglishTrack) return 'english';
  }

  // 5. Fallback for unclassified sources
  return 'unknown';
}

/**
 * Groups an array of ServerSource objects into language buckets.
 * No source is dropped; unclassified sources are assigned to the 'unknown' bucket.
 *
 * @param sources List of raw ServerSource objects
 * @returns LanguageBucket containing english, hindi, and unknown arrays
 */
export function groupSourcesByLanguage(sources: ServerSource[]): LanguageBucket {
  const buckets: LanguageBucket = {
    english: [],
    hindi: [],
    unknown: []
  };

  if (!Array.isArray(sources) || sources.length === 0) {
    return buckets;
  }

  for (const source of sources) {
    const lang = classifySourceLanguage(source);
    buckets[lang].push(source);
  }

  return buckets;
}
