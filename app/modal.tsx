import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Text, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { reportPoiIssue } from '@/services/osm';
import { useAuth } from '@/hooks/use-auth';

export default function ReportIssueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { poiId, poiName } = params;
  const { accessToken } = useAuth();
  
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('wrong_location');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken) {
        Alert.alert('Authentication Required', 'Please login to report issues.');
        return;
    }
    if (!description.trim()) {
        Alert.alert('Missing Info', 'Please describe the issue.');
        return;
    }

    setLoading(true);
    try {
        await reportPoiIssue(poiId as string, { 
            description: description.trim(), 
            type: issueType 
        });
        Alert.alert('Report Sent', 'Thank you for improving the map!', [
            { text: 'OK', onPress: () => router.back() }
        ]);
    } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to send report.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>REPORT ISSUE</Text>
        <Text style={styles.subtitle}>Target: {poiName || 'Unknown POI'} (ID: {poiId})</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>ISSUE TYPE</Text>
        <View style={styles.typeRow}>
            {['wrong_location', 'closed', 'duplicate', 'other'].map((type) => (
                <TouchableOpacity 
                    key={type}
                    style={[styles.typeBadge, issueType === type && styles.activeBadge]}
                    onPress={() => setIssueType(type)}
                >
                    <Text style={[styles.typeText, issueType === type && styles.activeTypeText]}>
                        {type.replace('_', ' ').toUpperCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
            style={styles.input}
            multiline
            placeholder="Details (e.g., entrance is on the other side...)"
            placeholderTextColor="#555"
            value={description}
            onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
                <ActivityIndicator color="black" />
            ) : (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="warning-outline" size={18} color="black" style={{marginRight: 8}} />
                    <Text style={styles.submitText}>TRANSMIT REPORT</Text>
                </View>
            )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
             <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: Colors.cyberpunk.neonOrange,
    paddingLeft: 15,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#888',
    marginTop: 5,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  form: {
    gap: 20,
  },
  label: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  typeBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
  },
  activeBadge: {
    backgroundColor: Colors.cyberpunk.neonOrange,
    borderColor: Colors.cyberpunk.neonOrange,
  },
  typeText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeTypeText: {
    color: 'black',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    color: 'white',
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  submitBtn: {
    backgroundColor: Colors.cyberpunk.neonGreen,
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: {
    color: 'black',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#666',
    fontSize: 12,
    letterSpacing: 1,
  },
});
