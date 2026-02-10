import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EpubCheckMessage, EpubCheckSeverity, ValidationResult } from './types/epubcheck';

/**
 * Converts EPUBCheck validation results into VS Code Diagnostics
 * for display in the Problems panel and inline squiggles.
 */
export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection =
            vscode.languages.createDiagnosticCollection('epubcheck');
    }

    /**
     * Update diagnostics from validation results.
     * Groups messages by file and sets diagnostics for each file URI.
     *
     * @param results Array of validation results (one per EPUB project)
     */
    updateDiagnostics(results: ValidationResult[]): void {
        // Clear previous diagnostics
        this.diagnosticCollection.clear();

        // Map: file URI string → Diagnostic[]
        const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

        // Cache file lines to avoid re-reading the same file
        const fileLinesCache = new Map<string, string[] | null>();

        for (const result of results) {
            if (!result.epubCheckResult) {
                continue;
            }

            for (const message of result.epubCheckResult.messages) {
                for (const location of message.locations) {
                    const filePath = path.join(result.epubDir, location.path);
                    const fileUri = vscode.Uri.file(filePath).toString();

                    if (!diagnosticsMap.has(fileUri)) {
                        diagnosticsMap.set(fileUri, []);
                    }

                    // Read file lines (cached)
                    if (!fileLinesCache.has(filePath)) {
                        fileLinesCache.set(filePath, DiagnosticsProvider.readFileLines(filePath));
                    }
                    const fileLines = fileLinesCache.get(filePath) ?? null;

                    const diagnostic = this.createDiagnostic(message, location, fileLines);
                    diagnosticsMap.get(fileUri)!.push(diagnostic);
                }
            }
        }

        // Set diagnostics for each file
        for (const [uriString, diagnostics] of diagnosticsMap) {
            const uri = vscode.Uri.parse(uriString);
            this.diagnosticCollection.set(uri, diagnostics);
        }
    }

    /**
     * Clear all diagnostics.
     */
    clear(): void {
        this.diagnosticCollection.clear();
    }

    /**
     * Get the diagnostic collection for disposal.
     */
    getDiagnosticCollection(): vscode.DiagnosticCollection {
        return this.diagnosticCollection;
    }

    /**
     * Create a VS Code Diagnostic from an EPUBCheck message and location.
     *
     * @param message EPUBCheck message
     * @param location Error location
     * @param fileLines Cached lines of the source file (null if unreadable)
     */
    private createDiagnostic(
        message: EpubCheckMessage,
        location: { line: number; column: number; context?: string },
        fileLines: string[] | null
    ): vscode.Diagnostic {
        // EPUBCheck uses 1-based line/column, VS Code uses 0-based
        const line = Math.max(0, location.line - 1);
        const column = Math.max(0, location.column - 1);

        // Determine the end column from actual file content
        let endColumn: number;
        if (fileLines && line < fileLines.length) {
            endColumn = fileLines[line].length;
        } else {
            endColumn = column + 1;
        }
        // Ensure the range has at least 1 character
        if (endColumn <= column) {
            endColumn = column + 1;
        }

        const range = new vscode.Range(
            new vscode.Position(line, column),
            new vscode.Position(line, endColumn)
        );

        const severity = DiagnosticsProvider.mapSeverity(message.severity);

        let diagnosticMessage = message.message;
        if (message.suggestion) {
            diagnosticMessage += `\nSuggestion: ${message.suggestion}`;
        }

        const diagnostic = new vscode.Diagnostic(
            range,
            diagnosticMessage,
            severity
        );

        diagnostic.code = message.ID;
        diagnostic.source = 'EPUBCheck';

        return diagnostic;
    }

    /**
     * Read a file and return its lines, or null if the file cannot be read.
     */
    private static readFileLines(filePath: string): string[] | null {
        try {
            return fs.readFileSync(filePath, 'utf-8').split('\n');
        } catch {
            return null;
        }
    }

    /**
     * Map EPUBCheck severity to VS Code DiagnosticSeverity.
     */
    static mapSeverity(severity: EpubCheckSeverity): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'FATAL':
            case 'ERROR':
                return vscode.DiagnosticSeverity.Error;
            case 'WARNING':
                return vscode.DiagnosticSeverity.Warning;
            case 'USAGE':
                return vscode.DiagnosticSeverity.Information;
            case 'INFO':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }
}
