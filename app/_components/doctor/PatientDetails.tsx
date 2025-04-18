import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { FIREBASE_AUTH } from "@/FirebaseConfig";
import MedicalHistoryModal from "./MedicalHistoryModal";

type RootStackParamList = {
  DoctorDashboard: undefined;
  PatientDetails: { patientId: string };
};

type PatientDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  "PatientDetails"
>;
type NavigationProp = StackNavigationProp<RootStackParamList, "PatientDetails">;

const PatientDetails = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PatientDetailsScreenRouteProp>();
  const { patientId } = route.params;

  const [loading, setLoading] = useState(true);
  const [medicalHistoryModalVisible, setMedicalHistoryModalVisible] =
    useState(false);
  const [patient, setPatient] = useState<{
    id: string;
    name: string;
    email: string;
    age?: string;
    height?: string;
    weight?: string;
  } | null>(null);

  const [healthData, setHealthData] = useState({
    heartRate: "Loading...",
    bloodOxygen: "Loading...",
    motionState: "Loading...",
    lastUpdated: null,
  });
  // Message modal state
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchHealthData = () => {
      const currentUser = patientId;

      const db = getFirestore();
      const healthDataRef = doc(db, "healthData", patientId);

      const unsubscribe = onSnapshot(
        healthDataRef,
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setHealthData({
              heartRate: data.heartRate || "No data",
              bloodOxygen: data.bloodOxygen || "No data",
              motionState: data.motionState || "No data",
              lastUpdated: data.lastUpdated || null,
            });
            console.log("Health data updated:", data);
          }
        },
        (error) => {
          console.error("Error fetching health data:", error);
        }
      );

      return unsubscribe;
    };

    const fetchPatientDetail = async () => {
      try {
        // Add debugging logs
        fetchHealthData();
        console.log("Attempting to fetch details for patient ID:", patientId);
        if (!patientId) {
          throw new Error("Patient ID is undefined or empty");
        }

        const db = getFirestore();
        // Use the patientId directly as the document ID, since that seems to be the pattern in your logs
        const patientDocRef = doc(db, "users", patientId);
        console.log("Fetching document at path:", `users/${patientId}`);

        const patientDoc = await getDoc(patientDocRef);

        if (patientDoc.exists()) {
          const data = patientDoc.data();
          console.log("Patient data retrieved:", data);

          setPatient({
            id: patientDoc.id,
            name: data.name || "Unknown",
            email: data.email || "No email",
            age: data.age || "N/A",
            height: data.height || "Not specified",
            weight: data.weight || "Not specified",
          });
        } else {
          console.log("Patient document does not exist");
          Alert.alert("Error", "Patient not found");
          navigation.goBack();
        }
      } catch (error: any) {
        console.error("Error fetching patient details:", error);
        Alert.alert(
          "Error",
          `Failed to load patient details: ${error.message}`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatientDetail();
  }, [patientId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    if (!patient) {
      Alert.alert("Error", "Patient information is missing");
      return;
    }

    setSendingMessage(true);

    try {
      const db = getFirestore();
      const currentUser = FIREBASE_AUTH.currentUser;

      // Get the current doctor's email (assuming it's stored somewhere, possibly in auth)
      // For now, I'll use a placeholder - you should replace this with actual doctor info
      const doctorEmail = currentUser?.email; // Replace with actual authenticated doctor email

      // Add the message to a messages collection
      await addDoc(collection(db, "messages"), {
        from: doctorEmail,
        to: patient.id,
        content: messageText,
        timestamp: serverTimestamp(),
        read: false,
        fromType: "doctor",
        toType: "patient",
      });

      // Clear the message input and close the modal
      setMessageText("");
      setMessageModalVisible(false);

      Alert.alert("Success", `Message sent to ${patient.name}`);
    } catch (error: any) {
      console.error("Error sending message:", error);
      Alert.alert("Error", `Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const healthMetrics = [
    {
      id: 1,
      title: "Heart Rate",
      color: "#FF4B8C",
      data: healthData.heartRate,
      icon: "❤️",
    },
    {
      id: 2,
      title: "Blood oxygen",
      color: "#5677FC",
      data: healthData.bloodOxygen,
      icon: "O₂",
    },
    {
      id: 3,
      title: "Motion Status",
      color: "#4CAF50",
      data: healthData.motionState,
      icon: "🏃",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={styles.placeholderView} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0F6D66" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Patient Info Card */}
          <View style={styles.patientInfoCard}>
            <View style={styles.avatarContainer}>
              <FontAwesome name="user-circle" size={80} color="#0F6D66" />
            </View>
            <Text style={styles.patientName}>{patient?.name}</Text>
            <Text style={styles.patientEmail}>{patient?.email}</Text>

            <View style={styles.divider} />

            <View style={styles.patientDetailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>{patient?.age}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Weight</Text>
                <Text style={styles.detailValue}>{patient?.weight}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Height</Text>
                <Text style={styles.detailValue}>{patient?.height}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>
                  {healthData.lastUpdated || "Never"}
                </Text>
              </View>
            </View>
          </View>

          {/* Health Metrics Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Health Metrics</Text>

            {healthMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      { borderColor: metric.color },
                    ]}
                  >
                    <Text
                      style={[styles.metricIconText, { color: metric.color }]}
                    >
                      {metric.icon}
                    </Text>
                  </View>
                  <Text style={[styles.metricTitle, { color: metric.color }]}>
                    {metric.title}
                  </Text>
                </View>
                <View style={styles.metricDataContainer}>
                  <Text style={[styles.metricData, { color: metric.color }]}>
                    {metric.data}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setMessageModalVisible(true)}
            >
              <FontAwesome
                name="comment"
                size={20}
                color="#FFFFFF"
                style={styles.actionIcon}
              />
              <Text style={styles.actionButtonText}>Message Patient</Text>
            </TouchableOpacity>

            <MedicalHistoryModal
              isVisible={medicalHistoryModalVisible}
              onClose={() => setMedicalHistoryModalVisible(false)}
              patientEmail={patient?.email || ""}
            />
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => setMedicalHistoryModalVisible(true)}
            >
              <FontAwesome
                name="file-text-o"
                size={20}
                color="#0F6D66"
                style={styles.actionIcon}
              />
              <Text style={styles.secondaryButtonText}>
                View Medical History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes Section - Placeholder */}
          <View style={styles.notesContainer}>
            <Text style={styles.sectionTitle}>Doctor's Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesPlaceholder}>
                No notes have been added yet. Add notes during or after patient
                consultation.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Message Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={messageModalVisible}
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message to {patient?.name}</Text>
              <TouchableOpacity
                onPress={() => setMessageModalVisible(false)}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome
                    name="paper-plane"
                    size={18}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#0F6D66",
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  placeholderView: {
    width: 30,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  patientInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    margin: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  patientName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333333",
  },
  patientEmail: {
    fontSize: 16,
    color: "#777777",
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    width: "100%",
    marginVertical: 15,
  },
  patientDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  detailItem: {
    width: "48%",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#888888",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333333",
    marginTop: 3,
  },
  sectionContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 15,
  },
  metricCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  metricIconText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  metricDataContainer: {
    alignItems: "flex-end",
  },
  metricData: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionButtonsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: "#0F6D66",
    borderRadius: 8,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0F6D66",
  },
  actionIcon: {
    marginRight: 10,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButtonText: {
    color: "#0F6D66",
    fontSize: 16,
    fontWeight: "bold",
  },
  notesContainer: {
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  notesCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
  },
  notesPlaceholder: {
    color: "#999999",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  // Message Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  closeButton: {
    padding: 5,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#0F6D66",
    borderRadius: 8,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  sendIcon: {
    marginRight: 10,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PatientDetails;
