# Image Object Separator

A Node.js script that separates and extracts individual objects from an image. This tool uses image processing techniques to identify distinct objects in an image and save them as separate PNG files.

## Features

- Automatically detects and extracts individual objects from images
- Supports transparent PNG images
- Configurable minimum object size
- Automatic image scaling for large images
- Maintains transparency in output images
- Command-line interface support

## Prerequisites

- Node.js (v14 or higher recommended)
- npm (Node Package Manager)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/designlook/individual-images-extractor
cd image-object-separator
```

2. Install dependencies:
```bash
npm install sharp
```

## Usage

### Command Line Interface

Custom input/output paths and minimum object size:
```bash
node image-separator.js <inputPath> <outputDir> <minPixels>
```

Example:
```bash
node image-separator.js ./input/sprites.png ./output
```

### Programmatic Usage

```javascript
const separateObjects = require('./image-separator.js');

// Using default options
separateObjects('input.png', 'output');

// With custom options
separateObjects('input.png', 'output', {
  minPixels: 75,        // Minimum object size in pixels
  maxDimension: 2000,   // Maximum dimension for scaling
  threshold: 240        // Brightness threshold for detection (0-255)
});
```

### Configuration Options

- `minPixels` (default: 50): Minimum number of pixels an object must contain to be extracted
- `maxDimension` (default: 2000): Maximum dimension for image scaling
- `threshold` (default: 240): Brightness threshold for object detection (0-255)

## How It Works

1. The script loads and preprocesses the input image:
   - Converts to grayscale
   - Applies thresholding
   - Handles automatic rotation and scaling if needed

2. Uses a flood-fill algorithm to detect distinct objects:
   - Scans the image for dark pixels
   - Groups connected pixels into objects
   - Filters objects based on minimum size

3. Extracts each detected object:
   - Creates a mask for each object
   - Preserves original colors and transparency
   - Saves as individual PNG files

## Output

- Creates an output directory if it doesn't exist
- Saves each extracted object as a separate PNG file
- Files are named sequentially (object_0.png, object_1.png, etc.)
- Maintains original transparency and color information

## Limitations

- Works best with images that have distinct, separated objects
- Very small objects (below minimum pixel threshold) are ignored
- Large images are automatically scaled down to improve processing speed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
