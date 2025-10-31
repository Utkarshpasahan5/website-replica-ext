🪞 PageMirror - Chrome Extension

  AI-Powered Full-Page Website Replicator
  Capture any webpage and instantly generate a responsive HTML replica using Google's Gemini AI.
  
  ✨ Features
  
  🎯 Full-Page Capture - Automatically scrolls and captures entire webpages from header to footer
  🤖 AI-Powered Generation - Uses Gemini 2.0 Flash to analyze screenshots and generate pixel-perfect replicas
  📱 Responsive Output - Generated HTML includes mobile-first responsive CSS
   🎨 Style Preservation - Maintains colors, fonts, layouts, and visual hierarchy
   ⚡ Fast & Efficient - Smart screenshot stitching with progress indicators
   🔒 Privacy-First - API key stored locally, no data sent to external servers (except Gemini API)
  
  🚀 Quick Start
    Installation
    
   Clone or download this repository
   bash   git clone https://github.com/yourusername/pagemirror.git
    
  Get a Gemini API Key
    
   Visit Google AI Studio
   Sign in with your Google account
   Click "Create API Key"
   Copy your API key
    
    
  Load Extension in Chrome
    
   Open Chrome and navigate to chrome://extensions/
    Enable "Developer mode" (toggle in top-right)
    Click "Load unpacked"
    Select the pagemirror folder
    
    
  Configure API Key
    
   Click the PageMirror extension icon
    Paste your Gemini API key
    Key is automatically saved for future use
    
    
    
   Usage
    
  Navigate to any webpage you want to replicate
    Click the PageMirror extension icon
    Click "Capture & Generate" button
    Wait for the full-page capture (progress shown in real-time)
    Download the generated HTML file automatically
    
  The extension will:
    
  Scroll through the entire page
    Capture multiple screenshots
    Stitch them into a single full-page image
    Analyze page structure and styles
    Generate responsive HTML/CSS replica
    Download the complete HTML file
    
  📋 Requirements
  
  Chrome Browser (version 88 or higher)
  Gemini API Key (free tier available)
  Active Internet Connection (for API calls)
  
  🛠️ Technical Details
  Architecture
  pagemirror/
  ├── manifest.json       # Extension configuration (Manifest V3)
  ├── popup.html          # Extension popup UI
  ├── popup.js            # Main logic & Gemini API integration
  ├── background.js       # Service worker for tab capture
  ├── content.js          # Page analysis script
  └── README.md           # Documentation
  Key Technologies
  
  Chrome Extension API (Manifest V3)
  Canvas API - Screenshot stitching
  Gemini 2.0 Flash - AI-powered HTML generation
  Chrome Scripting API - Page analysis and capture
  
  How It Works
  
  Page Analysis - Content script analyzes DOM structure, styles, and elements
  Full-Page Capture - Automatically scrolls and captures multiple screenshots
  Image Stitching - Combines screenshots into single full-page image using Canvas API
  AI Processing - Sends screenshot + page data to Gemini API
  HTML Generation - Gemini generates semantic, responsive HTML/CSS
  Download - Complete HTML file ready for use
  
  🎨 Generated HTML Features
  The AI-generated replicas include:
  
  ✅ Semantic HTML5 structure
  ✅ Modern CSS with CSS Variables
  ✅ Flexbox & CSS Grid layouts
  ✅ Mobile-first responsive design
  ✅ Smooth transitions and hover effects
  ✅ Accessibility attributes
  ✅ UTF-8 encoding
  ✅ Placeholder images (via placehold.co)
  
  ⚙️ Permissions Explained
  json"permissions": [
    "activeTab",     // Capture current tab
    "scripting",     // Inject analysis script
    "storage",       // Save API key locally
    "tabs"           // Access tab information
  ]
  All permissions are necessary for core functionality and privacy-focused.
  🔐 Privacy & Security
  
  API keys stored locally in Chrome's sync storage
  No external servers except Google's Gemini API
  Screenshots processed in-browser before API call
  No tracking or analytics
  Open source - audit the code yourself
  
  ⚡ Performance Tips
  
  Works best on pages with heights under 20,000px
  Simpler pages = faster generation
  First capture may take 10-30 seconds depending on page size
  API rate limits apply (check Gemini API quotas)
  
  🐛 Troubleshooting
  "Cannot capture Chrome system pages"
  Solution: Extension cannot capture chrome:// or chrome-extension:// URLs. Navigate to a regular webpage.
  "Invalid API key"
  Solution: Double-check your API key from Google AI Studio. Ensure no extra spaces.
  "Screenshot capture failed"
  Solution: Page may have scroll restrictions. Try refreshing the page and capturing again.
  "Rate limit exceeded"
  Solution: Wait a few minutes. Free tier has API call limits. Consider upgrading your Gemini API plan.
  Incomplete Page Capture
  Solution: Very long pages (>50,000px height) may have issues. Try capturing specific sections.
  
  🤝 Contributing
  Contributions are welcome! Here's how:
  
  Fork the repository
  Create a feature branch (git checkout -b feature/amazing-feature)
  Commit changes (git commit -m 'Add amazing feature')
  Push to branch (git push origin feature/amazing-feature)
  Open a Pull Request
  
  Development Setup
  bash# Clone repo
  git clone https://github.com/yourusername/pagemirror.git
  cd pagemirror
  
  # Make changes to code
  # Test in Chrome by loading unpacked extension
  
  # For debugging
  # Open Chrome DevTools on extension popup
  # Check background script logs in chrome://extensions
  📝 Known Limitations
  
  Cannot capture password-protected pages
  Dynamic content (videos, animations) captured as static
  JavaScript interactivity not preserved
  Some complex CSS layouts may need manual adjustment
  Generated code is a starting point, not production-ready
  
  🗺️ Roadmap
  
   Support for Firefox and Edge
   Batch processing multiple pages
   Custom prompt templates
   Direct export to CodePen/JSFiddle
   Component extraction (headers, footers, etc.)
   Dark mode support in generated HTML
   Local LLM support (Ollama integration)
  
  🙏 Acknowledgments
  
  Google Gemini AI for powerful vision capabilities
  Chrome Extension community for documentation
  All contributors and users
  
  📧 Support

  Email: utkarshpasahan5@gmail.com
