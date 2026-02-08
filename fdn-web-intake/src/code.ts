/**
 * DOM to Figma Importer Plugin
 * Imports JSON data exported from DOM-to-Figma and creates Figma nodes
 */

// === Types ===
interface FigmaNodeData {
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
    characters?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT';
    letterSpacing?: number;
    lineHeight?: number;
    svgContent?: string;
    textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
}

interface FigmaFill {
    type: 'SOLID' | 'GRADIENT_LINEAR';
    color?: { r: number; g: number; b: number; a: number };
    gradientStops?: { position: number; color: { r: number; g: number; b: number; a: number } }[];
    gradientTransform?: number[][];
}

interface FigmaStroke {
    type: 'SOLID';
    color: { r: number; g: number; b: number; a: number };
    weight?: number;
}

interface FigmaEffect {
    type: 'DROP_SHADOW' | 'BACKGROUND_BLUR' | 'INNER_SHADOW';
    color?: { r: number; g: number; b: number; a: number };
    offset?: { x: number; y: number };
    radius: number;
    visible: boolean;
}

// === Helper Functions ===

function getFontStyle(weight: number): string {
    if (weight >= 800) return 'Black';
    if (weight >= 700) return 'Bold';
    if (weight >= 600) return 'SemiBold';
    if (weight >= 500) return 'Medium';
    if (weight >= 400) return 'Regular';
    if (weight >= 300) return 'Light';
    return 'Regular';
}

async function loadFontSafe(family: string, weight: number): Promise<FontName> {
    const style = getFontStyle(weight);

    // Clean up font family name
    const cleanFamily = family.replace(/['"]/g, '').trim();

    const variants = [
        { family: cleanFamily, style },
        { family: cleanFamily, style: 'Regular' },
        { family: 'Inter', style },
        { family: 'Inter', style: 'Regular' },
        { family: 'Roboto', style: 'Regular' }
    ];

    for (const font of variants) {
        try {
            await figma.loadFontAsync(font);
            return font;
        } catch {
            // Try next variant
        }
    }

    // Last resort - try any available font
    const availableFonts = await figma.listAvailableFontsAsync();
    if (availableFonts.length > 0) {
        const fallback = availableFonts[0].fontName;
        await figma.loadFontAsync(fallback);
        return fallback;
    }

    return { family: 'Inter', style: 'Regular' };
}

// === Fill/Stroke/Effect Creation ===

function createFills(fillsData: FigmaFill[]): Paint[] {
    if (!fillsData || fillsData.length === 0) return [];

    const paints: Paint[] = [];

    for (const fill of fillsData) {
        if (fill.type === 'SOLID' && fill.color) {
            paints.push({
                type: 'SOLID',
                color: { r: fill.color.r, g: fill.color.g, b: fill.color.b },
                opacity: fill.color.a !== undefined ? fill.color.a : 1
            });
        } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops && fill.gradientStops.length > 0) {
            paints.push({
                type: 'GRADIENT_LINEAR',
                gradientTransform: (fill.gradientTransform || [[1, 0, 0], [0, 1, 0]]) as Transform,
                gradientStops: fill.gradientStops.map(stop => ({
                    position: stop.position,
                    color: {
                        r: stop.color.r,
                        g: stop.color.g,
                        b: stop.color.b,
                        a: stop.color.a !== undefined ? stop.color.a : 1
                    }
                }))
            });
        }
    }

    return paints;
}

function createStrokes(strokesData: FigmaStroke[]): Paint[] {
    if (!strokesData || strokesData.length === 0) return [];

    return strokesData.map(stroke => ({
        type: 'SOLID' as const,
        color: { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b },
        opacity: stroke.color.a !== undefined ? stroke.color.a : 1
    }));
}

function createEffects(effectsData: FigmaEffect[]): Effect[] {
    if (!effectsData || effectsData.length === 0) return [];

    const effects: Effect[] = [];

    for (const effect of effectsData) {
        if (effect.type === 'DROP_SHADOW') {
            effects.push({
                type: 'DROP_SHADOW',
                color: effect.color || { r: 0, g: 0, b: 0, a: 0.25 },
                offset: effect.offset || { x: 0, y: 4 },
                radius: effect.radius || 4,
                spread: 0,
                visible: effect.visible !== false,
                blendMode: 'NORMAL'
            } as DropShadowEffect);
        } else if (effect.type === 'INNER_SHADOW') {
            effects.push({
                type: 'INNER_SHADOW',
                color: effect.color || { r: 0, g: 0, b: 0, a: 0.25 },
                offset: effect.offset || { x: 0, y: 2 },
                radius: effect.radius || 4,
                spread: 0,
                visible: effect.visible !== false,
                blendMode: 'NORMAL'
            } as InnerShadowEffect);
        } else if (effect.type === 'BACKGROUND_BLUR') {
            effects.push({
                type: 'BACKGROUND_BLUR',
                radius: effect.radius || 10,
                visible: effect.visible !== false
            } as BlurEffect);
        }
    }

    return effects;
}

// === Node Creation Functions ===

async function createVectorNode(data: FigmaNodeData): Promise<SceneNode | null> {
    if (!data.svgContent) {
        // If no SVG content, create a simple rectangle as placeholder
        const rect = figma.createRectangle();
        rect.name = data.name || 'Icon';
        rect.x = data.x || 0;
        rect.y = data.y || 0;
        rect.resize(Math.max(data.width || 24, 1), Math.max(data.height || 24, 1));

        // Apply fills
        const fills = createFills(data.fills || []);
        if (fills.length > 0) {
            rect.fills = fills;
        } else {
            rect.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.3 }];
        }

        if (data.cornerRadius) {
            rect.cornerRadius = data.cornerRadius;
        }

        return rect;
    }

    try {
        // Modify SVG to fix currentColor references with actual color
        let svgContent = data.svgContent;

        // If we have a fill color, replace currentColor with that color
        if (data.fills && data.fills.length > 0 && data.fills[0].color) {
            const c = data.fills[0].color;
            const hexColor = `#${Math.round(c.r * 255).toString(16).padStart(2, '0')}${Math.round(c.g * 255).toString(16).padStart(2, '0')}${Math.round(c.b * 255).toString(16).padStart(2, '0')}`;
            svgContent = svgContent.replace(/currentColor/g, hexColor);
            svgContent = svgContent.replace(/stroke="[^"]*"/g, `stroke="${hexColor}"`);
        }

        // Create SVG node from string using Figma's createNodeFromSvg
        const svgNode = figma.createNodeFromSvg(svgContent);

        if (svgNode) {
            svgNode.name = data.name || 'Icon';
            svgNode.x = data.x || 0;
            svgNode.y = data.y || 0;

            // Resize to match original dimensions
            if (data.width && data.height) {
                svgNode.resize(data.width, data.height);
            }

            // Apply color to all vector children (strokes for stroke-based, fills for fill-based)
            if (data.fills && data.fills.length > 0) {
                const fills = createFills(data.fills);

                svgNode.findAll(node => node.type === 'VECTOR').forEach(vector => {
                    const v = vector as VectorNode;
                    // Check if this is a stroke-based icon (has strokes but no/empty fills)
                    const hasStrokes = v.strokes && (v.strokes as readonly Paint[]).length > 0;
                    const hasNoFills = !v.fills || (v.fills as readonly Paint[]).length === 0 ||
                        ((v.fills as readonly SolidPaint[]).length === 1 &&
                            (v.fills as readonly SolidPaint[])[0].type === 'SOLID' &&
                            (v.fills as readonly SolidPaint[])[0].opacity === 0);

                    if (hasStrokes && fills.length > 0) {
                        // Apply color to strokes
                        v.strokes = fills;
                    }
                    // Only apply fills if this is NOT a stroke-based icon
                    if (!hasStrokes && fills.length > 0) {
                        v.fills = fills;
                    }
                });
            }


            return svgNode;
        }

    } catch (err) {
        console.error('Failed to create SVG node:', err);
    }

    // Fallback: create a rectangle placeholder
    const rect = figma.createRectangle();
    rect.name = data.name || 'Icon (fallback)';
    rect.x = data.x || 0;
    rect.y = data.y || 0;
    rect.resize(Math.max(data.width || 24, 1), Math.max(data.height || 24, 1));
    rect.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.2 }];

    return rect;
}

async function createTextNode(data: FigmaNodeData): Promise<TextNode> {
    const textNode = figma.createText();
    textNode.name = data.name || 'Text';

    // Load font first (before setting any text properties)
    const fontFamily = data.fontFamily || 'Inter';
    const fontWeight = data.fontWeight || 400;
    const loadedFont = await loadFontSafe(fontFamily, fontWeight);

    // Set font name
    textNode.fontName = loadedFont;

    // Set text content
    textNode.characters = data.characters || '';

    // Set position
    textNode.x = data.x || 0;
    textNode.y = data.y || 0;

    // Set font size
    if (data.fontSize && data.fontSize > 0) {
        textNode.fontSize = data.fontSize;
    }

    // Text alignment
    if (data.textAlignHorizontal) {
        textNode.textAlignHorizontal = data.textAlignHorizontal;
    }

    // Letter spacing
    if (data.letterSpacing && data.letterSpacing !== 0) {
        textNode.letterSpacing = { value: data.letterSpacing, unit: 'PIXELS' };
    }

    // Line height
    if (data.lineHeight && data.lineHeight > 0) {
        textNode.lineHeight = { value: data.lineHeight, unit: 'PIXELS' };
    }

    // Text color (fills)
    if (data.fills && data.fills.length > 0) {
        const fills = createFills(data.fills);
        if (fills.length > 0) {
            textNode.fills = fills;
        }
    }

    // Resize after setting content
    // Resize after setting content
    if (data.textAutoResize === 'WIDTH_AND_HEIGHT') {
        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    } else if (data.textAutoResize === 'HEIGHT' && data.width > 0) {
        textNode.resize(data.width, textNode.height); // Set fixed width
        textNode.textAutoResize = 'HEIGHT';
    } else if (data.width > 0 && data.height > 0) {
        textNode.resize(data.width, data.height);
        textNode.textAutoResize = 'NONE';
    }


    return textNode;
}

async function createFrameNode(data: FigmaNodeData): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = data.name || 'Frame';
    frame.x = data.x || 0;
    frame.y = data.y || 0;
    frame.resize(Math.max(data.width || 1, 1), Math.max(data.height || 1, 1));

    // CRITICAL: Disable clipping so children are visible
    frame.clipsContent = false;

    // Clear default fills
    frame.fills = [];

    // Apply fills
    const fills = createFills(data.fills || []);
    if (fills.length > 0) {
        frame.fills = fills;
    }

    // Apply corner radius
    if (data.cornerRadius && data.cornerRadius > 0) {
        frame.cornerRadius = data.cornerRadius;
    }

    // Apply strokes
    const strokes = createStrokes(data.strokes || []);
    if (strokes.length > 0) {
        frame.strokes = strokes;
        frame.strokeWeight = data.strokes?.[0]?.weight || 1;
    }

    // Apply effects
    const effects = createEffects(data.effects || []);
    if (effects.length > 0) {
        frame.effects = effects;
    }

    // Process children recursively
    if (data.children && data.children.length > 0) {
        for (const childData of data.children) {
            try {
                const childNode = await createNode(childData);
                if (childNode) {
                    frame.appendChild(childNode);
                }
            } catch (err) {
                console.error(`Failed to create child "${childData.name}":`, err);
            }
        }
    }

    return frame;
}

async function createNode(data: FigmaNodeData): Promise<SceneNode | null> {
    if (!data) return null;

    try {
        // Handle VECTOR/SVG nodes
        if (data.type === 'VECTOR' || data.svgContent) {
            return await createVectorNode(data);
        }

        // Check if it's a text node (has characters property with content)
        const isTextNode = data.type === 'TEXT' ||
            (data.characters && data.characters.trim().length > 0);

        if (isTextNode && data.characters) {
            return await createTextNode(data);
        } else {
            return await createFrameNode(data);
        }
    } catch (error) {
        console.error(`Error creating node "${data.name}":`, error);
        return null;
    }
}

// === Main Import Function ===

async function createRootFrame(jsonData: FigmaNodeData): Promise<FrameNode> {
    // Create root frame
    const rootFrame = figma.createFrame();
    rootFrame.name = jsonData.name || 'Imported Design';
    rootFrame.resize(jsonData.width || 1280, jsonData.height || 720);
    rootFrame.x = figma.viewport.center.x - (jsonData.width || 1280) / 2;
    rootFrame.y = figma.viewport.center.y - (jsonData.height || 720) / 2;

    // CRITICAL: Allow content to overflow
    rootFrame.clipsContent = false;

    // Apply root fills
    const rootFills = createFills(jsonData.fills || []);
    if (rootFills.length > 0) {
        rootFrame.fills = rootFills;
    } else {
        rootFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    }

    // Apply root effects
    const rootEffects = createEffects(jsonData.effects || []);
    if (rootEffects.length > 0) {
        rootFrame.effects = rootEffects;
    }

    // Apply root corner radius
    if (jsonData.cornerRadius && jsonData.cornerRadius > 0) {
        rootFrame.cornerRadius = jsonData.cornerRadius;
    }

    // Process all children
    if (jsonData.children && jsonData.children.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const childData of jsonData.children) {
            try {
                const childNode = await createNode(childData);
                if (childNode) {
                    rootFrame.appendChild(childNode);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error(`Failed to create child:`, err);
                failCount++;
            }
        }

        console.log(`Created ${successCount} nodes, ${failCount} failed`);
    }

    // Select and zoom to the imported frame
    figma.currentPage.selection = [rootFrame];
    figma.viewport.scrollAndZoomIntoView([rootFrame]);

    return rootFrame;
}

// Count total nodes recursively
function countNodes(data: FigmaNodeData): number {
    let count = 1;
    if (data.children) {
        for (const child of data.children) {
            count += countNodes(child);
        }
    }
    return count;
}

// === Plugin Message Handler ===

figma.showUI(__html__, { width: 480, height: 600 });

async function importSlide(data: FigmaNodeData, offsetX: number = 0): Promise<SceneNode | null> {
    // Used the robust root frame creation
    const node = await createRootFrame(data);
    if (node) {
        node.x += offsetX;
        // Nodes are auto-added to page, no need to append
        return node;
    }
    return null;
}

figma.ui.onmessage = async (msg: { type: string; data?: any; items?: { name: string; data: string }[] }) => {
    if (msg.type === 'import-json') {
        try {
            const jsonData = msg.data;
            if (!jsonData) {
                figma.ui.postMessage({ type: 'error', message: 'No JSON data provided' });
                return;
            }

            const totalNodes = countNodes(jsonData);
            figma.ui.postMessage({ type: 'status', message: `Importing ${totalNodes} nodes...` });

            const node = await importSlide(jsonData);

            if (node) {
                figma.currentPage.selection = [node];
                figma.viewport.scrollAndZoomIntoView([node]);
                figma.ui.postMessage({ type: 'success', message: 'Import successful!' });
            } else {
                figma.ui.postMessage({ type: 'error', message: 'Failed to create node' });
            }

        } catch (error) {
            console.error('Import error:', error);
            figma.ui.postMessage({ type: 'error', message: `Import failed: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
    else if (msg.type === 'import-batch') {
        try {
            const items = msg.items;
            if (!items || items.length === 0) {
                figma.ui.postMessage({ type: 'error', message: 'No files to import' });
                return;
            }

            const createdNodes: SceneNode[] = [];
            let offsetX = 0;
            const SPACING = 100;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                try {
                    const jsonData = JSON.parse(item.data);

                    // Update progress
                    figma.ui.postMessage({
                        type: 'progress',
                        current: i + 1,
                        total: items.length,
                        name: item.name
                    });

                    const node = await importSlide(jsonData, offsetX);

                    if (node) {
                        createdNodes.push(node);
                        offsetX += node.width + SPACING;
                    }
                } catch (err) {
                    console.error(`Failed to import ${item.name}:`, err);
                }
            }

            if (createdNodes.length > 0) {
                figma.currentPage.selection = createdNodes;
                figma.viewport.scrollAndZoomIntoView(createdNodes);
                figma.ui.postMessage({ type: 'success', message: `Successfully imported ${createdNodes.length} slides!` });
            } else {
                figma.ui.postMessage({ type: 'error', message: 'No slides were imported successfully' });
            }

        } catch (error) {
            console.error('Batch import error:', error);
            figma.ui.postMessage({ type: 'error', message: `Batch import failed: ${error instanceof Error ? error.message : String(error)}` });
        }
    }
    else if (msg.type === 'close') {
        figma.closePlugin();
    }
};

