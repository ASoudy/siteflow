# FDN Web

**FDN Web** is a seamless bridge between the web and Figma. Turn any webpage into editable Figma designs in seconds.

## Components

This repository contains the entire FDN Web ecosystem:

- **[FDN Web Capture](./fdn-web-capture)**: A Chrome/Edge extension to export any webpage to JSON.
- **[FDN Web Intake](./fdn-web-intake)**: A Figma plugin to import that JSON with pixel-perfect fidelity.
- **[FDN Web Schema](./fdn-web-schema)**: The open JSON standard used to describe web content.

## Getting Started

1.  **Install the Extension**: Load `fdn-web-capture` as an unpacked extension in Chrome/Edge.
2.  **Install the Plugin**: Import `fdn-web-intake` into Figma Desktop.
3.  **Flow**:
    -   Go to a website.
    -   Click **FDN Web Capture** -> Export.
    -   Go to Figma -> Run **FDN Web Figma**.
    -   Drag & Drop the JSON file.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT
