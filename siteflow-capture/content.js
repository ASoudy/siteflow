
(function () {
    // === Helpers ===

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return { r: f(0), g: f(8), b: f(4) };
    }

    function parseColor(colorStr) {
        if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null;

        const rgbaMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
        if (rgbaMatch) {
            return {
                r: parseInt(rgbaMatch[1]) / 255,
                g: parseInt(rgbaMatch[2]) / 255,
                b: parseInt(rgbaMatch[3]) / 255,
                a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
            };
        }

        const hslMatch = colorStr.match(/hsla?\(\s*(\d+)[\s,]+(\d+)%[\s,]+(\d+)%(?:[\s,/]+([\d.]+%?))?\s*\)/);
        if (hslMatch) {
            const h = parseInt(hslMatch[1]);
            const s = parseInt(hslMatch[2]);
            const l = parseInt(hslMatch[3]);
            const rgb = hslToRgb(h, s, l);
            let alpha = 1;
            if (hslMatch[4]) {
                alpha = hslMatch[4].includes('%') ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]);
            }
            return { ...rgb, a: alpha };
        }

        if (colorStr.startsWith('#')) {
            let hex = colorStr.slice(1);
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255,
                a: 1
            };
        }
        return null;
    }

    function parseBoxShadow(shadowStr) {
        if (!shadowStr || shadowStr === 'none') return null;
        const colorMatch = shadowStr.match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[a-fA-F0-9]+/);
        const nums = shadowStr.match(/([\d.]+)px/g);

        if (nums && nums.length >= 2) {
            const color = colorMatch ? parseColor(colorMatch[0]) : { r: 0, g: 0, b: 0, a: 0.2 };
            const vals = nums.map(n => parseFloat(n));
            return {
                type: 'DROP_SHADOW',
                color: color || { r: 0, g: 0, b: 0, a: 0.2 },
                offset: { x: vals[0] || 0, y: vals[1] || 0 },
                radius: vals[2] || 0,
                visible: true
            };
        }
        return null;
    }

    function parseBackdropBlur(filterStr) {
        if (!filterStr || filterStr === 'none') return null;
        const match = filterStr.match(/blur\(([\d.]+)px\)/);
        if (match) {
            return {
                type: 'BACKGROUND_BLUR',
                radius: parseFloat(match[1]),
                visible: true
            };
        }
        return null;
    }

    function parseBorderRadius(radiusStr) {
        if (!radiusStr) return 0;
        const match = radiusStr.match(/([\d.]+)px/);
        return match ? parseFloat(match[1]) : 0;
    }

    function parseGradient(bgImage) {
        if (!bgImage || !bgImage.includes('gradient')) return null;
        const linearMatch = bgImage.match(/linear-gradient\(([^,]+),\s*(.+)\)/);
        if (!linearMatch) return null;

        const angleStr = linearMatch[1];
        const colorsStr = linearMatch[2];

        const colorStops = [];
        const colorRegex = /(?:hsla?\([^)]+\)|rgba?\([^)]+\)|#[a-fA-F0-9]+)(?:\s+(\d+)%)?/g;
        let match;
        const colors = [];

        while ((match = colorRegex.exec(colorsStr)) !== null) {
            const colorStr = match[0].replace(/\s+\d+%$/, '');
            const color = parseColor(colorStr);
            if (color) {
                const posMatch = match[0].match(/(\d+)%$/);
                colors.push({
                    color,
                    position: posMatch ? parseInt(posMatch[1]) / 100 : undefined
                });
            }
        }

        colors.forEach((c, i) => {
            if (c.position === undefined) {
                c.position = colors.length > 1 ? i / (colors.length - 1) : 0;
            }
            colorStops.push({ position: c.position, color: c.color });
        });

        if (colorStops.length >= 2) {
            const angleMatch = angleStr.match(/(\d+)deg/);
            const angle = angleMatch ? parseInt(angleMatch[1]) : 180;
            const radians = (angle - 90) * Math.PI / 180;
            return {
                type: 'GRADIENT_LINEAR',
                gradientStops: colorStops,
                gradientTransform: [
                    [Math.cos(radians), Math.sin(radians), 0.5 - Math.cos(radians) * 0.5 - Math.sin(radians) * 0.5],
                    [-Math.sin(radians), Math.cos(radians), 0.5 + Math.sin(radians) * 0.5 - Math.cos(radians) * 0.5]
                ]
            };
        }
        return null;
    }

    // === SVG Capture ===
    function captureSVG(svg, parentRect) {
        const rect = svg.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return null; // Skip tiny/hidden SVGs

        const style = window.getComputedStyle(svg);
        const fillColor = parseColor(style.fill) || parseColor(style.color);
        const strokeColor = parseColor(style.stroke);

        let svgString = new XMLSerializer().serializeToString(svg);
        if (!svgString.includes('xmlns=')) {
            svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        return {
            type: 'VECTOR',
            name: svg.getAttribute('data-lucide') || svg.getAttribute('aria-label') || svg.tagName.toLowerCase(),
            x: rect.left - parentRect.left,
            y: rect.top - parentRect.top,
            width: rect.width,
            height: rect.height,
            fills: (fillColor && style.fill !== 'none') ? [{ type: 'SOLID', color: fillColor }] : [],
            strokes: (strokeColor && style.stroke !== 'none') ? [{ type: 'SOLID', color: strokeColor }] : [],
            effects: [],
            svgContent: svgString
        };
    }

    // === Border Capture ===
    function captureBorders(element, node, style) {
        const sides = ['Top', 'Right', 'Bottom', 'Left'];
        let uniform = true;
        const firstWidth = parseFloat(style.borderTopWidth);
        const firstColor = style.borderTopColor;
        const firstStyle = style.borderTopStyle;

        for (const side of sides) {
            if (parseFloat(style[`border${side}Width`]) !== firstWidth ||
                style[`border${side}Color`] !== firstColor ||
                style[`border${side}Style`] !== firstStyle) {
                uniform = false;
                break;
            }
        }

        if (uniform && firstWidth > 0 && firstStyle !== 'none') {
            const color = parseColor(firstColor);
            if (color) {
                node.strokes = [{
                    type: 'SOLID',
                    color: color,
                    weight: firstWidth
                }];
            }
        } else {
            sides.forEach(side => {
                const width = parseFloat(style[`border${side}Width`]);
                const colorStr = style[`border${side}Color`];
                const borderStyle = style[`border${side}Style`];

                if (width > 0 && borderStyle !== 'none') {
                    const color = parseColor(colorStr);
                    if (color) {
                        const borderNode = {
                            type: 'RECTANGLE',
                            name: `border-${side.toLowerCase()}`,
                            fills: [{ type: 'SOLID', color: color }],
                            x: 0,
                            y: 0,
                            width: 0, // Will be set below
                            height: 0
                        };

                        if (side === 'Top') {
                            borderNode.width = node.width;
                            borderNode.height = width;
                        } else if (side === 'Bottom') {
                            borderNode.y = node.height - width;
                            borderNode.width = node.width;
                            borderNode.height = width;
                        } else if (side === 'Left') {
                            borderNode.width = width;
                            borderNode.height = node.height;
                        } else if (side === 'Right') {
                            borderNode.x = node.width - width;
                            borderNode.width = width;
                            borderNode.height = node.height;
                        }

                        node.children.push(borderNode);
                    }
                }
            });
        }
    }

    // === Main Traversal ===
    function captureElement(element, parentRect) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        // Skip hidden or tiny elements (sr-only often uses 1px)
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 1 || rect.height <= 1) {
            return null;
        }

        // Skip elements that are clipped to be tiny (another sr-only technique: rect(1px, 1px, 1px, 1px))
        if (style.clip === 'rect(1px, 1px, 1px, 1px)' || style.clipPath?.includes('inset(50%)')) {
            return null;
        }

        const isText = element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE;
        const textContent = isText ? element.textContent?.trim() : null;
        const isImage = element.tagName === 'IMG';

        const node = {
            type: textContent ? 'TEXT' : 'FRAME',
            name: element.className ? String(element.className).split(' ')[0] : element.tagName.toLowerCase(),
            x: rect.left - parentRect.left,
            y: rect.top - parentRect.top,
            width: rect.width,
            height: rect.height,
            fills: [],
            effects: [],
            children: []
        };

        const bgColor = parseColor(style.backgroundColor);
        if (bgColor && (bgColor.a > 0 || bgColor.r > 0 || bgColor.g > 0 || bgColor.b > 0)) {
            node.fills.push({ type: 'SOLID', color: bgColor });
        }

        const gradient = parseGradient(style.backgroundImage);
        if (gradient) {
            node.fills.push(gradient);
        }

        if (isImage && element.src) {
            node.name = `IMG: ${element.src.split('/').pop()}`;
            if (node.fills.length === 0) {
                node.fills.push({ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } });
            }
        }

        const radius = parseBorderRadius(style.borderRadius);
        if (radius > 0) node.cornerRadius = radius;

        const shadow = parseBoxShadow(style.boxShadow);
        if (shadow) node.effects.push(shadow);

        captureBorders(element, node, style);

        if (textContent) {
            node.characters = textContent;
            node.fontSize = parseFloat(style.fontSize);
            node.fontWeight = parseInt(style.fontWeight) || 400;
            node.fontFamily = style.fontFamily.split(',')[0].replace(/['"]/g, '');
            node.textAlignHorizontal = style.textAlign === 'center' ? 'CENTER' : style.textAlign === 'right' || style.direction === 'rtl' ? 'RIGHT' : 'LEFT';
            node.letterSpacing = parseFloat(style.letterSpacing) || 0;

            const lineHeightVal = parseFloat(style.lineHeight);
            node.lineHeight = !isNaN(lineHeightVal) ? lineHeightVal : node.fontSize * 1.2;

            const textColor = parseColor(style.color);
            if (textColor) node.fills = [{ type: 'SOLID', color: textColor }];

            // TEXT SIZING LOGIC:
            // Determine if we should use Auto Width or Auto Height
            // If height is close to line-height, likely single line -> WIDTH_AND_HEIGHT
            // Otherwise -> HEIGHT
            const estimatedLineHeight = node.lineHeight || node.fontSize * 1.2;
            // Allow 1.5 lines buffer (sometimes descenders make it slightly larger)
            if (rect.height <= estimatedLineHeight * 1.5) {
                node.textAutoResize = 'WIDTH_AND_HEIGHT';
            } else {
                node.textAutoResize = 'HEIGHT';
            }
        }

        if (!textContent && !isImage) {
            Array.from(element.childNodes).forEach(child => {
                if (child instanceof SVGElement && child.nodeName.toLowerCase() === 'svg') {
                    const svgNode = captureSVG(child, rect);
                    if (svgNode) node.children.push(svgNode);
                } else if (child instanceof HTMLElement) {
                    const childNode = captureElement(child, rect);
                    if (childNode) node.children.push(childNode);
                } else if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent?.trim();
                    if (text && text.length > 0) {
                        const textColor = parseColor(style.color);
                        // Handling mixed content text nodes
                        // We need to determine if they are single line too, but we don't have rect for text node easily.
                        // We use parent rect? No, parent might be flex container.
                        // Range API can give text node rect.
                        let textRect = rect;
                        let autoResize = 'HEIGHT';

                        try {
                            const range = document.createRange();
                            range.selectNode(child);
                            textRect = range.getBoundingClientRect();

                            const fs = parseFloat(style.fontSize);
                            const lh = parseFloat(style.lineHeight) || fs * 1.2;
                            if (textRect.height <= lh * 1.5) {
                                autoResize = 'WIDTH_AND_HEIGHT';
                            }
                        } catch (e) { }

                        node.children.push({
                            type: 'TEXT',
                            name: 'text',
                            x: textRect.left - rect.left, // Relative to parent
                            y: textRect.top - rect.top,
                            width: textRect.width,
                            height: textRect.height,
                            fills: textColor ? [{ type: 'SOLID', color: textColor }] : [],
                            effects: [],
                            characters: text,
                            fontSize: parseFloat(style.fontSize),
                            fontWeight: parseInt(style.fontWeight) || 400,
                            fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
                            textAlignHorizontal: style.textAlign === 'center' ? 'CENTER' : style.textAlign === 'right' || style.direction === 'rtl' ? 'RIGHT' : 'LEFT',
                            letterSpacing: parseFloat(style.letterSpacing) || 0,
                            lineHeight: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2,
                            textAutoResize: autoResize
                        });
                    }
                }
            });
        }

        return node;
    }

    // === Export Execution ===
    try {
        const rootElement = document.body;
        const rootRect = rootElement.getBoundingClientRect();
        const bodyStyle = window.getComputedStyle(document.body);
        const bg = parseColor(bodyStyle.backgroundColor);

        const figmaRoot = {
            type: 'FRAME',
            name: document.title || 'Exported Page',
            x: 0,
            y: 0,
            width: rootRect.width,
            height: rootRect.height,
            fills: [{
                type: 'SOLID',
                color: (bg && bg.a > 0) ? bg : { r: 1, g: 1, b: 1, a: 1 }
            }],
            children: []
        };

        Array.from(rootElement.children).forEach(child => {
            if (child instanceof HTMLElement) {
                const node = captureElement(child, rootRect);
                if (node) figmaRoot.children.push(node);
            }
        });

        const jsonString = JSON.stringify(figmaRoot, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `figma-export-${Date.now()}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Export complete');

    } catch (error) {
        console.error('Figma Export Error:', error);
        alert('Export failed: ' + error.message);
    }

})();
