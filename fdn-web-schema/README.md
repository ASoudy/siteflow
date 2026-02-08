# FDN Web Schema

The shared JSON schema and type definitions for the FDN Web ecosystem.

## Overview

FDN Web uses a standardized JSON format to represent web content. This allows any tool to generate compatible files for the Figma importer.

## File Structure

- `schema.json`: JSON Schema draft-07 definition for validation.
- `types.ts`: TypeScript interfaces for the node structure.

## Key Types

- `FRAME`: Represents a container (div, section, button).
- `TEXT`: Represents text content.
- `VECTOR`: Represents SVG icons or paths.
- `RECTANGLE`: Represents basic shapes or borders.

## Usage in Projects

You can use `types.ts` to type-check your generator:

```typescript
import { FigmaNodeData } from './fdn-web-schema/types';

const myNode: FigmaNodeData = {
  type: 'FRAME',
  name: 'My Button',
  // ...
};
```
