# FDN Web Figma Plugin

A Figma plugin that imports FDN Web JSON files and recreates the webpage design with high fidelity.

## Features

- **Pixel-Perfect Import**: Recreates DOM structure as Figma Frames and Text.
- **Batch Processing**: Drag & drop multiple JSON files to import entire flows at once.
- **Auto-Layout**: Arranges imported slides horizontally.
- **Smart Text**: Auto-resizes text boxes to prevent wrapping issues.

## Development

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build the plugin:
    ```bash
    npm run build
    ```
3.  Watch for changes:
    ```bash
    npm run watch
    ```

## Installation in Figma

1.  Open Figma Desktop App.
2.  Go to **Plugins** -> **Development** -> **Import plugin from manifest...**
3.  Select the `manifest.json` file in this directory.

## Usage

1.  Run the **FDN Web Figma Importer** plugin.
2.  Drag and drop your exported JSON file(s).
3.  Click **Import to Figma**.
