import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Configuration } from './configuration';
import { EpubDetector } from './epubDetector';
import { EpubCheckRunner } from './epubcheckRunner';
import { DiagnosticsProvider } from './diagnosticsProvider';
import { StatusBar } from './statusBar';
import { ReportGenerator } from './reportGenerator';
import { EpubExtractor } from './epubExtractor';
import { ValidationResult } from './types/epubcheck';

/** Output channel for extension logs */
let outputChannel: vscode.OutputChannel;

/** Diagnostics provider instance */
let diagnosticsProvider: DiagnosticsProvider;

/** Status bar instance */
let statusBar: StatusBar;

/**
 * Extension activation.
 * Called when the extension is activated (workspace contains mimetype file
 * or a command is executed).
 */
export function activate(context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('EPUBCheck');
    diagnosticsProvider = new DiagnosticsProvider();
    statusBar = new StatusBar();

    outputChannel.appendLine('EPUBCheck extension activated.');

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'epubcheck.generateAndValidate',
            (uri?: vscode.Uri) => handleGenerateAndValidate(uri)
        ),
        vscode.commands.registerCommand(
            'epubcheck.generateOnly',
            (uri?: vscode.Uri) => handleGenerateOnly(uri)
        ),
        vscode.commands.registerCommand(
            'epubcheck.validateWithReport',
            (uri?: vscode.Uri) => handleValidateWithReport(uri)
        ),
        vscode.commands.registerCommand(
            'epubcheck.unzipAndValidate',
            (uri?: vscode.Uri) => handleUnzipAndValidate(uri)
        ),
        vscode.commands.registerCommand(
            'epubcheck.selectJarPath',
            () => Configuration.browseJarPath()
        ),
        vscode.commands.registerCommand(
            'epubcheck.selectReportDirectory',
            () => Configuration.browseReportDirectory()
        )
    );

    // Register disposables
    context.subscriptions.push(
        outputChannel,
        diagnosticsProvider.getDiagnosticCollection(),
        statusBar.getStatusBarItem()
    );

    // Check if this is the first time the user has installed the extension
    const hasShownEpubCheckLink = context.globalState.get<boolean>('hasShownEpubCheckLink', false);
    if (!hasShownEpubCheckLink) {
        vscode.window.showInformationMessage(
            'EPUBCheck: enhanced for VS Code. Please ensure you have EPUBCheck installed.',
            'Download EPUBCheck'
        ).then(selection => {
            if (selection === 'Download EPUBCheck') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/w3c/epubcheck/releases'));
            }
        });
        context.globalState.update('hasShownEpubCheckLink', true);
    }
}

/**
 * Extension deactivation.
 */
export function deactivate(): void {
    // Cleanup handled by disposables
}

/**
 * Resolve which EPUB directories to process.
 * If a URI is provided (from context menu), use that directory.
 * Otherwise, detect all EPUBs in the workspace.
 */
async function resolveEpubDirs(uri?: vscode.Uri): Promise<string[] | undefined> {
    if (uri) {
        // Context menu: use the selected folder
        const dirPath = uri.fsPath;
        if (EpubDetector.isEpubDirectory(dirPath)) {
            return [dirPath];
        } else {
            vscode.window.showWarningMessage(
                `"${path.basename(dirPath)}" is not a valid EPUB project. ` +
                'An EPUB project must contain a "mimetype" file with content "application/epub+zip".'
            );
            return undefined;
        }
    }

    // Command palette: detect all EPUBs
    const epubDirs = await EpubDetector.detectEpubDirectories();
    return EpubDetector.selectEpubDirectories(epubDirs);
}

/**
 * Command: EPUBCheck: Generate and Validate EPUB
 */
async function handleGenerateAndValidate(uri?: vscode.Uri): Promise<void> {
    if (!(await Configuration.validateJarPath())) {
        return;
    }

    const epubDirs = await resolveEpubDirs(uri);
    if (!epubDirs || epubDirs.length === 0) {
        return;
    }

    statusBar.setRunning();

    const results: ValidationResult[] = [];

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'EPUBCheck',
            cancellable: false,
        },
        async (progress) => {
            for (let i = 0; i < epubDirs.length; i++) {
                const dir = epubDirs[i];
                const dirName = path.basename(dir);
                progress.report({
                    message: `Validating ${dirName}... (${i + 1}/${epubDirs.length})`,
                    increment: (100 / epubDirs.length),
                });

                const result = await EpubCheckRunner.run(dir, true);
                results.push(result);

                if (result.error) {
                    vscode.window.showErrorMessage(
                        `EPUBCheck: ${result.error}`
                    );
                }
            }
        }
    );

    // Update diagnostics
    diagnosticsProvider.updateDiagnostics(results);

    // Update status bar
    updateStatusBar(results);

    // Show summary
    showSummary(results);
}

/**
 * Command: EPUBCheck: Generate EPUB Only
 */
async function handleGenerateOnly(uri?: vscode.Uri): Promise<void> {
    if (!(await Configuration.validateJarPath())) {
        return;
    }

    const epubDirs = await resolveEpubDirs(uri);
    if (!epubDirs || epubDirs.length === 0) {
        return;
    }

    statusBar.setRunning();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'EPUBCheck',
            cancellable: false,
        },
        async (progress) => {
            for (let i = 0; i < epubDirs.length; i++) {
                const dir = epubDirs[i];
                const dirName = path.basename(dir);
                progress.report({
                    message: `Generating ${dirName}... (${i + 1}/${epubDirs.length})`,
                    increment: (100 / epubDirs.length),
                });

                const result = await EpubCheckRunner.generateOnly(dir);

                if (result.error) {
                    vscode.window.showErrorMessage(
                        `EPUBCheck: ${result.error}`
                    );
                } else {
                    const action = await vscode.window.showInformationMessage(
                        `EPUBCheck: ${dirName}.epub generated successfully.`,
                        'Open'
                    );
                    if (action === 'Open' && result.epubOutputPath) {
                        await vscode.env.openExternal(
                            vscode.Uri.file(result.epubOutputPath)
                        );
                    }
                }
            }
        }
    );

    statusBar.setIdle();
}

/**
 * Command: EPUBCheck: Validate and Export EPUB with Report
 */
async function handleValidateWithReport(uri?: vscode.Uri): Promise<void> {
    if (!(await Configuration.validateJarPath())) {
        return;
    }

    const epubDirs = await resolveEpubDirs(uri);
    if (!epubDirs || epubDirs.length === 0) {
        return;
    }

    statusBar.setRunning();

    const results: ValidationResult[] = [];

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'EPUBCheck',
            cancellable: false,
        },
        async (progress) => {
            for (let i = 0; i < epubDirs.length; i++) {
                const dir = epubDirs[i];
                const dirName = path.basename(dir);
                progress.report({
                    message: `Validating ${dirName}... (${i + 1}/${epubDirs.length})`,
                    increment: (80 / epubDirs.length),
                });

                const result = await EpubCheckRunner.run(dir, true);
                results.push(result);

                if (result.error) {
                    vscode.window.showErrorMessage(
                        `EPUBCheck: ${result.error}`
                    );
                }
            }

            // Generate report
            progress.report({ message: 'Generating report...', increment: 20 });
            const reportPath = await ReportGenerator.generateReport(results);

            if (reportPath) {
                const action = await vscode.window.showInformationMessage(
                    `EPUBCheck: Report saved to ${path.basename(reportPath)}`,
                    'Open Report'
                );
                if (action === 'Open Report') {
                    const doc = await vscode.workspace.openTextDocument(reportPath);
                    await vscode.window.showTextDocument(doc);
                }
            } else {
                vscode.window.showErrorMessage(
                    'EPUBCheck: Failed to save report. Check the report directory setting.'
                );
            }
        }
    );

    // Update diagnostics
    diagnosticsProvider.updateDiagnostics(results);

    // Update status bar
    updateStatusBar(results);
}

/**
 * Command: EPUBCheck: Unzip EPUB and Validate
 * Finds all .epub files in the workspace, extracts them, and validates.
 */
async function handleUnzipAndValidate(uri?: vscode.Uri): Promise<void> {
    if (!(await Configuration.validateJarPath())) {
        return;
    }

    let epubFiles: string[];
    if (uri) {
        // Context menu: use the selected .epub file
        epubFiles = [uri.fsPath];
    } else {
        // Command palette: find all .epub files in workspace
        epubFiles = await EpubExtractor.findEpubFiles();
        if (epubFiles.length === 0) {
            vscode.window.showWarningMessage(
                'EPUBCheck: No .epub files found in the workspace.'
            );
            return;
        }
    }

    statusBar.setRunning();

    const results: ValidationResult[] = [];

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'EPUBCheck',
            cancellable: false,
        },
        async (progress) => {
            for (let i = 0; i < epubFiles.length; i++) {
                const epubFile = epubFiles[i];
                const fileName = path.basename(epubFile);

                // Extract
                progress.report({
                    message: `Extracting ${fileName}... (${i + 1}/${epubFiles.length})`,
                    increment: (50 / epubFiles.length),
                });

                const extractedDir = await EpubExtractor.extract(epubFile);
                if (!extractedDir) {
                    vscode.window.showErrorMessage(
                        `EPUBCheck: Failed to extract "${fileName}".`
                    );
                    continue;
                }

                // Delete original .epub if configured
                if (Configuration.getDeleteEpubAfterUnzip()) {
                    try {
                        fs.unlinkSync(epubFile);
                    } catch {
                        // Ignore deletion errors
                    }
                }

                // Validate
                progress.report({
                    message: `Validating ${fileName}... (${i + 1}/${epubFiles.length})`,
                    increment: (50 / epubFiles.length),
                });

                const result = await EpubCheckRunner.run(extractedDir, false);
                results.push(result);

                if (result.error) {
                    vscode.window.showErrorMessage(
                        `EPUBCheck: ${result.error}`
                    );
                }
            }
        }
    );

    // Update diagnostics
    diagnosticsProvider.updateDiagnostics(results);

    // Update status bar
    updateStatusBar(results);

    // Show summary
    showSummary(results);
}

/**
 * Count errors and warnings from validation results.
 */
function countMessages(results: ValidationResult[]): {
    totalErrors: number;
    totalWarnings: number;
    hasExecutionError: boolean;
} {
    let totalErrors = 0;
    let totalWarnings = 0;
    let hasExecutionError = false;

    for (const result of results) {
        if (!result.epubCheckResult) {
            if (result.error) {
                hasExecutionError = true;
            }
            continue;
        }

        for (const msg of result.epubCheckResult.messages) {
            // Count per location to match the Problems panel entries
            const locationCount = Math.max(1, msg.locations.length);
            if (msg.severity === 'FATAL' || msg.severity === 'ERROR') {
                totalErrors += locationCount;
            } else if (msg.severity === 'WARNING') {
                totalWarnings += locationCount;
            }
        }
    }

    return { totalErrors, totalWarnings, hasExecutionError };
}

/**
 * Update the status bar based on validation results.
 */
function updateStatusBar(results: ValidationResult[]): void {
    const { totalErrors, totalWarnings, hasExecutionError } = countMessages(results);

    if (!hasExecutionError && totalErrors === 0) {
        statusBar.setSuccess(results.length);
    } else {
        statusBar.setErrors(totalErrors, totalWarnings);
    }
}

/**
 * Show a summary notification after validation.
 */
function showSummary(results: ValidationResult[]): void {
    const { totalErrors, totalWarnings } = countMessages(results);

    if (totalErrors === 0 && totalWarnings === 0) {
        vscode.window.showInformationMessage(
            'EPUBCheck: Validation passed with no errors or warnings.'
        );
    } else {
        const parts: string[] = [];
        if (totalErrors > 0) {
            parts.push(`${totalErrors} error${totalErrors !== 1 ? 's' : ''}`);
        }
        if (totalWarnings > 0) {
            parts.push(
                `${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`
            );
        }
        vscode.window.showWarningMessage(
            `EPUBCheck: Found ${parts.join(' and ')}. See Problems panel for details.`
        );
    }
}
