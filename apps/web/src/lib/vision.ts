import Tesseract from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Ensure TensorFlow.js has initialized its backend before loading the model
let tfInitialized = false;
let model: mobilenet.MobileNet | null = null;

async function initTF() {
  if (!tfInitialized) {
    await tf.ready();
    tfInitialized = true;
  }
}

/**
 * Loads the MobileNet model, initializing TensorFlow.js if needed.
 * Returns the cached model if already loaded.
 */
async function getModel() {
  await initTF();
  if (!model) {
    try {
      model = await mobilenet.load();
    } catch (e) {
      console.error("Failed to load MobileNet model:", e);
    }
  }
  return model;
}

export interface VisionResult {
  text: string;
  labels: string[];
}

/**
 * Extracts text and classification labels from an image data URL.
 * 
 * @param imageData Base64 encoded image data URL
 * @returns Promise with recognized text and image classification labels
 */
export async function processImage(imageData: string): Promise<VisionResult> {
  const result: VisionResult = { text: "", labels: [] };

  try {
    // 1. Extract text using Tesseract.js
    // recognize accepts the Data URL directly
    const tesseractResult = await Tesseract.recognize(imageData, 'eng', {
      // logger: m => console.log(m) // Optional logging
    });
    
    // Clean up extracted text (remove extra whitespace)
    if (tesseractResult.data && tesseractResult.data.text) {
      result.text = tesseractResult.data.text.trim();
    }
  } catch (error) {
    console.error("OCR failed:", error);
  }

  try {
    // 2. Classify image using MobileNet
    const net = await getModel();
    if (net) {
      // Create HTMLImageElement to pass to classify
      const img = new Image();
      img.src = imageData;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for classification"));
      });

      const predictions = await net.classify(img);
      
      // Get the top labels and process them into tags (lowercase, replace spaces with hyphens)
      result.labels = predictions
        .filter(p => p.probability > 0.1) // Only keep labels with > 10% confidence
        .flatMap(p => p.className.split(",")) // Sometimes class names are comma-separated
        .map(label => label.trim().toLowerCase().replace(/\s+/g, '-')) // Normalize for tags
        .slice(0, 3); // Take top 3 max to avoid overwhelming the tags
    }
  } catch (error) {
    console.error("Image classification failed:", error);
  }

  return result;
}
