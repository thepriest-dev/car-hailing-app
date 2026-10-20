import { router } from 'expo-router';
import { ref, get, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../components/Logo';
import DocumentUpload from '../components/DocumentUpload';

interface Document {
  id: string;
  name: string;
  type: string;
  uri: string | null;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt?: string;
}

export default function DriverDocumentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    try {
      const userRef = ref(db, `users/${currentUser.uid}/documents`);
      const snapshot = await get(userRef);
      
      const loadedDocuments: Document[] = [];
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.keys(data).forEach((key) => {
          loadedDocuments.push({
            id: key,
            name: getDocumentName(key),
            type: key,
            uri: data[key].uri,
            status: data[key].status || 'pending',
            uploadedAt: data[key].uploadedAt,
          });
        });
      }
      
      // Check overall verification status
      const userStatusRef = ref(db, `users/${currentUser.uid}/documentVerificationStatus`);
      const statusSnapshot = await get(userStatusRef);
      if (statusSnapshot.exists()) {
        setVerificationStatus(statusSnapshot.val());
      }
      
      setDocuments(loadedDocuments);
    } catch (error) {
      console.log('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentName = (type: string): string => {
    const names: Record<string, string> = {
      license: "Driver's License",
      vehicle_registration: 'Vehicle Registration',
      insurance: 'Insurance Certificate',
      profile_photo: 'Profile Photo',
      background_check: 'Background Check',
      road_worthiness: 'Road Worthiness',
    };
    return names[type] || type;
  };

  const handleDocumentUpdate = async (updatedDocuments: Document[]) => {
    setDocuments(updatedDocuments);
    
    // Check if all required documents are uploaded
    const requiredDocs = ['license', 'vehicle_registration', 'insurance', 'profile_photo', 'road_worthiness'];
    const requiredUploaded = requiredDocs.every(docId => 
      updatedDocuments.find(d => d.id === docId && d.uri)
    );
    
    if (requiredUploaded) {
      setVerificationStatus('pending');
      Alert.alert(
        'Documents Complete',
        'All required documents have been uploaded. Our team will review them within 1-2 business days.'
      );
    }
  };

  const submitForVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const requiredDocs = ['license', 'vehicle_registration', 'insurance', 'profile_photo', 'road_worthiness'];
    const missingDocs = requiredDocs.filter(docId => !documents.find(d => d.id === docId && d.uri));
    
    if (missingDocs.length > 0) {
      Alert.alert('Missing Documents', `Please upload all required documents before submitting. Missing: ${missingDocs.length} document(s)`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      await update(userRef, {
        documentVerificationStatus: 'pending',
        documentsSubmittedAt: new Date().toISOString(),
      });
      
      setVerificationStatus('pending');
      
      Alert.alert(
        'Documents Submitted',
        'Your documents have been submitted for verification. You will be notified once verified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.log('Error submitting documents:', error);
      Alert.alert('Error', 'Failed to submit documents. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationStatusColor = () => {
    switch (verificationStatus) {
      case 'verified': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  const getVerificationStatusText = () => {
    switch (verificationStatus) {
      case 'verified': return '✅ Verified - You can now accept rides!';
      case 'rejected': return '❌ Verification Failed - Please check your documents';
      default: return '⏳ Pending Verification - Our team is reviewing your documents';
    }
  };

  const getUploadProgress = () => {
    const requiredDocs = ['license', 'vehicle_registration', 'insurance', 'profile_photo', 'road_worthiness'];
    const uploaded = requiredDocs.filter(docId => documents.find(d => d.id === docId && d.uri)).length;
    return (uploaded / requiredDocs.length) * 100;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" backgroundColor="#0A1929" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" backgroundColor="#0A1929" />
      
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Logo size="small" showText={true} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* Verification Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: getVerificationStatusColor() }]}>
          <Text style={[styles.statusText, { color: getVerificationStatusColor() }]}>
            {getVerificationStatusText()}
          </Text>
          {verificationStatus === 'pending' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${getUploadProgress()}%`, backgroundColor: colors.primary }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {Math.round(getUploadProgress())}% Complete
              </Text>
            </View>
          )}
        </View>

        {/* Document Upload Component */}
        <DocumentUpload
          documents={documents}
          onDocumentUpdate={handleDocumentUpdate}
          readOnly={verificationStatus === 'verified'}
        />

        {/* Submit Button */}
        {verificationStatus !== 'verified' && (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={submitForVerification}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Submit for Verification
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Verified Info */}
        {verificationStatus === 'verified' && (
          <View style={[styles.verifiedInfo, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
            <Text style={styles.verifiedIcon}>🎉</Text>
            <Text style={[styles.verifiedTitle, { color: colors.success }]}>Congratulations!</Text>
            <Text style={[styles.verifiedText, { color: colors.textSecondary }]}>
              Your documents have been verified. You can now go online and accept ride requests!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, fontWeight: '600' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedInfo: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
  },
  verifiedIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  verifiedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});