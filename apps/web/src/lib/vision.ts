import Tesseract from "tesseract.js";
import {
  Florence2ForConditionalGeneration,
  AutoProcessor,
  RawImage,
} from "@huggingface/transformers";

// Configure transformers.js to use the CDN for WebAssembly files if needed
// env.allowLocalModels = false;
// env.useBrowserCache = true;

// Use 'any' to avoid complicated internal typings in transformers.js v3
let vlmModel: any = null;
let vlmProcessor: any = null;
let isVlmLoading = false;

/**
 * Loads the Vision-Language Model (VLM) via transformers.js.
 */
async function loadFlorence() {
  if (vlmModel && vlmProcessor)
    return { model: vlmModel, processor: vlmProcessor };

  if (isVlmLoading) {
    // Wait if it's currently loading
    while (isVlmLoading) await new Promise((r) => setTimeout(r, 100));
    return { model: vlmModel, processor: vlmProcessor };
  }

  isVlmLoading = true;
  try {
    console.log("Loading Florence model...");
    const model_id = "onnx-community/Florence-2-base-ft";

    vlmProcessor = await AutoProcessor.from_pretrained(model_id);
    vlmModel = await Florence2ForConditionalGeneration.from_pretrained(
      model_id,
      {
        dtype: {
          embed_tokens: "fp16",
          vision_encoder: "fp16",
          encoder_model: "q4",
          decoder_model_merged: "q4",
        },
      },
    );

    console.log("Florence model loaded successfully");
  } catch (e) {
    console.error("Failed to load Florence model:", e);
  } finally {
    isVlmLoading = false;
  }

  return { model: vlmModel, processor: vlmProcessor };
}

export interface VisionResult {
  text: string;
  labels: string[];
}

/**
 * Extracts text and classification labels from an image data URL.
 *
 * @param imageData Base64 encoded image data URL
 * @param useFlorence Whether to use the advanced VLM for image descriptions instead of basic tags
 * @returns Promise with recognized text and image classification labels
 */
export async function processImage(
  imageData: string,
  useFlorence: boolean = false,
): Promise<VisionResult> {
  const result: VisionResult = { text: "", labels: [] };

  try {
    // 1. Extract text using Tesseract.js (Always runs)
    // recognize accepts the Data URL directly
    const tesseractResult = await Tesseract.recognize(imageData, "eng", {
      // logger: m => console.log(m) // Optional logging
    });

    // Clean up extracted text (remove extra whitespace and low-confidence gibberish)
    if (tesseractResult.data) {
      const data = tesseractResult.data as any; // Cast to access 'lines' which is present in Tesseract.js output

      if (data.lines && Array.isArray(data.lines)) {
        // Filter out noisy lines often caused by patterns/textures (confidence < 60)
        const validLines = data.lines
          .filter((line: any) => line.confidence > 60)
          .map((line: any) => line.text.trim())
          .filter((text: string) => text.length > 0);

        result.text = validLines.join("\n");
      } else if (data.text && data.confidence > 60) {
        // Fallback
        result.text = data.text.trim();
      }
    }
  } catch (error) {
    console.error("OCR failed:", error);
  }

  // 2. Generate Image Description (if Florence is enabled)
  if (useFlorence) {
    try {
      const { model, processor } = await loadFlorence();
      if (model && processor) {
        // Load the image into the format the model expects
        const image = await RawImage.fromURL(imageData);

        // Specify the task (Florence-2 uses specific prompt tags like <MORE_DETAILED_CAPTION> or <OD>)
        const task = "<MORE_DETAILED_CAPTION>";

        // Prepare inputs
        const inputs = await processor(image, task);

        // Generate text
        const generatedIds = await model.generate({
          ...inputs,
          max_new_tokens: 100,
        });

        // Decode the output back into a readable string
        const generatedText = processor.batch_decode(generatedIds, {
          skip_special_tokens: false,
        })[0];

        // Clean up the output and append it to your OCR text
        const cleanText = generatedText.replace(task, "").trim();
        if (cleanText) {
          result.text = result.text
            ? `${result.text}\n\n[Description]: ${cleanText}`
            : cleanText;
        }
      }
    } catch (error) {
      console.error("Florence failed:", error);
    }
  }

  return result;
}
