/**
 * TypeScript type definitions for EPUBCheck JSON output.
 */

/** Severity levels reported by EPUBCheck */
export type EpubCheckSeverity = 'FATAL' | 'ERROR' | 'WARNING' | 'USAGE' | 'INFO';

/** A location within an EPUB file */
export interface EpubCheckLocation {
    path: string;
    line: number;
    column: number;
    context?: string;
}

/** A single validation message from EPUBCheck */
export interface EpubCheckMessage {
    ID: string;
    severity: EpubCheckSeverity;
    message: string;
    additionalLocations: number;
    locations: EpubCheckLocation[];
    suggestion?: string;
}

/** Publication metadata from EPUBCheck */
export interface EpubCheckPublication {
    title: string;
    creator: string[];
    language: string;
    date?: string;
    identifier?: string;
    publisher?: string;
    subject?: string[];
    rights?: string;
    description?: string;
    nPages?: number;
    nCharacters?: number;
    nImages?: number;
    nAudios?: number;
    nVideos?: number;
    hasEncryption?: boolean;
    hasSignatures?: boolean;
    hasAudio?: boolean;
    hasVideo?: boolean;
    hasFixedLayout?: boolean;
    hasScripts?: boolean;
    isBackwardCompatible?: boolean;
    renditionLayout?: string;
    ePubVersion?: string;
    embeddedFonts?: string[];
    refFonts?: string[];
}

/** Checker information from EPUBCheck */
export interface EpubCheckChecker {
    name: string;
    version?: string;
    checkerVersion?: string;
    nativeSupportedVersion?: string;
    path?: string;
    filename?: string;
}

/** An item in the EPUB manifest */
export interface EpubCheckItem {
    id: string;
    fileName: string;
    media_type: string;
    compressedSize?: number;
    uncompressedSize?: number;
    isSpineItem?: boolean;
    spineIndex?: number;
    isLinear?: boolean;
    renditionLayout?: string;
}

/** Complete EPUBCheck JSON output */
export interface EpubCheckResult {
    checker: EpubCheckChecker;
    publication?: EpubCheckPublication;
    items?: EpubCheckItem[];
    messages: EpubCheckMessage[];
}

/** Internal result wrapping EPUBCheck output with execution metadata */
export interface ValidationResult {
    success: boolean;
    epubDir: string;
    epubCheckResult?: EpubCheckResult;
    error?: string;
    epubOutputPath?: string;
}
