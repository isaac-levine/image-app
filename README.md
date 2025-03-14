# Gemini Image App

A React Native mobile application that allows users to take photos with their device camera and modify them using Google's Gemini image model.

## Features

- Seamless camera experience that automatically launches the device's native camera
- Modern, intuitive UI for image editing
- AI-powered image modifications using Google Gemini
- Custom text prompts for personalized image transformations
- Comprehensive error handling with user-friendly error messages
- Full-screen image viewer with save to camera roll functionality

## Project Structure

- `app/(tabs)/index.tsx` - Camera screen with auto-launching camera
- `app/(tabs)/editor.tsx` - Image editor screen with Gemini integration
- `app/(tabs)/_layout.tsx` - Tab navigation layout
- `components/CameraView.tsx` - Custom camera component with auto-launch functionality
- `services/geminiService.js` - Service for interacting with the Gemini API
- `config.js` - Configuration file for API keys (not included in repository)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `config.js` file in the root directory with your Gemini API key:
   ```javascript
   export const GEMINI_API_KEY = "YOUR_API_KEY_HERE";
   ```
4. Start the development server:
   ```
   npm start
   ```

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click on "Get API key" to create a new API key
4. Copy your API key and add it to the `config.js` file

## Current Implementation Status

- ✅ Camera functionality with auto-launching native camera
- ✅ Photo capture and preview
- ✅ Image selection from gallery in the editor screen
- ✅ Image sharing between camera and editor screens
- ✅ Google Gemini AI integration for image processing
- ✅ Custom text prompts for AI image modifications
- ✅ Modern, intuitive UI
- ✅ Comprehensive error handling with user-friendly messages
- ✅ Full-screen image viewer with save functionality

## How to Use

1. **Camera Screen**:

   - The native camera automatically launches when you open the app
   - Switch between front and back cameras with the flip button
   - Take a photo using the device's native camera UI
   - Preview captured photos
   - Choose to use the photo or retake it
   - Photos are automatically saved to your gallery when used

2. **Editor Screen**:
   - View photos from camera or gallery
   - Enter custom text prompts to describe how you want to modify your image
   - Apply AI modifications using Google Gemini
   - Reset to original image or clear image as needed
   - Replace image with a new one using the replace button
   - Receive clear error messages if something goes wrong
   - Tap on the image to view it in full screen
   - Save processed images directly to your camera roll

## Full-Screen Image Viewer

The app includes a full-screen image viewer that allows you to:

- View both original and AI-modified images in full screen
- Save any image directly to your camera roll with one tap
- Easily return to the editor with the close button
- AI-processed images are saved to a dedicated "Gemini AI" album

## Error Handling

The app includes comprehensive error handling for the Gemini API integration:

- Network connectivity issues
- API key configuration problems
- Rate limiting and quota errors
- Image processing failures
- Timeout handling
- User-friendly error messages with suggestions for resolution

## Custom Prompt Examples

Try these example prompts with the custom prompt feature:

- "Make this image look like a watercolor painting"
- "Convert this photo to a comic book style"
- "Add a sunset glow to this image"
- "Make this look like it was taken in the 1970s"
- "Add a bokeh effect to the background"
- "Turn this into a black and white noir style photo"
- "Transform this into a cyberpunk style image"
- "Make this look like it's from a Wes Anderson movie"
- "Add a dreamy, ethereal quality to this photo"
- "Convert this to look like an oil painting"

## Next Steps

1. Enhance Camera Features:

   - Add more camera controls (zoom, exposure, flash, etc.)
   - Implement filters and effects for the camera
   - Add support for video recording

2. Enhance Gemini API Integration:

   - Add more advanced image processing options
   - Implement prompt history for reusing successful prompts
   - Add offline mode for when API is unavailable

3. Enhance UI/UX:
   - Implement image sharing to social media
   - Add a gallery of previously edited images
   - Implement user preferences for default settings

## Dependencies

- expo
- expo-image-picker (for native camera functionality)
- expo-image-manipulator
- expo-media-library
- react-native
- @google/generative-ai

## Notes

- The app uses the device's native camera UI through ImagePicker for a seamless camera experience
- You need to provide your own Gemini API key in the `config.js` file
- The Gemini API has usage limits, check [Google AI pricing](https://ai.google.dev/pricing) for details
- The app includes robust error handling to provide a better user experience
- Processed images are saved to a dedicated "Gemini AI" album in your gallery

## License

MIT
