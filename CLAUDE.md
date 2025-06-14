# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Flask web application that reverses SVG path directions for stroke-dashoffset animations. The application parses SVG content, allows users to select specific paths to reverse, and generates downloadable animation packages.

## Core Architecture

- **Backend**: Flask application (`main.py`) with three main endpoints:
  - `/`: Serves the main interface with default SVG
  - `/process-svg`: Parses SVG and extracts path information
  - `/reverse-paths`: Reverses selected paths and applies animation classes
  - `/download-animation`: Generates downloadable animation zip file

- **Frontend**: Uses DaisyUI/Tailwind CSS for styling with vanilla JavaScript for interactions

- **SVG Processing**: Uses `svgpathtools` for path manipulation and `lxml` for XML parsing with namespace support

## Key Components

- **Path Extraction**: Handles both namespaced and non-namespaced SVG paths, preserves all attributes
- **Animation Classes**: Supports `duration-*`, `delay-*`, and `ease-*` classes with dot-to-underscore conversion
- **Zip Generation**: Creates downloadable packages with HTML and animation JavaScript files

## Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py

# Production deployment uses Vercel with Python runtime
```

## File Structure

- `main.py`: Main Flask application
- `templates/index.html`: Main UI template
- `static/js/main.js`: Frontend JavaScript logic
- `static/js/anim.mjs`: Animation module for downloaded packages
- `static/svg/`: Default SVG files
- `static/zip_files/index.html`: Template for downloadable animations
- `vercel.json`: Vercel deployment configuration

## Analytics Integration

The application includes Umami analytics for privacy-focused tracking:

- **Client-side tracking**: Events tracked include SVG parsing, path toggling, animation previews, downloads, and configuration changes
- **Server-side tracking**: Backend performance and error monitoring for all API endpoints
- **Configuration**: Set `PUBLIC_UMAMI_SRC` and `PUBLIC_UMAMI_WEBSITE_ID` environment variables (see `.env.example`)
- **Privacy**: Cookieless tracking, GDPR compliant, no personal data collection

### Key Analytics Events

- `svg_parsed` - SVG processing with complexity metrics
- `path_toggled` - Path reversal state changes with context
- `animation_previewed` - Animation tests with settings
- `svg_copied` - Export usage with metadata
- `animation_downloaded` - Package generation with full context
- `animation_configured` - Parameter changes (duration, delay, easing)
- `processing_error` - Client and server errors with context
- `server_*` events - Backend processing and performance metrics

## Important Notes

- SVG content is automatically wrapped in `<svg>` tags if not present
- Path reversal uses `svgpathtools.Path.reversed()` method
- Animation classes use underscore format (`duration-1_5` for 1.5s duration)
- Deployment is configured for Vercel with Python runtime
- Analytics tracking gracefully degrades if Umami is unavailable