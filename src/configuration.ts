import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Manages extension configuration with validation and path expansion.
 */
export class Configuration {

    /**
     * Get the path to the epubcheck.jar file.
     * Returns empty string if not configured.
     */
    static getJarPath(): string {
        const config = vscode.workspace.getConfiguration('epubcheck');
        const jarPath = config.get<string>('jarPath', '');
        return Configuration.expandPath(jarPath);
    }

    /**
     * Get the path to the Java executable.
     */
    static getJavaPath(): string {
        const config = vscode.workspace.getConfiguration('epubcheck');
        return config.get<string>('javaPath', 'java');
    }

    /**
     * Get the report format setting.
     */
    static getReportFormat(): 'markdown' | 'text' | 'json' {
        const config = vscode.workspace.getConfiguration('epubcheck');
        return config.get<'markdown' | 'text' | 'json'>('reportFormat', 'markdown');
    }

    /**
     * Get the report directory path.
     * If not configured, falls back to the workspace root.
     */
    static getReportDirectory(): string {
        const config = vscode.workspace.getConfiguration('epubcheck');
        const dir = config.get<string>('reportDirectory', '');
        if (dir) {
            return Configuration.expandPath(dir);
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return Configuration.expandPath('~/Desktop');
    }

    /**
     * Get the timeout in seconds.
     */
    static getTimeout(): number {
        const config = vscode.workspace.getConfiguration('epubcheck');
        return config.get<number>('timeout', 120);
    }

    /**
     * Validate that the jar path is configured and exists.
     * Shows an error message with a link to settings if not.
     * @returns true if configuration is valid
     */
    static async validateJarPath(): Promise<boolean> {
        const jarPath = Configuration.getJarPath();

        if (!jarPath) {
            const action = await vscode.window.showErrorMessage(
                'EPUBCheck: Please configure the path to epubcheck.jar in settings.',
                'Open Settings'
            );
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand(
                    'workbench.action.openSettings',
                    'epubcheck.jarPath'
                );
            }
            return false;
        }

        if (!fs.existsSync(jarPath)) {
            const action = await vscode.window.showErrorMessage(
                `EPUBCheck: epubcheck.jar not found at "${jarPath}". Please check your settings.`,
                'Open Settings'
            );
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand(
                    'workbench.action.openSettings',
                    'epubcheck.jarPath'
                );
            }
            return false;
        }

        return true;
    }

    /**
     * Expand ~ to home directory in a path.
     */
    static expandPath(filePath: string): string {
        if (!filePath) {
            return filePath;
        }
        if (filePath === '~' || filePath.startsWith('~/')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }
}
