import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Extracts .epub files (ZIP archives) using OS commands.
 */
export class EpubExtractor {

    /**
     * Find all .epub files in the workspace.
     *
     * @returns Array of absolute paths to .epub files
     */
    static async findEpubFiles(): Promise<string[]> {
        const uris = await vscode.workspace.findFiles('**/*.epub', '**/node_modules/**');
        return uris.map((uri) => uri.fsPath).sort();
    }

    /**
     * Extract an .epub file to a sibling directory with the same name.
     * e.g., /path/to/book.epub → /path/to/book/
     *
     * @param epubPath Absolute path to the .epub file
     * @returns Path to the extracted directory, or undefined on failure
     */
    static async extract(epubPath: string): Promise<string | undefined> {
        const dir = path.dirname(epubPath);
        const baseName = path.basename(epubPath, '.epub');
        const outputDir = EpubExtractor.getUniqueDirPath(path.join(dir, baseName));

        try {
            fs.mkdirSync(outputDir, { recursive: true });
        } catch {
            return undefined;
        }

        const isWindows = process.platform === 'win32';

        return new Promise<string | undefined>((resolve) => {
            let proc;

            if (isWindows) {
                // Windows 10+: use tar to extract zip
                proc = spawn('tar', ['-xf', epubPath, '-C', outputDir]);
            } else {
                // macOS / Linux: use unzip
                proc = spawn('unzip', ['-o', epubPath, '-d', outputDir]);
            }

            let stderr = '';

            proc.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(outputDir);
                } else {
                    resolve(undefined);
                }
            });

            proc.on('error', () => {
                resolve(undefined);
            });
        });
    }

    /**
     * Get a unique directory path by appending a number if the directory already exists.
     * e.g., "book" → "book (2)" → "book (3)"
     */
    private static getUniqueDirPath(dirPath: string): string {
        if (!fs.existsSync(dirPath)) {
            return dirPath;
        }

        let counter = 2;
        let candidate: string;
        do {
            candidate = `${dirPath} (${counter})`;
            counter++;
        } while (fs.existsSync(candidate));

        return candidate;
    }
}
