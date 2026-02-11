# EPUBCheck for VS Code

EPUB conformance checker and generator for VS Code, powered by the official [W3C EPUBCheck](https://github.com/w3c/epubcheck) tool.

Validate expanded (unzipped) EPUB projects directly from VS Code, view errors in the Problems panel, and generate `.epub` files — all without leaving the editor.

## Features

- **Generate and validate** EPUB files from expanded EPUB directories
- **Unzip and validate** existing `.epub` files directly
- **Problems panel** integration with inline error squiggles
- **Status bar** indicator showing validation state
- **Multiple EPUB** support — auto-detects all EPUB projects in your workspace
- **Export reports** in Markdown, Text, or JSON format
- **Context menu** — right-click folders or `.epub` files in Explorer to run commands
- **File browser** for selecting `epubcheck.jar` and report directory

## Requirements

### Java Runtime

EPUBCheck requires **Java 11 or above**. Download from:
- [Eclipse Adoptium](https://adoptium.net/) (recommended)
- [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)

### EPUBCheck

Download the latest EPUBCheck release:

1. Go to [EPUBCheck Releases](https://github.com/w3c/epubcheck/releases)
2. Download the ZIP file (e.g., `epubcheck-5.3.0.zip`)
3. Extract it to a location on your computer
4. Note the path to `epubcheck.jar` inside the extracted folder

## Setup

After installing the extension:

1. Open VS Code Settings (`Cmd+,` on macOS / `Ctrl+,` on Windows/Linux)
2. Search for "EPUBCheck"
3. Set **EPUBCheck: Jar Path** to the full path of your `epubcheck.jar` file
   - Example: `/Users/username/tools/epubcheck-5.3.0/epubcheck.jar`

## Commands

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type "EPUBCheck":

| Command | Description |
|---------|-------------|
| **EPUBCheck: Generate and Validate EPUB** | Validate the EPUB and generate a `.epub` file |
| **EPUBCheck: Generate EPUB Only** | Generate a `.epub` file without detailed validation |
| **EPUBCheck: Generate EPUB and Validation Report** | Validate, generate `.epub`, and save a report file |
| **EPUBCheck: Unzip EPUB and Validate** | Extract `.epub` files and validate the contents |
| **EPUBCheck: Select epubcheck.jar** | Browse for `epubcheck.jar` using a file picker |
| **EPUBCheck: Select Report Directory** | Browse for the report output directory |

You can also right-click on a folder in the Explorer to access the first three commands, or right-click on a `.epub` file to unzip and validate it.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `epubcheck.jarPath` | `""` | Path to `epubcheck.jar` (required). Use the Browse link in settings. |
| `epubcheck.javaPath` | `"java"` | Path to Java executable |
| `epubcheck.reportFormat` | `"markdown"` | Report format: `markdown`, `text`, or `json` |
| `epubcheck.reportDirectory` | `""` | Directory to save reports. Empty = workspace root. |
| `epubcheck.deleteEpubAfterUnzip` | `false` | Delete `.epub` file after extracting |
| `epubcheck.timeout` | `120` | Timeout in seconds |
| `epubcheck.showContextMenu` | `true` | Show commands in Explorer context menu |

## How It Works

1. The extension detects EPUB projects by finding directories with a `mimetype` file
2. When you run a command, it invokes EPUBCheck via Java to validate the expanded EPUB
3. Validation results appear in the **Problems panel** with links to error locations
4. The `.epub` file is generated in the parent directory of the EPUB project folder

### EPUB Project Structure

Your EPUB project directory should look like this:

```
my-book/
├── mimetype              ← Required: contains "application/epub+zip"
├── META-INF/
│   └── container.xml
└── OEBPS/
    ├── content.opf
    ├── nav.xhtml
    ├── chapter1.xhtml
    └── style.css
```

## License

MIT
