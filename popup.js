// FIXED: Updated popup.js with robust full scroll capture
const captureBtn = document.getElementById('captureBtn');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const apiKeyInput = document.getElementById('apiKey');

// Load saved API key
chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
    }
});

// Save API key when changed
apiKeyInput.addEventListener('change', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        chrome.storage.sync.set({ geminiApiKey: key });
        showStatus('API key saved', 'success');
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    }
});

function showStatus(message, type) {
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';
}

function showProgress(text) {
    progress.textContent = text;
    progress.style.display = text ? 'block' : 'none';
}

captureBtn.addEventListener('click', async () => {
    try {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter your Gemini API key', 'error');
            return;
        }

        captureBtn.disabled = true;
        showStatus('Starting full page capture...', 'info');
        showProgress('Preparing page for capture...');

        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error('No active tab found');
        }

        // Check if we can access the page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            throw new Error('Cannot capture Chrome system pages');
        }

        showProgress('Capturing full page screenshot...');

        // Use the improved capture method
        const result = await captureFullPageImproved(tab.id);

        if (!result || !result.screenshot) {
            throw new Error('Failed to capture full page screenshot');
        }

        showProgress('Analyzing page structure...');

        if (!result.pageData) {
            throw new Error('Failed to analyze page structure');
        }

        // Generate replica using Gemini API with full screenshot
        showProgress('Generating replica with Gemini AI...');
        const replica = await generateReplicaWithGemini(result.pageData, result.screenshot, apiKey);

        // Download the generated HTML
        showProgress('Creating download...');
        downloadHTML(replica, result.pageData.title);

        showStatus('✓ Full page replica generated successfully!', 'success');
        showProgress('');

        setTimeout(() => {
            captureBtn.disabled = false;
            status.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
        showProgress('');
        captureBtn.disabled = false;
    }
});

// IMPROVED: More robust full page capture with better error handling
async function captureFullPageImproved(tabId) {
    try {
        // First, inject the capture helper functions
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                // Store original position
                window.__originalScrollX = window.scrollX;
                window.__originalScrollY = window.scrollY;
            }
        });

        // Get page dimensions
        const [dimensionsResult] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    pageWidth: Math.max(
                        document.body.scrollWidth,
                        document.body.offsetWidth,
                        document.documentElement.scrollWidth,
                        document.documentElement.offsetWidth
                    ),
                    pageHeight: Math.max(
                        document.body.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.scrollHeight,
                        document.documentElement.offsetHeight
                    ),
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    devicePixelRatio: window.devicePixelRatio || 1
                };
            }
        });

        const dimensions = dimensionsResult.result;
        console.log('Page dimensions:', dimensions);

        // Show indicator
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const indicator = document.createElement('div');
                indicator.id = 'scroll-capture-indicator';
                indicator.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    font-family: system-ui, sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 2147483647;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                `;
                indicator.innerHTML = '📸 Starting capture...';
                document.body.appendChild(indicator);
            }
        });

        // Calculate number of screenshots
        const numScreenshots = Math.ceil(dimensions.pageHeight / dimensions.viewportHeight);
        console.log(`Will take ${numScreenshots} screenshots`);

        const screenshots = [];

        // Scroll to top first
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            }
        });

        await new Promise(resolve => setTimeout(resolve, 800));

        // Capture each section
        for (let i = 0; i < numScreenshots; i++) {
            const scrollY = i * dimensions.viewportHeight;
            
            // Update indicator
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (current, total) => {
                    const indicator = document.getElementById('scroll-capture-indicator');
                    if (indicator) {
                        indicator.innerHTML = `📸 Capturing: ${current}/${total}<br><small style="font-size:11px;">Please wait...</small>`;
                    }
                },
                args: [i + 1, numScreenshots]
            });

            // Scroll to position
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (y) => {
                    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
                },
                args: [scrollY]
            });

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture screenshot
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(null, {
                    format: 'png',
                    quality: 100
                });

                screenshots.push({
                    dataUrl: dataUrl,
                    scrollY: scrollY,
                    index: i
                });

                console.log(`Captured screenshot ${i + 1}/${numScreenshots}`);
            } catch (captureError) {
                console.error(`Failed to capture screenshot ${i + 1}:`, captureError);
                throw new Error(`Screenshot capture failed at section ${i + 1}`);
            }
        }

        // Restore scroll position
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                window.scrollTo({
                    top: window.__originalScrollY,
                    left: window.__originalScrollX,
                    behavior: 'instant'
                });
            }
        });

        // Update indicator
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const indicator = document.getElementById('scroll-capture-indicator');
                if (indicator) {
                    indicator.innerHTML = '🔧 Stitching images...<br><small>Almost done!</small>';
                }
            }
        });

        // Stitch images together using offscreen canvas
        const fullScreenshot = await stitchScreenshots(screenshots, dimensions);

        // Capture page data
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const indicator = document.getElementById('scroll-capture-indicator');
                if (indicator) {
                    indicator.innerHTML = '🔍 Analyzing page...<br><small>Final step!</small>';
                }
            }
        });

        const [pageDataResult] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: capturePageData
        });

        // Remove indicator
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                const indicator = document.getElementById('scroll-capture-indicator');
                if (indicator) {
                    indicator.style.opacity = '0';
                    indicator.style.transition = 'opacity 0.3s';
                    setTimeout(() => indicator.remove(), 300);
                }
            }
        });

        return {
            screenshot: fullScreenshot,
            pageData: pageDataResult.result
        };

    } catch (error) {
        // Clean up indicator on error
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    const indicator = document.getElementById('scroll-capture-indicator');
                    if (indicator) indicator.remove();
                }
            });
        } catch (e) {
            // Ignore cleanup errors
        }

        throw new Error('Full page capture failed: ' + error.message);
    }
}

// Stitch screenshots together
async function stitchScreenshots(screenshots, dimensions) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = dimensions.viewportWidth;
            canvas.height = dimensions.pageHeight;

            let loadedCount = 0;
            const totalImages = screenshots.length;

            screenshots.forEach((screenshot, index) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const yOffset = screenshot.scrollY;
                        const drawHeight = Math.min(
                            dimensions.viewportHeight,
                            dimensions.pageHeight - yOffset
                        );

                        ctx.drawImage(
                            img,
                            0, 0,
                            dimensions.viewportWidth, drawHeight,
                            0, yOffset,
                            dimensions.viewportWidth, drawHeight
                        );

                        loadedCount++;

                        if (loadedCount === totalImages) {
                            // All images stitched
                            try {
                                const fullDataUrl = canvas.toDataURL('image/png', 1.0);
                                resolve(fullDataUrl);
                            } catch (e) {
                                reject(new Error('Failed to export stitched image: ' + e.message));
                            }
                        }
                    } catch (e) {
                        reject(new Error('Failed to draw image on canvas: ' + e.message));
                    }
                };

                img.onerror = () => {
                    reject(new Error(`Failed to load screenshot ${index + 1}`));
                };

                img.src = screenshot.dataUrl;
            });
        } catch (error) {
            reject(new Error('Failed to create canvas: ' + error.message));
        }
    });
}

// Enhanced page data capture function
function capturePageData() {
    const elements = [];
    const seenElements = new Set();

    function getElementData(el) {
        try {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);

            let text = '';
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BUTTON', 'A', 'SPAN', 'LI', 'LABEL', 'DIV'].includes(el.tagName)) {
                text = Array.from(el.childNodes)
                    .filter(node => node.nodeType === 3)
                    .map(node => node.textContent.trim())
                    .join(' ')
                    .substring(0, 200);
            }

            const inputAttrs = {};
            if (el.tagName === 'INPUT') {
                inputAttrs.type = el.type || 'text';
                inputAttrs.placeholder = el.placeholder || '';
                inputAttrs.value = el.value || '';
            }

            return {
                tag: el.tagName.toLowerCase(),
                text: text,
                src: el.src || el.getAttribute('src') || '',
                href: el.href || el.getAttribute('href') || '',
                alt: el.alt || el.getAttribute('alt') || '',
                title: el.title || el.getAttribute('title') || '',
                id: el.id || '',
                classList: Array.from(el.classList).slice(0, 8),
                ariaLabel: el.getAttribute('aria-label') || '',
                inputAttrs: inputAttrs,
                rect: {
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    top: Math.round(rect.top + window.scrollY),
                    left: Math.round(rect.left)
                },
                styles: {
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight,
                    fontFamily: styles.fontFamily,
                    display: styles.display,
                    textAlign: styles.textAlign,
                    padding: styles.padding,
                    margin: styles.margin,
                    borderRadius: styles.borderRadius,
                    border: styles.border,
                    boxShadow: styles.boxShadow
                }
            };
        } catch (e) {
            return null;
        }
    }

    const structure = {
        header: document.querySelector('header'),
        nav: document.querySelector('nav'),
        main: document.querySelector('main') || document.querySelector('[role="main"]'),
        footer: document.querySelector('footer'),
        aside: document.querySelector('aside')
    };

    const selectors = [
        'header', 'nav', 'main', 'footer', 'aside', 'section', 'article',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'ul', 'ol', 'li',
        'img', 'svg', 'picture',
        'a', 'button', 'input', 'textarea', 'select', 'form', 'label',
        '.logo', '.brand', '.hero', '.banner', '.card', '.container', '.content', '.wrapper',
        '.navbar', '.menu', '.sidebar', '.grid', '.flex', '.search', '.input',
        '[role="search"]', '[role="navigation"]', '[role="banner"]'
    ];

    selectors.forEach(selector => {
        try {
            document.querySelectorAll(selector).forEach(el => {
                if (!seenElements.has(el)) {
                    seenElements.add(el);
                    const data = getElementData(el);
                    if (data) {
                        elements.push(data);
                    }
                }
            });
        } catch (e) {
            console.warn('Selector error:', selector, e);
        }
    });

    const bodyStyles = window.getComputedStyle(document.body);
    const htmlStyles = window.getComputedStyle(document.documentElement);

    const colorPalette = new Set();
    const bgColorPalette = new Set();
    elements.forEach(el => {
        if (el.styles.color && el.styles.color !== 'rgba(0, 0, 0, 0)') {
            colorPalette.add(el.styles.color);
        }
        if (el.styles.backgroundColor && el.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            bgColorPalette.add(el.styles.backgroundColor);
        }
    });

    return {
        title: document.title || 'Untitled Page',
        url: window.location.href,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollHeight: document.documentElement.scrollHeight
        },
        bodyStyles: {
            backgroundColor: bodyStyles.backgroundColor,
            color: bodyStyles.color,
            fontFamily: bodyStyles.fontFamily,
            fontSize: bodyStyles.fontSize,
            lineHeight: bodyStyles.lineHeight
        },
        htmlStyles: {
            backgroundColor: htmlStyles.backgroundColor
        },
        colorPalette: Array.from(colorPalette).slice(0, 10),
        bgColorPalette: Array.from(bgColorPalette).slice(0, 10),
        structure: {
            hasHeader: !!structure.header,
            hasNav: !!structure.nav,
            hasMain: !!structure.main,
            hasAside: !!structure.aside,
            hasFooter: !!structure.footer
        },
        elements: elements.slice(0, 200),
        capturedAt: new Date().toISOString()
    };
}

// Gemini API function (same as before)
async function generateReplicaWithGemini(pageData, screenshotData, apiKey) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`;

    const headings = pageData.elements.filter(el => el.tag.match(/^h[1-6]$/));
    const images = pageData.elements.filter(el => el.tag === 'img');
    const buttons = pageData.elements.filter(el => el.tag === 'button');
    const links = pageData.elements.filter(el => el.tag === 'a');
    const inputs = pageData.elements.filter(el => el.tag === 'input');

    const elementDescriptions = [];

    if (headings.length > 0) {
        elementDescriptions.push('HEADINGS:');
        headings.slice(0, 20).forEach((h, i) => {
            elementDescriptions.push(`  ${i + 1}. <${h.tag}> "${h.text}" - Font: ${h.styles.fontSize}, Weight: ${h.styles.fontWeight}`);
        });
    }

    if (images.length > 0) {
        elementDescriptions.push('\nIMAGES:');
        images.slice(0, 15).forEach((img, i) => {
            elementDescriptions.push(`  ${i + 1}. Size: ${img.rect.width}x${img.rect.height}px, Alt: "${img.alt}"`);
        });
    }

    if (buttons.length > 0) {
        elementDescriptions.push('\nBUTTONS:');
        buttons.slice(0, 10).forEach((btn, i) => {
            elementDescriptions.push(`  ${i + 1}. "${btn.text}" - BG: ${btn.styles.backgroundColor}`);
        });
    }

    const prompt = `You are an expert frontend developer. Create a COMPLETE, RESPONSIVE HTML page that is a pixel-perfect replica of the provided FULL PAGE screenshot (from header to footer).

CRITICAL: This is a FULL PAGE SCREENSHOT showing the ENTIRE website from top to bottom. You must recreate ALL sections visible in the screenshot.

REQUIREMENTS:
1. Use ONLY vanilla CSS in a <style> tag
2. Recreate ALL sections: header, navigation, hero, content sections, footer - EVERYTHING in the screenshot
3. Use semantic HTML5 tags
4. Make it fully responsive with mobile-first CSS media queries
5. Use CSS variables, Flexbox, and CSS Grid
6. Ensure proper UTF-8 encoding
7. Add proper accessibility attributes
8. Include smooth transitions and hover effects

PAGE DATA:
Title: ${pageData.title}
Full Page Height: ${pageData.viewport.scrollHeight}px

STRUCTURE (ALL PRESENT):
- Header: ${pageData.structure.hasHeader ? 'YES' : 'NO'}
- Navigation: ${pageData.structure.hasNav ? 'YES' : 'NO'}
- Main Content: ${pageData.structure.hasMain ? 'YES' : 'NO'}
- Sidebar: ${pageData.structure.hasAside ? 'YES' : 'NO'}
- Footer: ${pageData.structure.hasFooter ? 'YES' : 'NO'}

COLOR SCHEME:
- Background: ${pageData.bodyStyles.backgroundColor}
- Text: ${pageData.bodyStyles.color}
- Font: ${pageData.bodyStyles.fontFamily}

${elementDescriptions.join('\n')}

CSS TEMPLATE:
<style>
:root {
    --primary-color: /* from screenshot */;
    --bg-color: ${pageData.bodyStyles.backgroundColor};
    --text-color: ${pageData.bodyStyles.color};
    --spacing-xs: 0.5rem;
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 2rem;
    --spacing-xl: 3rem;
    --border-radius: 0.5rem;
    --transition: all 0.3s ease;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: ${pageData.bodyStyles.fontFamily};
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

@media (min-width: 768px) {
    .container { padding: 0 2rem; }
}
</style>

IMPORTANT:
1. Study the FULL screenshot carefully - it shows the ENTIRE page
2. Recreate EVERY section from top to bottom
3. Use placeholder images: https://placehold.co/WIDTHxHEIGHT
4. Make it mobile responsive
5. Add hover states for interactive elements

OUTPUT:
Return ONLY the complete HTML code. NO explanations. NO markdown. Just pure HTML starting with <!DOCTYPE html>.`;

    try {
        const base64Image = screenshotData.split(',')[1];

        const response = await fetch(`${API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/png',
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8000,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 400) {
                throw new Error('Invalid API key. Please check your Gemini API key.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response from Gemini API');
        }

        let htmlContent = data.candidates[0].content.parts[0].text;
        htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

        if (!htmlContent.includes('<html')) {
            throw new Error('Generated content is not valid HTML');
        }

        if (!htmlContent.includes('viewport')) {
            htmlContent = htmlContent.replace(
                '<head>',
                '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
            );
        }

        if (!htmlContent.includes('charset')) {
            htmlContent = htmlContent.replace(
                '<head>',
                '<head>\n    <meta charset="UTF-8">'
            );
        }

        return htmlContent;
    } catch (error) {
        if (error.message) {
            throw error;
        }
        throw new Error('Failed to connect to Gemini API. Check your internet connection.');
    }
}

function downloadHTML(htmlContent, pageTitle) {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = pageTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'page';
    a.download = `fullpage-replica-${filename}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}