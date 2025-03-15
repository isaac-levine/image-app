import React, { forwardRef, useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

// Define the props for our camera component
interface CameraViewProps {
  style?: any;
  type?: number; // 0 for back, 1 for front
  children?: React.ReactNode;
  onCaptureComplete?: (uri: string) => void;
}

// Create a camera component that immediately launches the native camera
const CameraView = forwardRef<any, CameraViewProps>((props, ref) => {
  const { style, type = 0, children, onCaptureComplete } = props;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const router = useRouter();

  // Determine if front or back camera
  const isFrontCamera = type === 1;

  // Launch the camera directly
  const launchCamera = async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    try {
      // Use ImagePicker to launch the camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        // Important: Set both of these to true to bypass the confirmation screen
        allowsEditing: false,
        exif: false,
      });

      setIsCapturing(false);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;

        // Navigate directly to editor with the image URI
        if (onCaptureComplete) {
          onCaptureComplete(uri);
        }

        router.push({
          pathname: "/editor",
          params: { imageUri: uri },
        });

        return { uri };
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      setIsCapturing(false);

      // Fall back to a placeholder if camera fails
      const photoUri = isFrontCamera
        ? "https://picsum.photos/seed/selfie/500/800"
        : "https://picsum.photos/seed/landscape/500/800";

      // Navigate to editor with the placeholder image
      if (onCaptureComplete) {
        onCaptureComplete(photoUri);
      }

      router.push({
        pathname: "/editor",
        params: { imageUri: photoUri },
      });

      return { uri: photoUri };
    }
  };

  // Request camera permissions on mount
  useEffect(() => {
    let isMounted = true;

    const requestPermissionAndLaunchCamera = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (!isMounted) return;

        setHasPermission(status === "granted");
      } catch (err) {
        console.error("Error requesting camera permission:", err);
        if (isMounted) {
          setHasPermission(false);
        }
      }
    };

    requestPermissionAndLaunchCamera();

    return () => {
      isMounted = false;
    };
  }, []);

  // Expose methods through the ref
  React.useImperativeHandle(ref, () => ({
    takePictureAsync: async (options = {}) => {
      const result = await launchCamera();
      return result;
    },
  }));

  // Permission not determined yet
  if (hasPermission === null) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Requesting camera permission...
          </Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.permissionContainer}>
          <FontAwesome name="camera" size={50} color="#fff" />
          <Text style={styles.permissionText}>No access to camera</Text>
          <Text style={styles.permissionSubText}>
            Please enable camera permissions in your device settings
          </Text>
        </View>
      </View>
    );
  }

  // Show loading state with a button to launch camera
  return (
    <View style={[styles.container, style]}>
      <View style={styles.cameraView}>
        <View style={styles.loadingContainer}>
          <FontAwesome name="camera" size={40} color="#fff" />
          <Text style={styles.loadingText}>
            {isCapturing ? "Opening camera..." : "Camera ready"}
          </Text>

          {/* Add a button to launch the camera if not currently capturing */}
          {!isCapturing && (
            <TouchableOpacity
              style={styles.launchButton}
              onPress={launchCamera}
            >
              <FontAwesome name="camera" size={24} color="white" />
              <Text style={styles.launchButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraView: {
    flex: 1,
    backgroundColor: "#222",
    position: "relative",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  permissionSubText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  launchButton: {
    backgroundColor: "rgba(52, 152, 219, 0.8)",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  launchButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginLeft: 10,
  },
});

export default CameraView;
