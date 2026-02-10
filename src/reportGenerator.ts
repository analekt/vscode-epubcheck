import * as fs from 'fs';
import * as path from 'path';
import { Configuration } from './configuration';
import { ValidationResult } from './types/epubcheck';

/**
 * Generates validation reports in different formats.
 */
export class ReportGenerator {

    /**
     * Generate a report from validation results and save it to disk.
     *
     * @param results Array of validation results
     * @returns Path to the saved report file, or undefined on failure
     */
    static async generateReport(
        results: ValidationResult[]
    ): Promise<string | undefined> {
        const format = Configuration.getReportFormat();
        const reportDir = Configuration.getReportDirectory();

        // Ensure report directory exists
        if (!fs.existsSync(reportDir)) {
            try {
                fs.mkdirSync(reportDir, { recursive: true });
            } catch {
                return undefined;
            }
        }

        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);

        // Build prefix from EPUB folder names
        const dirNames = results.map((r) => path.basename(r.epubDir)).join('_');

        let extension: string;
        let content: string;

        switch (format) {
            case 'markdown':
                extension = 'md';
                content = ReportGenerator.generateMarkdown(results);
                break;
            case 'text':
                extension = 'txt';
                content = ReportGenerator.generateText(results);
                break;
            case 'json':
                extension = 'json';
                content = ReportGenerator.generateJson(results);
                break;
            default:
                extension = 'md';
                content = ReportGenerator.generateMarkdown(results);
        }

        const fileName = `${dirNames}-epubcheck-report-${timestamp}.${extension}`;
        const filePath = path.join(reportDir, fileName);

        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return filePath;
        } catch {
            return undefined;
        }
    }

    /**
     * Generate a Markdown report.
     */
    static generateMarkdown(results: ValidationResult[]): string {
        const lines: string[] = [];
        lines.push('# EPUBCheck Validation Report');
        lines.push('');
        lines.push(`**Date**: ${new Date().toISOString()}`);
        lines.push(`**Projects validated**: ${results.length}`);
        lines.push('');

        for (const result of results) {
            const dirName = path.basename(result.epubDir);
            lines.push(`## ${dirName}`);
            lines.push('');
            lines.push(`**Directory**: \`${result.epubDir}\``);

            if (result.error) {
                lines.push('');
                lines.push(`> **Error**: ${result.error}`);
                lines.push('');
                continue;
            }

            if (!result.epubCheckResult) {
                lines.push('');
                lines.push('> No validation results available.');
                lines.push('');
                continue;
            }

            const checkResult = result.epubCheckResult;

            // Publication info
            if (checkResult.publication) {
                const pub = checkResult.publication;
                lines.push('');
                lines.push('### Publication Info');
                lines.push('');
                lines.push(`| Property | Value |`);
                lines.push(`|----------|-------|`);
                if (pub.title) {
                    lines.push(`| Title | ${pub.title} |`);
                }
                if (pub.creator && pub.creator.length > 0) {
                    lines.push(`| Creator | ${pub.creator.join(', ')} |`);
                }
                if (pub.language) {
                    lines.push(`| Language | ${pub.language} |`);
                }
                if (pub.ePubVersion) {
                    lines.push(`| EPUB Version | ${pub.ePubVersion} |`);
                }
            }

            // Messages
            const messages = checkResult.messages;
            if (messages.length === 0) {
                lines.push('');
                lines.push('✅ **No errors or warnings found.**');
            } else {
                const countLocations = (msgs: typeof messages) =>
                    msgs.reduce((sum, m) => sum + Math.max(1, m.locations.length), 0);

                const errorMsgs = messages.filter(
                    (m) => m.severity === 'FATAL' || m.severity === 'ERROR'
                );
                const warningMsgs = messages.filter(
                    (m) => m.severity === 'WARNING'
                );
                const usageMsgs = messages.filter((m) => m.severity === 'USAGE');
                const infoMsgs = messages.filter((m) => m.severity === 'INFO');

                lines.push('');
                lines.push('### Summary');
                lines.push('');
                lines.push(
                    `| Severity | Count |`
                );
                lines.push(`|----------|-------|`);
                if (errorMsgs.length > 0) {
                    lines.push(`| Errors | ${countLocations(errorMsgs)} |`);
                }
                if (warningMsgs.length > 0) {
                    lines.push(`| Warnings | ${countLocations(warningMsgs)} |`);
                }
                if (usageMsgs.length > 0) {
                    lines.push(`| Usage | ${countLocations(usageMsgs)} |`);
                }
                if (infoMsgs.length > 0) {
                    lines.push(`| Info | ${countLocations(infoMsgs)} |`);
                }

                lines.push('');
                lines.push('### Messages');
                lines.push('');
                lines.push(
                    '| Severity | ID | File | Line | Message |'
                );
                lines.push(
                    '|----------|----|------|------|---------|'
                );

                for (const msg of messages) {
                    const escapedMsg = msg.message.replace(/\|/g, '\\|');
                    if (msg.locations.length === 0) {
                        lines.push(
                            `| ${msg.severity} | ${msg.ID} | - | - | ${escapedMsg} |`
                        );
                    } else {
                        for (const loc of msg.locations) {
                            const line = loc.line >= 0 ? String(loc.line) : '-';
                            lines.push(
                                `| ${msg.severity} | ${msg.ID} | ${loc.path} | ${line} | ${escapedMsg} |`
                            );
                        }
                    }
                }
            }

            lines.push('');
            lines.push('---');
            lines.push('');
        }

        // Checker info
        const firstResult = results.find((r) => r.epubCheckResult);
        if (firstResult?.epubCheckResult?.checker) {
            const checker = firstResult.epubCheckResult.checker;
            const version = checker.checkerVersion || checker.version || 'unknown';
            lines.push(`*Generated by EPUBCheck v${version}*`);
        }

        return lines.join('\n');
    }

    /**
     * Generate a plain text report.
     */
    static generateText(results: ValidationResult[]): string {
        const lines: string[] = [];
        lines.push('EPUBCheck Validation Report');
        lines.push('='.repeat(40));
        lines.push(`Date: ${new Date().toISOString()}`);
        lines.push(`Projects validated: ${results.length}`);
        lines.push('');

        for (const result of results) {
            const dirName = path.basename(result.epubDir);
            lines.push(`--- ${dirName} ---`);
            lines.push(`Directory: ${result.epubDir}`);

            if (result.error) {
                lines.push(`ERROR: ${result.error}`);
                lines.push('');
                continue;
            }

            if (!result.epubCheckResult) {
                lines.push('No validation results available.');
                lines.push('');
                continue;
            }

            const messages = result.epubCheckResult.messages;
            if (messages.length === 0) {
                lines.push('No errors or warnings found.');
            } else {
                for (const msg of messages) {
                    if (msg.locations.length === 0) {
                        lines.push(
                            `${msg.severity} [${msg.ID}] -:- - ${msg.message}`
                        );
                    } else {
                        for (const loc of msg.locations) {
                            const line = loc.line >= 0 ? String(loc.line) : '-';
                            lines.push(
                                `${msg.severity} [${msg.ID}] ${loc.path}:${line} - ${msg.message}`
                            );
                        }
                    }
                    if (msg.suggestion) {
                        lines.push(`  Suggestion: ${msg.suggestion}`);
                    }
                }
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Generate a JSON report.
     */
    static generateJson(results: ValidationResult[]): string {
        const report = results.map((result) => ({
            directory: result.epubDir,
            success: result.success,
            error: result.error,
            ...(result.epubCheckResult || {}),
        }));
        return JSON.stringify(report, null, 2);
    }
}
