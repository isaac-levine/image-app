import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  View as RNView,
} from "react-native";
import { Text, View } from "@/components/Themed";
import { Camera } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router, useFocusEffect } from "expo-router";
import CameraView from "@/components/CameraView";

// Define camera types as constants
const CAMERA_BACK = 0;
const CAMERA_FRONT = 1;

export default function CameraScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const [key, setKey] = useState(0); // Key to force remount of camera component

  useEffect(() => {
    (async () => {
      // Request media library permissions
      const { status: mediaStatus } =
        await MediaLibrary.requestPermissionsAsync();
      setHasPermission(mediaStatus === "granted");
    })();
  }, []);

  // When the tab is focused, if there's no captured image, relaunch the camera
  useFocusEffect(
    useCallback(() => {
      if (!capturedImage) {
        // Force camera component to remount
        setKey((prevKey) => prevKey + 1);
      }

      return () => {
        // Cleanup function if needed
      };
    }, [capturedImage])
  );

  // Handle when an image is captured
  const handleImageCaptured = (uri: string) => {
    setCapturedImage(uri);
  };

  // Navigate to editor with the captured image
  const goToEditor = async () => {
    if (capturedImage) {
      try {
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(capturedImage);

        // Navigate to the editor tab with the image URI as a parameter
        // Add a timestamp to ensure the route is considered new even if the URI is the same
        router.navigate({
          pathname: "/(tabs)/editor",
          params: {
            imageUri: capturedImage,
            timestamp: Date.now().toString(), // Add timestamp to make each navigation unique
          },
        });

        // Clear the captured image so when user returns to camera tab, it will launch camera again
        setCapturedImage(null);
      } catch (error) {
        console.error("Error saving image:", error);
        Alert.alert("Error", "Failed to save image");
      }
    }
  };

  // Retake picture by clearing the captured image and relaunching camera
  const retakePicture = () => {
    setCapturedImage(null);
    // Force camera component to remount
    setKey((prevKey) => prevKey + 1);
  };

  // Toggle between front and back camera
  const toggleCamera = () => {
    setCapturedImage(null);
    setIsFrontCamera(!isFrontCamera);
    // Force camera component to remount
    setKey((prevKey) => prevKey + 1);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No access to media library</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Use key to force remount of camera component */}
      <CameraView
        key={key}
        ref={cameraRef}
        style={styles.camera}
        type={isFrontCamera ? CAMERA_FRONT : CAMERA_BACK}
        onCaptureComplete={handleImageCaptured}
      />

      {/* Camera controls overlay */}
      {!capturedImage ? (
        <RNView style={styles.cameraControls}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCamera}>
            <FontAwesome name="refresh" size={24} color="white" />
            <Text style={styles.smallButtonText}>Flip</Text>
          </TouchableOpacity>
        </RNView>
      ) : (
        <RNView style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={retakePicture}>
            <FontAwesome name="refresh" size={24} color="white" />
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.usePhotoButton]}
            onPress={goToEditor}
          >
            <FontAwesome name="check" size={24} color="white" />
            <Text style={styles.buttonText}>Use Photo</Text>
          </TouchableOpacity>
        </RNView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  flipButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
  },
  actionButtons: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: 120,
  },
  usePhotoButton: {
    backgroundColor: "rgba(46, 204, 113, 0.8)",
  },
  buttonText: {
    color: "white",
    marginTop: 5,
    fontSize: 16,
  },
  smallButtonText: {
    color: "white",
    marginTop: 5,
    fontSize: 12,
  },
});
