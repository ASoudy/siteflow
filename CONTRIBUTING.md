# Contributing to FDN Web

Thank you for your interest in contributing!

## Project Structure

- `fdn-web-capture`: Browser extension (Vanilla JS).
- `fdn-web-intake`: Figma plugin (TypeScript).
- `fdn-web-schema`: Shared definitions.

## Development Setup

### Extension
1.  Open `fdn-web-capture` folder.
2.  Load as unpacked extension in Chrome.
3.  Make changes to `content.js` or `popup.js`.
4.  Reload extension to test.

### Figma Plugin
1.  Open `fdn-web-intake` folder.
2.  Run `npm install`.
3.  Run `npm run watch` (tsc -w).
4.  Load manifest in Figma Desktop.

## Submission Guidelines

1.  Fork the repo.
2.  Create a branch for your feature.
3.  Ensure you test both Capture and Import flows.
4.  Submit a Pull Request.

## Code Style

- Use TypeScript for the plugin.
- Keep the schema backward compatible.
