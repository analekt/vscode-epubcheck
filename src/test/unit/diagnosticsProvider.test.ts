import * as assert from 'assert';
import { DiagnosticsProvider } from '../../diagnosticsProvider';
import { DiagnosticSeverity } from 'vscode';

describe('DiagnosticsProvider', () => {
    describe('mapSeverity', () => {
        it('should map FATAL to Error', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('FATAL'),
                DiagnosticSeverity.Error
            );
        });

        it('should map ERROR to Error', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('ERROR'),
                DiagnosticSeverity.Error
            );
        });

        it('should map WARNING to Warning', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('WARNING'),
                DiagnosticSeverity.Warning
            );
        });

        it('should map USAGE to Information', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('USAGE'),
                DiagnosticSeverity.Information
            );
        });

        it('should map INFO to Hint', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('INFO'),
                DiagnosticSeverity.Hint
            );
        });

        it('should map unknown severity to Error', () => {
            assert.strictEqual(
                DiagnosticsProvider.mapSeverity('UNKNOWN' as any),
                DiagnosticSeverity.Error
            );
        });
    });
});
