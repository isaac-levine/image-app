import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../config";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Custom error class for Gemini API errors
export class GeminiError extends Error {
  constructor(message, code, originalError = null) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
    this.originalError = originalError;
  }
}

// Function to apply image effects using Gemini
export async function applyImageEffect(
  imageUri,
  effectName,
  customPrompt = ""
) {
  try {
    // Validate inputs
    if (!imageUri) {
      throw new GeminiError("No image provided", "MISSING_IMAGE");
    }

    if (effectName === "Custom" && !customPrompt.trim()) {
      throw new GeminiError("Custom prompt is empty", "EMPTY_PROMPT");
    }

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
      throw new GeminiError(
        "Gemini API key is not configured",
        "MISSING_API_KEY"
      );
    }

    // Get the model (using Gemini 2.0 Flash Experimental for image generation)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Convert the image URI to a file object or base64 string
    let imageData;
    try {
      imageData = await fetchImageAsBase64(imageUri);
    } catch (error) {
      throw new GeminiError(
        "Failed to process the image. Please try a different image.",
        "IMAGE_PROCESSING_ERROR",
        error
      );
    }

    // Create the prompt based on the effect
    let prompt = "";
    if (effectName.toLowerCase() === "custom" && customPrompt) {
      // Use the custom prompt provided by the user
      prompt = customPrompt;
    } else {
      // Use predefined prompts for standard effects
      switch (effectName.toLowerCase()) {
        case "enhance":
          prompt =
            "Enhance this image to make it look more professional with better lighting and colors.";
          break;
        case "style":
          prompt =
            "Transform this image into an artistic style, like a painting.";
          break;
        case "crop":
          prompt = "Crop and frame this image to focus on the main subject.";
          break;
        case "adjust":
          prompt =
            "Adjust the contrast and brightness of this image to make it look better.";
          break;
        default:
          prompt = `Apply a ${effectName} effect to this image.`;
      }
    }

    // Send the request to Gemini with timeout handling
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 60000)
    );

    const apiPromise = model.generateContent({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageData } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["Text", "Image"],
      },
    });

    // Race between the API call and the timeout
    const result = await Promise.race([apiPromise, timeoutPromise]);

    // Extract the image from the response
    const response = result.response;

    // Check if we have valid candidates
    if (!response.candidates || response.candidates.length === 0) {
      throw new GeminiError(
        "The AI model did not return any results",
        "NO_CANDIDATES"
      );
    }

    const parts = response.candidates[0].content.parts;

    // Find the image part in the response
    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new GeminiError(
      "No image was returned from Gemini API",
      "NO_IMAGE_RETURNED"
    );
  } catch (error) {
    console.error("Error applying image effect:", error);

    // Handle specific API errors
    if (error.name === "GeminiError") {
      throw error; // Re-throw our custom error
    }

    // Handle network errors
    if (error.message && error.message.includes("Network Error")) {
      throw new GeminiError(
        "Network error. Please check your internet connection.",
        "NETWORK_ERROR",
        error
      );
    }

    // Handle timeout errors
    if (error.message && error.message.includes("timed out")) {
      throw new GeminiError(
        "Request timed out. The AI service is taking too long to respond.",
        "TIMEOUT",
        error
      );
    }

    // Handle rate limiting
    if (
      error.message &&
      (error.message.includes("quota") ||
        error.message.includes("rate limit") ||
        error.message.includes("429"))
    ) {
      throw new GeminiError(
        "API rate limit exceeded. Please try again later.",
        "RATE_LIMIT",
        error
      );
    }

    // Handle authentication errors
    if (
      error.message &&
      (error.message.includes("authentication") ||
        error.message.includes("API key") ||
        error.message.includes("401"))
    ) {
      throw new GeminiError(
        "Authentication error. Please check your API key.",
        "AUTH_ERROR",
        error
      );
    }

    // Generic error fallback
    throw new GeminiError(
      "An error occurred while processing your image. Please try again.",
      "UNKNOWN_ERROR",
      error
    );
  }
}

// Helper function to fetch an image and convert it to base64
async function fetchImageAsBase64(uri) {
  try {
    // For React Native, we need to handle this differently than in a web environment
    // This is a simplified example - you may need to adjust based on your setup
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Get the base64 string (remove the data:image/jpeg;base64, prefix)
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw new GeminiError(
      "Failed to process the image file. The image may be corrupted or too large.",
      "IMAGE_CONVERSION_ERROR",
      error
    );
  }
}
