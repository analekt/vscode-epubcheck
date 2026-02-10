import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detects EPUB projects within the workspace by finding mimetype files.
 */
export class EpubDetector {

    /**
     * Find all EPUB project directories in the workspace.
     * An EPUB project is identified by the presence of a `mimetype` file
     * containing "application/epub+zip".
     *
     * @returns Array of absolute paths to EPUB root directories
     */
    static async detectEpubDirectories(): Promise<string[]> {
        const mimetypeFiles = await vscode.workspace.findFiles(
            '**/mimetype',
            '{**/node_modules/**,**/.git/**}'
        );

        const epubDirs: string[] = [];

        for (const uri of mimetypeFiles) {
            try {
                const content = fs.readFileSync(uri.fsPath, 'utf-8').trim();
                if (content === 'application/epub+zip') {
                    epubDirs.push(path.dirname(uri.fsPath));
                }
            } catch {
                // Skip files we can't read
            }
        }

        return epubDirs;
    }

    /**
     * Check if a given directory is a valid EPUB project.
     *
     * @param dirPath Absolute path to the directory
     * @returns true if the directory contains a valid mimetype file
     */
    static isEpubDirectory(dirPath: string): boolean {
        const mimetypePath = path.join(dirPath, 'mimetype');
        try {
            if (!fs.existsSync(mimetypePath)) {
                return false;
            }
            const content = fs.readFileSync(mimetypePath, 'utf-8').trim();
            return content === 'application/epub+zip';
        } catch {
            return false;
        }
    }

    /**
     * Allow user to select which EPUB directories to process when multiple
     * are found.
     *
     * @param epubDirs Array of EPUB directory paths
     * @returns Selected directory paths, or undefined if cancelled
     */
    static async selectEpubDirectories(
        epubDirs: string[]
    ): Promise<string[] | undefined> {
        if (epubDirs.length === 0) {
            vscode.window.showWarningMessage(
                'EPUBCheck: No EPUB projects found in the workspace. ' +
                'An EPUB project must contain a "mimetype" file.'
            );
            return undefined;
        }

        if (epubDirs.length === 1) {
            return epubDirs;
        }

        // Multiple EPUBs found: let user select
        const items: vscode.QuickPickItem[] = [
            {
                label: 'All EPUB Projects',
                description: `${epubDirs.length} projects found`,
                picked: true,
            },
            ...epubDirs.map((dir) => ({
                label: path.basename(dir),
                description: dir,
            })),
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select EPUB projects to process',
            canPickMany: true,
        });

        if (!selected || selected.length === 0) {
            return undefined;
        }

        // Check if "All" was selected
        if (selected.some((s) => s.label === 'All EPUB Projects')) {
            return epubDirs;
        }

        return selected
            .map((s) => s.description)
            .filter((d): d is string => d !== undefined);
    }
}
