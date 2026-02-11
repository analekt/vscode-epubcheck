/**
 * Minimal mock of the vscode module for unit testing.
 * Only includes types and classes actually used by the source code.
 */

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3,
}

export class Position {
    constructor(public readonly line: number, public readonly character: number) {}
}

export class Range {
    constructor(public readonly start: Position, public readonly end: Position) {}
}

export class Diagnostic {
    code?: string | number;
    source?: string;
    constructor(
        public readonly range: Range,
        public readonly message: string,
        public readonly severity: DiagnosticSeverity
    ) {}
}

export class Uri {
    private constructor(public readonly fsPath: string, private readonly _scheme: string) {}
    static file(path: string): Uri {
        return new Uri(path, 'file');
    }
    static parse(value: string): Uri {
        return new Uri(value, 'parsed');
    }
    toString(): string {
        return `file://${this.fsPath}`;
    }
}

export class ThemeColor {
    constructor(public readonly id: string) {}
}

export enum StatusBarAlignment {
    Left = 1,
    Right = 2,
}

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3,
}

// Stub workspace configuration
const configStore: Record<string, any> = {};

export const workspace = {
    getConfiguration: (_section?: string) => ({
        get: <T>(key: string, defaultValue?: T): T => {
            const fullKey = _section ? `${_section}.${key}` : key;
            return (configStore[fullKey] ?? defaultValue) as T;
        },
        update: async (_key: string, _value: any, _target?: ConfigurationTarget) => {},
    }),
    workspaceFolders: undefined as any,
    findFiles: async () => [] as Uri[],
};

export const window = {
    createStatusBarItem: () => ({
        text: '',
        tooltip: '',
        command: '',
        backgroundColor: undefined as any,
        show: () => {},
        dispose: () => {},
    }),
    createOutputChannel: () => ({
        appendLine: () => {},
        dispose: () => {},
    }),
    showErrorMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showInformationMessage: async () => undefined,
    showOpenDialog: async () => undefined,
    showQuickPick: async () => undefined,
    withProgress: async (_options: any, task: any) => task({ report: () => {} }),
};

export const languages = {
    createDiagnosticCollection: (_name?: string) => ({
        set: () => {},
        clear: () => {},
        dispose: () => {},
    }),
};

export const commands = {
    executeCommand: async () => {},
    registerCommand: () => ({ dispose: () => {} }),
};

export const env = {
    openExternal: async () => true,
};

export const ProgressLocation = {
    Notification: 15,
};
