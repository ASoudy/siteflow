/**
 * Siteflow Schema Definitions
 * Defines the structure of the JSON export used by Siteflow.
 */

export interface FigmaNodeData {
    type: 'FRAME' | 'RECTANGLE' | 'TEXT' | 'GROUP' | 'VECTOR';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fills?: FigmaFill[];
    strokes?: FigmaStroke[];
    effects?: FigmaEffect[];
    cornerRadius?: number;
    children?: FigmaNodeData[];

    // Text specific
    characters?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT';
    letterSpacing?: number;
    lineHeight?: number;
    textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';

    // Vector specific
    svgContent?: string;
}

export interface FigmaFill {
    type: 'SOLID' | 'GRADIENT_LINEAR';
    color?: { r: number; g: number; b: number; a: number };
    gradientStops?: { position: number; color: { r: number; g: number; b: number; a: number } }[];
    gradientTransform?: number[][];
    opacity?: number;
}

export interface FigmaStroke {
    type: 'SOLID';
    color: { r: number; g: number; b: number; a: number };
    weight?: number;
}

export interface FigmaEffect {
    type: 'DROP_SHADOW' | 'BACKGROUND_BLUR' | 'INNER_SHADOW';
    color?: { r: number; g: number; b: number; a: number };
    offset?: { x: number; y: number };
    radius: number;
    visible: boolean;
    blendMode?: string;
}
