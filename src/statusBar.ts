import * as vscode from 'vscode';

/**
 * Manages the status bar item for EPUBCheck.
 * Shows validation state and allows click-to-run.
 */
export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'epubcheck.generateAndValidate';
        this.statusBarItem.tooltip = 'Click to run EPUBCheck validation';
        this.setIdle();
        this.statusBarItem.show();
    }

    /**
     * Set status bar to idle state.
     */
    setIdle(): void {
        this.statusBarItem.text = '$(book) EPUBCheck';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status bar to running state.
     */
    setRunning(): void {
        this.statusBarItem.text = '$(loading~spin) EPUBCheck: Running...';
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status bar to success state.
     *
     * @param epubCount Number of EPUBs validated
     */
    setSuccess(epubCount: number): void {
        const label = epubCount > 1 ? `${epubCount} EPUBs` : 'EPUB';
        this.statusBarItem.text = `$(check) EPUBCheck: ${label} OK`;
        this.statusBarItem.backgroundColor = undefined;
    }

    /**
     * Set status bar to error state.
     *
     * @param errorCount Total number of errors
     * @param warningCount Total number of warnings
     */
    setErrors(errorCount: number, warningCount: number): void {
        const parts: string[] = [];
        if (errorCount > 0) {
            parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
        }
        if (warningCount > 0) {
            parts.push(
                `${warningCount} warning${warningCount !== 1 ? 's' : ''}`
            );
        }
        const summary = parts.length > 0 ? parts.join(', ') : 'Failed';
        this.statusBarItem.text = `$(error) EPUBCheck: ${summary}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
        );
    }

    /**
     * Get the status bar item for disposal.
     */
    getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }

    /**
     * Dispose the status bar item.
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
