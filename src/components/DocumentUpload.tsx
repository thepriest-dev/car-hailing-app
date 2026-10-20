import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { ref, update } from 'firebase/database';
import { auth, db, storage } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';

interface Document {
  id: string;
  name: string;
  type: string;
  uri: string | null;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onDocumentUpdate: (documents: Document[]) => void;
  readOnly?: boolean;
}

export default function DocumentUpload({ documents, onDocumentUpdate, readOnly = false }: DocumentUploadProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState<string | null>(null);

  const documentTypes = [
    { id: 'license', name: "Driver's License", icon: '🚗', required: true },
    { id: 'vehicle_registration', name: 'Vehicle Registration', icon: '📄', required: true },
    { id: 'insurance', name: 'Insurance Certificate', icon: '🛡️', required: true },
    { id: 'profile_photo', name: 'Profile Photo', icon: '📸', required: true },
    { id: 'background_check', name: 'Background Check', icon: '🔍', required: false },
    { id: 'road_worthiness', name: 'Road Worthiness', icon: '✅', required: true },
  ];

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return '✅';
      case 'rejected': return '❌';
      default: return '⏳';
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const pickDocument = async (docType: typeof documentTypes[0]) => {
    if (readOnly) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadDocument(result.assets[0].uri, docType);
    }
  };

  const takePhoto = async (docType: typeof documentTypes[0]) => {
    if (readOnly) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to use camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadDocument(result.assets[0].uri, docType);
    }
  };

  const uploadDocument = async (uri: string, docType: typeof documentTypes[0]) => {
    setUploading(docType.id);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      
      const imageRef = storageRef(storage, `driver_documents/${currentUser.uid}/${docType.id}.jpg`);
      
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      
      // Find existing document
      const existingDoc = documents.find(d => d.id === docType.id);
      
      let updatedDocuments: Document[];
      
      if (existingDoc) {
        // Update existing document
        updatedDocuments = documents.map(doc =>
          doc.id === docType.id
            ? {
                ...doc,
                uri: downloadURL,
                status: 'pending' as const,
                uploadedAt: new Date().toISOString(),
              }
            : doc
        );
      } else {
        // Add new document
        const newDocument: Document = {
          id: docType.id,
          name: docType.name,
          type: docType.id,
          uri: downloadURL,
          status: 'pending',
          uploadedAt: new Date().toISOString(),
        };
        updatedDocuments = [...documents, newDocument];
      }
      
      onDocumentUpdate(updatedDocuments);
      
      // Save to Firebase Database
      const userRef = ref(db, `users/${currentUser.uid}/documents/${docType.id}`);
      await update(userRef, {
        uri: downloadURL,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        documentType: docType.id,
      });
      
      Alert.alert('Success', `${docType.name} uploaded successfully! It will be reviewed by our team.`);
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const showImageOptions = (docType: typeof documentTypes[0]) => {
    if (readOnly) return;
    
    Alert.alert(
      `Upload ${docType.name}`,
      'Choose an option',
      [
        { text: 'Take Photo', onPress: () => takePhoto(docType) },
        { text: 'Choose from Gallery', onPress: () => pickDocument(docType) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getDocumentStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected - Please re-upload';
      default: return 'Pending Review';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Required Documents</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        Please upload clear photos of the following documents for verification
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {documentTypes.map((docType) => {
          const document = documents.find(d => d.id === docType.id);
          const isUploaded = !!document?.uri;
          const status = document?.status || 'pending';
          
          return (
            <TouchableOpacity
              key={docType.id}
              style={[
                styles.documentCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isUploaded && status === 'verified' && { borderColor: '#10B981', borderWidth: 2 },
                isUploaded && status === 'rejected' && { borderColor: '#EF4444', borderWidth: 2 },
              ]}
              onPress={() => showImageOptions(docType)}
              disabled={readOnly}
            >
              <View style={styles.documentIconContainer}>
                <Text style={styles.documentIcon}>{docType.icon}</Text>
              </View>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, { color: colors.text }]}>
                  {docType.name}
                  {docType.required && <Text style={styles.requiredStar}> *</Text>}
                </Text>
                {isUploaded ? (
                  <View style={styles.statusContainer}>
                    <Text style={[styles.statusText, { color: getDocumentStatusColor(status) }]}>
                      {getDocumentStatusIcon(status)} {getDocumentStatusText(status)}
                    </Text>
                    {status === 'rejected' && (
                      <Text style={[styles.reuploadText, { color: colors.primary }]}>
                        Tap to re-upload
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>
                    Tap to upload {docType.name}
                  </Text>
                )}
              </View>
              {uploading === docType.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isUploaded ? (
                <Text style={styles.checkIcon}>✓</Text>
              ) : (
                <Text style={styles.uploadIcon}>📎</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!readOnly && (
        <View style={[styles.infoBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning }]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.warning }]}>Document Requirements:</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Clear, well-lit photos{'\n'}
              • All corners visible{'\n'}
              • No blurriness or glare{'\n'}
              • Valid and up-to-date documents{'\n'}
              • File size should be less than 5MB
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentIcon: {
    fontSize: 24,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#EF4444',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reuploadText: {
    fontSize: 11,
    fontWeight: '500',
  },
  uploadHint: {
    fontSize: 12,
  },
  checkIcon: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '700',
  },
  uploadIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 20,
  },
});