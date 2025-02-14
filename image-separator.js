const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

async function separateObjects(inputPath, outputDir, options = {}) {
  try {
    const {
      minPixels = 50,         // Default minimum size in pixels
      maxDimension = 2000,    // Maximum dimension for scaling
      threshold = 240         // Threshold for object detection
    } = options;

    console.log(`Processing image: ${inputPath}`);

    // Load and auto-rotate image
    let image = sharp(inputPath).rotate();
    const metadata = await image.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Handle image scaling if needed
    let scale = 1;
    if (width > maxDimension || height > maxDimension) {
      scale = maxDimension / Math.max(width, height);
      image = image.resize(Math.round(width * scale), Math.round(height * scale));
    }

    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);

    // Get both mask and composite data
    const [maskBuffer, compositeBuffer] = await Promise.all([
      image.clone().grayscale().threshold(threshold).raw().toBuffer(),
      image.clone().ensureAlpha().raw().toBuffer()
    ]);

    const maskData = new Uint8Array(maskBuffer);
    const compositeData = new Uint8Array(compositeBuffer);
    const visited = new Uint8Array(scaledWidth * scaledHeight);

    // Prepare flood fill queues
    const maxQueueSize = scaledWidth * scaledHeight;
    const queueX = new Int32Array(maxQueueSize);
    const queueY = new Int32Array(maxQueueSize);

    function floodFill(startX, startY) {
      let queueSize = 0;
      queueX[queueSize] = startX;
      queueY[queueSize] = startY;
      queueSize++;

      const objectPixels = new Set();
      const bounds = {
        minX: startX,
        minY: startY,
        maxX: startX,
        maxY: startY
      };

      while (queueSize > 0) {
        queueSize--;
        const x = queueX[queueSize];
        const y = queueY[queueSize];
        const pos = y * scaledWidth + x;

        if (x < 0 || x >= scaledWidth || y < 0 || y >= scaledHeight ||
            visited[pos] || maskData[pos] >= threshold) {
          continue;
        }

        visited[pos] = 1;
        objectPixels.add(pos);

        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);

        // Add adjacent pixels to queue
        if (queueSize + 4 < maxQueueSize) {
          if (x + 1 < scaledWidth) {
            queueX[queueSize] = x + 1;
            queueY[queueSize] = y;
            queueSize++;
          }
          if (x - 1 >= 0) {
            queueX[queueSize] = x - 1;
            queueY[queueSize] = y;
            queueSize++;
          }
          if (y + 1 < scaledHeight) {
            queueX[queueSize] = x;
            queueY[queueSize] = y + 1;
            queueSize++;
          }
          if (y - 1 >= 0) {
            queueX[queueSize] = x;
            queueY[queueSize] = y - 1;
            queueSize++;
          }
        }
      }

      return { objectPixels, bounds };
    }

    // Find objects
    const minObjectSize = minPixels;  // Direct pixel count threshold
    const objects = [];

    for (let y = 0; y < scaledHeight; y += 2) {
      for (let x = 0; x < scaledWidth; x += 2) {
        const pos = y * scaledWidth + x;
        if (!visited[pos] && maskData[pos] < threshold) {
          const objData = floodFill(x, y);
          if (objData.objectPixels.size > minObjectSize) {
            objects.push(objData);
          }
        }
      }
    }

    console.log(`Found ${objects.length} objects`);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Process and save each object
    await Promise.all(objects.map(async (obj, index) => {
      const { objectPixels, bounds } = obj;
      const objWidth = bounds.maxX - bounds.minX + 1;
      const objHeight = bounds.maxY - bounds.minY + 1;

      const objBuffer = Buffer.alloc(objWidth * objHeight * 4);

      for (const pos of objectPixels) {
        const x = pos % scaledWidth;
        const y = Math.floor(pos / scaledWidth);
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
          const sourcePos = pos * 4;
          const targetX = x - bounds.minX;
          const targetY = y - bounds.minY;
          const targetPos = (targetY * objWidth + targetX) * 4;

          objBuffer[targetPos] = compositeData[sourcePos];
          objBuffer[targetPos + 1] = compositeData[sourcePos + 1];
          objBuffer[targetPos + 2] = compositeData[sourcePos + 2];
          objBuffer[targetPos + 3] = 255;
        }
      }

      const outputPath = path.join(outputDir, `object_${index}.png`);
      await sharp(objBuffer, {
        raw: {
          width: objWidth,
          height: objHeight,
          channels: 4
        }
      })
        .png({ compressionLevel: 6 })
        .toFile(outputPath);

      console.log(`Saved object ${index} to ${outputPath}`);
    }));

    console.log('Processing complete!');
    return objects.length;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Example usage
const options = {
  minPixels: 150,        // Minimum object size in pixels
  maxDimension: 2000,   // Maximum dimension for scaling
  threshold: 240        // Threshold for object detection (0-255)
};

// If running directly (not imported)
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputPath = args[0] || './input/sprites.png';
  const outputDir = args[1] || './output';
  const minPixels = parseInt(args[2]) || options.minPixels;

  separateObjects(inputPath, outputDir, { 
    ...options, 
    minPixels 
  })
    .then(numObjects => console.log(`Successfully processed ${numObjects} objects`))
    .catch(error => console.error('Failed to process image:', error));
}

module.exports = separateObjects;