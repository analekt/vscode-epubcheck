# Claude.md — vscode-epubcheck

## Project Overview

VS Code extension "vscode-epubcheck" integrates EPUBCheck (the official EPUB conformance checker by W3C) into VS Code, enabling EPUB creators to validate and generate EPUB files directly from the editor.

## Goals

- Provide EPUB validation workflow entirely within VS Code
- Display errors in Problems panel with inline squiggles
- Support multiple EPUB projects in a single workspace
- Global usage with English-only UI

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: VS Code Extension API
- **Build**: esbuild (bundle) + tsc (type check)
- **Test**: Mocha + @vscode/test-electron
- **Package Manager**: npm
- **External Dependencies**: EPUBCheck jar (user-provided), Java Runtime (JRE 11+)

## Commands

| Command | Description |
|---------|-------------|
| `epubcheck.generateAndValidate` | Generate and Validate EPUB |
| `epubcheck.generateOnly` | Generate EPUB Only |
| `epubcheck.validateWithReport` | Validate and Export EPUB with Report |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `epubcheck.jarPath` | string | `""` | Path to epubcheck.jar (required) |
| `epubcheck.javaPath` | string | `"java"` | Path to Java executable |
| `epubcheck.reportFormat` | enum | `"markdown"` | Report format: markdown / text / json |
| `epubcheck.reportDirectory` | string | `"~/Desktop"` | Directory to save reports |
| `epubcheck.timeout` | number | `120` | Timeout in seconds |

## Features

- **Commands**: 3 commands (via Command Palette and context menu)
- **Context Menu**: Right-click on folder in Explorer
- **Status Bar**: Always visible, click to run validation
- **Problems Panel**: Display all errors with file links
- **Multiple EPUB**: Auto-detect via `mimetype` files
- **Reports**: Export validation results as markdown/text/json

## EPUBCheck Integration

```bash
# Validate expanded EPUB with JSON output
java -jar epubcheck.jar -mode exp /path/to/epub-dir/ --json -

# Validate and save as .epub
java -jar epubcheck.jar -mode exp /path/to/epub-dir/ --save
```

### Severity Mapping

| EPUBCheck | VS Code |
|-----------|---------|
| FATAL/ERROR | DiagnosticSeverity.Error |
| WARNING | DiagnosticSeverity.Warning |
| USAGE | DiagnosticSeverity.Information |
| INFO | DiagnosticSeverity.Hint |

## Directory Structure

```
vscode-epubcheck/
├── gemini.md                     # This file
├── .gemini/skills/               # Reference documentation
├── package.json                  # Extension manifest
├── tsconfig.json
├── esbuild.js
├── .vscodeignore
├── src/
│   ├── extension.ts              # Entry point
│   ├── epubcheckRunner.ts        # EPUBCheck execution
│   ├── diagnosticsProvider.ts    # JSON → Diagnostics
│   ├── statusBar.ts              # Status bar management
│   ├── configuration.ts          # Settings management
│   ├── reportGenerator.ts        # Report generation
│   ├── epubDetector.ts           # Detect EPUB projects
│   └── types/
│       └── epubcheck.ts          # Type definitions
├── test/
│   └── fixtures/
│       ├── valid-epub/
│       └── invalid-epub/
└── README.md
```

## Coding Guidelines

- TypeScript strict mode enabled
- Use async/await, avoid callbacks
- Use spawn (not exec) for child processes
- Friendly error messages for missing Java/jar
- JSDoc comments on all public APIs

## Development Commands

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript
npm run watch        # Watch mode
npm run lint         # Run ESLint
npm run test         # Run tests
npm run package      # Create .vsix package
```

## Important Notes

- EPUBCheck jar is NOT bundled; users must download and configure path
- Show helpful message if jarPath is not configured
- Show helpful message if Java is not found
- EPUB output filename = folder name (e.g., `my-book/` → `my-book.epub`)
- Avoid hidden directories (`.xxx/`) for report output due to EPUB validation issues
