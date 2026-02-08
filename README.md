# Siteflow

**Siteflow** is a seamless bridge between the web and Figma. Turn any webpage into editable Figma designs in seconds.

## Components

This repository contains the entire Siteflow ecosystem:

- **[Siteflow Capture](./siteflow-capture)**: A Chrome/Edge extension to export any webpage to JSON.
- **[Siteflow Figma](./siteflow-figma)**: A Figma plugin to import that JSON with pixel-perfect fidelity.
- **[Siteflow Schema](./siteflow-schema)**: The open JSON standard used to describe web content.

## Getting Started

1.  **Install the Extension**: Load `siteflow-capture` as an unpacked extension in Chrome/Edge.
2.  **Install the Plugin**: Import `siteflow-figma` into Figma Desktop.
3.  **Flow**:
    -   Go to a website.
    -   Click **Siteflow Capture** -> Export.
    -   Go to Figma -> Run **Siteflow Figma**.
    -   Drag & Drop the JSON file.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT
