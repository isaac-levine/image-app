import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  View as RNView,
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import { Text, View } from "@/components/Themed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { applyImageEffect, GeminiError } from "../../services/geminiService";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ImageEditorScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const lastImageUriRef = useRef<string | null>(null);

  // Set the image from params if available
  useEffect(() => {
    if (imageUri && imageUri !== lastImageUriRef.current) {
      // Only update if the imageUri is different from the last one we processed
      setSelectedImage(imageUri);
      setProcessedImage(null); // Reset processed image when a new image is received
      lastImageUriRef.current = imageUri;

      // Reset the prompt when a new image is loaded
      setCustomPrompt("");
    }
  }, [imageUri]);

  // Listen for navigation focus events to handle new images
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // When the screen is focused, check if there's a new image URI
      if (imageUri && imageUri !== lastImageUriRef.current) {
        setSelectedImage(imageUri);
        setProcessedImage(null);
        lastImageUriRef.current = imageUri;
        setCustomPrompt("");
      }
    });

    return unsubscribe;
  }, [navigation, imageUri]);

  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        // Scroll to make sure the input and button are visible
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setProcessedImage(null); // Reset processed image when selecting a new one
      lastImageUriRef.current = result.assets[0].uri; // Update the last image URI reference
    }
  };

  // Handle different types of errors
  const handleGeminiError = (error: any) => {
    let message = "An unexpected error occurred. Please try again.";
    let suggestion = "";

    if (error instanceof GeminiError) {
      switch (error.code) {
        case "MISSING_API_KEY":
          message = "API key is not configured";
          suggestion = "Please add your Gemini API key in the config.js file.";
          break;
        case "EMPTY_PROMPT":
          message = "Please enter a text prompt";
          suggestion = "Describe how you want to modify your image.";
          break;
        case "NETWORK_ERROR":
          message = "Network connection error";
          suggestion = "Please check your internet connection and try again.";
          break;
        case "TIMEOUT":
          message = "Request timed out";
          suggestion =
            "The AI service is taking too long to respond. Please try again later.";
          break;
        case "RATE_LIMIT":
          message = "API rate limit exceeded";
          suggestion =
            "You've reached the limit of requests. Please try again later.";
          break;
        case "AUTH_ERROR":
          message = "Authentication error";
          suggestion = "Please check your API key in the config.js file.";
          break;
        case "IMAGE_PROCESSING_ERROR":
        case "IMAGE_CONVERSION_ERROR":
          message = "Image processing error";
          suggestion =
            "The image may be too large or in an unsupported format. Try a different image.";
          break;
        case "NO_CANDIDATES":
        case "NO_IMAGE_RETURNED":
          message = "AI couldn't process your request";
          suggestion = "Try a different prompt or image, or try again later.";
          break;
        default:
          message = error.message || "An error occurred";
          suggestion = "Please try again or use a different image/prompt.";
      }
    } else if (error.message) {
      message = error.message;
    }

    setErrorMessage(`${message}${suggestion ? `\n\n${suggestion}` : ""}`);
    setShowErrorModal(true);
  };

  const applyCustomPrompt = async () => {
    dismissKeyboard();

    if (!selectedImage) {
      setErrorMessage("Please select an image first");
      setShowErrorModal(true);
      return;
    }

    if (!customPrompt.trim()) {
      setErrorMessage("Please enter a text prompt for the AI");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsProcessing(true);
      setCurrentEffect("Custom");

      // Call the Gemini API with the custom prompt
      const processedImageUri = await applyImageEffect(
        selectedImage,
        "Custom",
        customPrompt
      );

      // Update the UI with the processed image
      setProcessedImage(processedImageUri);

      Alert.alert(
        "AI Modification Applied",
        "Your image has been modified using Google Gemini AI."
      );
    } catch (error) {
      console.error("Error applying custom effect:", error);
      handleGeminiError(error);
    } finally {
      setIsProcessing(false);
      setCurrentEffect(null);
    }
  };

  // Reset image to original (remove filter)
  const resetImage = () => {
    if (processedImage && selectedImage) {
      setProcessedImage(null);
      // Keep the selectedImage intact, just remove the processed version
    }
  };

  // Clear image completely (delete image)
  const clearImage = () => {
    setSelectedImage(null);
    setProcessedImage(null);
    setCustomPrompt("");
    lastImageUriRef.current = null;

    // Navigate back to camera tab
    router.navigate("/(tabs)");
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage(null);
  };

  // Open full screen image viewer
  const openFullScreenImage = (imageUri: string) => {
    setFullScreenImage(imageUri);
    setShowFullScreenImage(true);
  };

  // Close full screen image viewer
  const closeFullScreenImage = () => {
    setShowFullScreenImage(false);
    setFullScreenImage(null);
  };

  // Save image to camera roll
  const saveImageToCameraRoll = async () => {
    if (!fullScreenImage) return;

    try {
      setIsSaving(true);

      // Check if the image is a base64 data URI
      if (fullScreenImage.startsWith("data:")) {
        // For base64 images (processed by Gemini), we need to create a temporary file first
        // Extract the mime type and base64 data
        const matches = fullScreenImage.match(/^data:(.+?);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
          throw new Error("Invalid data URI format");
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Determine file extension from mime type
        let fileExt = "jpg"; // Default to jpg
        if (mimeType === "image/png") {
          fileExt = "png";
        } else if (mimeType === "image/gif") {
          fileExt = "gif";
        } else if (mimeType === "image/webp") {
          fileExt = "webp";
        }

        // Create a temporary file URI in the app's cache directory
        const fileUri = `${
          FileSystem.cacheDirectory
        }gemini_image_${Date.now()}.${fileExt}`;

        // Write the base64 data to the file
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Save the file to the media library
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Gemini AI", asset, false);

        // Clean up the temporary file
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } else {
        // For regular file URIs
        await MediaLibrary.saveToLibraryAsync(fullScreenImage);
      }

      setIsSaving(false);
      Alert.alert("Success", "Image saved to camera roll");
    } catch (error: any) {
      setIsSaving(false);
      console.error("Error saving image:", error);
      Alert.alert(
        "Error",
        `Failed to save image: ${error.message || "Unknown error"}`
      );
    }
  };

  const displayImage = processedImage || selectedImage;

  const promptSection = (
    <RNView style={styles.inputContainer}>
      <TextInput
        style={[
          styles.customPromptInput,
          keyboardVisible && styles.smallerInput,
        ]}
        placeholder="Describe how you want to modify your image (e.g., 'Make it look like a watercolor painting')"
        value={customPrompt}
        onChangeText={setCustomPrompt}
        multiline
        numberOfLines={keyboardVisible ? 2 : 3}
        placeholderTextColor="#999"
        editable={!isProcessing}
      />
      {customPrompt.length > 0 && (
        <TouchableOpacity
          style={styles.clearInputButton}
          onPress={() => {
            setCustomPrompt("");
            dismissKeyboard();
          }}
        >
          <FontAwesome name="times-circle" size={20} color="#999" />
        </TouchableOpacity>
      )}
    </RNView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.container}>
              {/* <View style={styles.headerContainer}>
                <Text style={styles.headerText}>AI Image Editor</Text>
                <Text style={styles.subHeaderText}>
                  Powered by Google Gemini
                </Text>
              </View> */}

              {displayImage ? (
                <RNView style={styles.contentContainer}>
                  <TouchableOpacity
                    style={styles.imageWrapper}
                    onPress={() => openFullScreenImage(displayImage)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: displayImage }}
                      style={[
                        styles.image,
                        keyboardVisible && styles.smallerImage,
                      ]}
                      resizeMode="cover"
                    />
                    <RNView style={styles.viewFullScreenHint}>
                      <FontAwesome name="search-plus" size={16} color="white" />
                      <Text style={styles.viewFullScreenText}>
                        View Full Screen
                      </Text>
                    </RNView>
                    <TouchableOpacity
                      style={styles.replaceImageButton}
                      onPress={pickImage}
                    >
                      <FontAwesome name="camera" size={16} color="white" />
                      <Text style={styles.replaceImageText}>Replace</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {isProcessing && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.loadingText}>
                        Applying AI modifications...
                      </Text>
                      <Text style={styles.loadingSubText}>
                        This may take a few moments
                      </Text>
                    </View>
                  )}

                  <View style={styles.promptSection}>
                    {promptSection}

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.applyButton,
                        isProcessing && styles.disabledButton,
                      ]}
                      onPress={applyCustomPrompt}
                      disabled={isProcessing}
                    >
                      <FontAwesome name="magic" size={20} color="white" />
                      <Text style={styles.buttonText}>Transform</Text>
                    </TouchableOpacity>

                    {processedImage && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.resetButton]}
                        onPress={resetImage}
                      >
                        <FontAwesome name="undo" size={20} color="white" />
                        <Text style={styles.buttonText}>Undo</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.clearButton]}
                      onPress={clearImage}
                    >
                      <FontAwesome name="trash" size={20} color="white" />
                      <Text style={styles.buttonText}>Clear</Text>
                    </TouchableOpacity>

                    {keyboardVisible && (
                      <TouchableOpacity
                        style={styles.dismissKeyboardButton}
                        onPress={dismissKeyboard}
                      >
                        <Text style={styles.dismissKeyboardText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </RNView>
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="image" size={80} color="gray" />
                  <Text style={styles.placeholderText}>No image selected</Text>
                  <Text style={styles.instructionText}>
                    Take a photo from the Camera tab or select one from your
                    gallery
                  </Text>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={pickImage}
                  >
                    <FontAwesome name="photo" size={24} color="white" />
                    <Text style={styles.galleryButtonText}>
                      Select from Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeErrorModal}
      >
        <RNView style={styles.modalOverlay}>
          <RNView style={styles.errorModal}>
            <RNView style={styles.errorIconContainer}>
              <FontAwesome
                name="exclamation-circle"
                size={40}
                color="#e74c3c"
              />
            </RNView>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={closeErrorModal}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </RNView>
        </RNView>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullScreenImage}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullScreenImage}
      >
        <StatusBar hidden />
        <RNView style={styles.fullScreenContainer}>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}

          <RNView style={styles.fullScreenControls}>
            <TouchableOpacity
              style={styles.fullScreenButton}
              onPress={closeFullScreenImage}
            >
              <FontAwesome name="close" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fullScreenButton,
                styles.saveButton,
                isSaving && styles.disabledButton,
              ]}
              onPress={saveImageToCameraRoll}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FontAwesome name="download" size={24} color="white" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </RNView>
        </RNView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#000",
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    marginBottom: 5,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  subHeaderText: {
    fontSize: 16,
    color: "#ccc",
    marginTop: 5,
  },
  contentContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: SCREEN_HEIGHT * 0.75,
    marginVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  viewFullScreenHint: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  viewFullScreenText: {
    color: "white",
    fontSize: 14,
    marginLeft: 5,
  },
  replaceImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  replaceImageText: {
    color: "white",
    fontSize: 14,
    marginLeft: 5,
  },
  smallerImage: {
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "white",
    marginTop: 15,
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingSubText: {
    color: "white",
    marginTop: 8,
    fontSize: 14,
    opacity: 0.8,
  },
  promptSection: {
    width: "100%",
    marginTop: 5,
    paddingHorizontal: 5,
  },
  inputContainer: {
    position: "relative",
    width: "100%",
  },
  customPromptInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#222",
    color: "#fff",
    minHeight: 60,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  smallerInput: {
    minHeight: 60,
  },
  clearInputButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  applyButton: {
    backgroundColor: "#8e44ad",
  },
  clearButton: {
    backgroundColor: "#e74c3c",
  },
  resetButton: {
    backgroundColor: "#f39c12",
  },
  dismissKeyboardButton: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#333",
    borderRadius: 8,
  },
  dismissKeyboardText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 15,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    color: "#fff",
  },
  instructionText: {
    fontSize: 16,
    color: "#ccc",
    marginTop: 15,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498db",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  galleryButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  // Error modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorModal: {
    width: "90%",
    backgroundColor: "#222",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(231, 76, 60, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 5,
  },
  errorButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  // Full screen image styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullScreenControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  fullScreenButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    flexDirection: "row",
    width: "auto",
    paddingHorizontal: 15,
    backgroundColor: "rgba(52, 152, 219, 0.8)",
  },
  saveButtonText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "600",
  },
});
