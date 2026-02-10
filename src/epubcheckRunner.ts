import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Configuration } from './configuration';
import { EpubCheckResult, ValidationResult } from './types/epubcheck';

/**
 * Executes EPUBCheck as a Java child process.
 */
export class EpubCheckRunner {

    /**
     * Run EPUBCheck on an expanded EPUB directory to validate and generate .epub.
     *
     * @param epubDir Absolute path to the EPUB directory
     * @param save Whether to save (generate) the .epub file
     * @returns Validation result with parsed JSON output
     */
    static async run(
        epubDir: string,
        save: boolean
    ): Promise<ValidationResult> {
        const jarPath = Configuration.getJarPath();
        const javaPath = Configuration.getJavaPath();
        const timeout = Configuration.getTimeout();

        // Use a temp file for JSON output to avoid stdout pollution in EPUBCheck v4.x
        const jsonTmpFile = path.join(
            os.tmpdir(),
            `epubcheck-${Date.now()}.json`
        );

        const defaultEpubPath = save ? EpubCheckRunner.getDefaultEpubPath(epubDir) : undefined;

        // Protect existing EPUB from being overwritten by EPUBCheck
        const protectedPath = save ? EpubCheckRunner.protectExistingEpub(defaultEpubPath) : undefined;

        const args = ['-jar', jarPath, '-mode', 'exp', epubDir, '--json', jsonTmpFile];
        if (save) {
            args.push('--save');
        }

        return new Promise<ValidationResult>((resolve) => {
            let stderr = '';
            let timedOut = false;

            const proc = spawn(javaPath, args, {
                timeout: timeout * 1000,
            });

            proc.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (timedOut || code === null) {
                    EpubCheckRunner.cleanupTmpFile(jsonTmpFile);
                    resolve({
                        success: false,
                        epubDir,
                        error: `EPUBCheck timed out after ${timeout} seconds. You can increase the timeout in settings (epubcheck.timeout).`,
                    });
                    return;
                }

                try {
                    const jsonContent = fs.readFileSync(jsonTmpFile, 'utf-8');
                    const result: EpubCheckResult = JSON.parse(jsonContent);
                    EpubCheckRunner.cleanupTmpFile(jsonTmpFile);

                    const hasErrors = result.messages.some(
                        (m) => m.severity === 'FATAL' || m.severity === 'ERROR'
                    );

                    const epubOutputPath = save
                        ? EpubCheckRunner.findGeneratedEpub(epubDir, defaultEpubPath, protectedPath)
                        : undefined;

                    resolve({
                        success: !hasErrors,
                        epubDir,
                        epubCheckResult: result,
                        epubOutputPath,
                    });
                } catch {
                    EpubCheckRunner.cleanupTmpFile(jsonTmpFile);
                    let errorMsg = `EPUBCheck failed to produce valid output.`;
                    if (stderr) {
                        errorMsg += `\nDetails: ${stderr.trim()}`;
                    }
                    if (code !== null && code !== 0) {
                        errorMsg += `\nExit code: ${code}`;
                    }
                    resolve({
                        success: false,
                        epubDir,
                        error: errorMsg,
                    });
                }
            });

            proc.on('error', (err: NodeJS.ErrnoException) => {
                EpubCheckRunner.cleanupTmpFile(jsonTmpFile);
                if (err.code === 'ENOENT') {
                    resolve({
                        success: false,
                        epubDir,
                        error:
                            `Java not found at "${javaPath}". ` +
                            'Please install Java 11 or above, or configure the path in settings (epubcheck.javaPath).\n\n' +
                            'Download Java: https://adoptium.net/',
                    });
                } else if (err.code === 'ETIMEDOUT' || (err as any).killed) {
                    timedOut = true;
                } else {
                    resolve({
                        success: false,
                        epubDir,
                        error: `Failed to run EPUBCheck: ${err.message}`,
                    });
                }
            });
        });
    }

    /**
     * Temporarily rename an existing EPUB file before EPUBCheck runs,
     * so that EPUBCheck doesn't overwrite it.
     *
     * @returns The temporary path, or undefined if no file to protect
     */
    private static protectExistingEpub(epubPath: string | undefined): string | undefined {
        if (!epubPath || !fs.existsSync(epubPath)) {
            return undefined;
        }
        const dir = path.dirname(epubPath);
        const tmpName = `.epubcheck-protect-${Date.now()}${path.extname(epubPath)}`;
        const tmpPath = path.join(dir, tmpName);
        try {
            fs.renameSync(epubPath, tmpPath);
            return tmpPath;
        } catch {
            return undefined;
        }
    }

    /**
     * Restore a protected EPUB file to a unique name after EPUBCheck completes.
     */
    private static restoreProtectedEpub(
        protectedPath: string | undefined,
        targetPath: string
    ): void {
        if (!protectedPath || !fs.existsSync(protectedPath)) {
            return;
        }
        try {
            const restorePath = EpubCheckRunner.getUniquePath(targetPath);
            fs.renameSync(protectedPath, restorePath);
        } catch {
            // If restore fails, try to at least put it back at original name
            try {
                if (!fs.existsSync(targetPath)) {
                    fs.renameSync(protectedPath, targetPath);
                }
            } catch { /* ignore */ }
        }
    }

    /**
     * Find the generated EPUB file after EPUBCheck completes.
     * EPUBCheck's --save may place the file inside the source directory or as a sibling.
     * If found inside, move it to the sibling (target) location.
     *
     * @returns The final path of the EPUB, or undefined if not found
     */
    private static findGeneratedEpub(
        epubDir: string,
        targetPath: string | undefined,
        protectedPath: string | undefined
    ): string | undefined {
        if (!targetPath) {
            return undefined;
        }

        const folderName = path.basename(epubDir);
        const insidePath = path.join(epubDir, `${folderName}.epub`);

        // Check if EPUB was generated inside the source directory
        if (fs.existsSync(insidePath)) {
            try {
                fs.renameSync(insidePath, targetPath);
            } catch {
                // Restore protected file and return insidePath
                EpubCheckRunner.restoreProtectedEpub(protectedPath, targetPath);
                return insidePath;
            }
            EpubCheckRunner.restoreProtectedEpub(protectedPath, targetPath);
            return targetPath;
        }

        // Check if EPUB is already at the target (sibling) path
        if (fs.existsSync(targetPath)) {
            EpubCheckRunner.restoreProtectedEpub(protectedPath, targetPath);
            return targetPath;
        }

        // No EPUB generated; restore protected file to original name
        EpubCheckRunner.restoreProtectedEpub(protectedPath, targetPath);
        return undefined;
    }

    /**
     * Get a unique file path by appending a number if the file already exists.
     * e.g., "book.epub" → "book (2).epub" → "book (3).epub"
     */
    private static getUniquePath(filePath: string): string {
        if (!fs.existsSync(filePath)) {
            return filePath;
        }

        const dir = path.dirname(filePath);
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);

        let counter = 2;
        let candidate: string;
        do {
            candidate = path.join(dir, `${base} (${counter})${ext}`);
            counter++;
        } while (fs.existsSync(candidate));

        return candidate;
    }

    /**
     * Remove a temporary file if it exists.
     */
    private static cleanupTmpFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch {
            // Ignore cleanup errors
        }
    }

    /**
     * Get the default EPUB output path for a given EPUB directory.
     */
    static getDefaultEpubPath(epubDir: string): string {
        const folderName = path.basename(epubDir);
        return path.join(path.dirname(epubDir), `${folderName}.epub`);
    }

    /**
     * Run EPUBCheck on an expanded EPUB directory to generate .epub only
     * (without JSON validation output).
     *
     * @param epubDir Absolute path to the EPUB directory
     * @returns Validation result
     */
    static async generateOnly(epubDir: string): Promise<ValidationResult> {
        const jarPath = Configuration.getJarPath();
        const javaPath = Configuration.getJavaPath();
        const timeout = Configuration.getTimeout();

        const defaultPath = EpubCheckRunner.getDefaultEpubPath(epubDir);

        // Protect existing EPUB from being overwritten by EPUBCheck
        const protectedPath = EpubCheckRunner.protectExistingEpub(defaultPath);

        const args = ['-jar', jarPath, '-mode', 'exp', epubDir, '--save'];

        return new Promise<ValidationResult>((resolve) => {
            let stderr = '';
            let timedOut = false;

            const proc = spawn(javaPath, args, {
                timeout: timeout * 1000,
            });

            proc.stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (timedOut || code === null) {
                    resolve({
                        success: false,
                        epubDir,
                        error: `EPUBCheck timed out after ${timeout} seconds. You can increase the timeout in settings (epubcheck.timeout).`,
                    });
                } else if (code === 0 || code === 1) {
                    const finalPath = EpubCheckRunner.findGeneratedEpub(epubDir, defaultPath, protectedPath);

                    // EPUBCheck aborts EPUB generation when errors are found
                    let error: string | undefined;
                    if (!finalPath && code === 1) {
                        error = 'EPUBCheck aborted EPUB generation due to validation errors. Fix the errors and try again.';
                    } else if (!finalPath) {
                        error = 'EPUBCheck did not generate an EPUB file.';
                    }

                    resolve({
                        success: finalPath !== undefined,
                        epubDir,
                        epubOutputPath: finalPath,
                        error,
                    });
                } else {
                    resolve({
                        success: false,
                        epubDir,
                        error: `EPUBCheck failed with exit code ${code}.\n${stderr}`,
                    });
                }
            });

            proc.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'ENOENT') {
                    resolve({
                        success: false,
                        epubDir,
                        error:
                            `Java not found at "${javaPath}". ` +
                            'Please install Java 11 or above, or configure the path in settings (epubcheck.javaPath).\n\n' +
                            'Download Java: https://adoptium.net/',
                    });
                } else if (err.code === 'ETIMEDOUT' || (err as any).killed) {
                    timedOut = true;
                } else {
                    resolve({
                        success: false,
                        epubDir,
                        error: `Failed to run EPUBCheck: ${err.message}`,
                    });
                }
            });
        });
    }
}
