import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure your server URL here
const DEFAULT_SERVER_URL = 'https://dev.agewallet.io';

export default function App() {
  const [status, setStatus] = useState('Ready to verify');
  const [mode, setMode] = useState('ios'); // 'ios' or 'android'
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [showSettings, setShowSettings] = useState(false);

  // Check for pending claim on first launch (iOS IP matching flow)
  const checkPendingClaim = async () => {
    try {
      setStatus('Checking for pending claim...');
      const response = await fetch(`${serverUrl}/pending-claim/check`);
      const data = await response.json();

      console.log('Pending claim check:', data);

      if (data.found && data.session_token) {
        setStatus('Found pending session: ' + data.session_token);
        await claimSession(data.session_token);
      } else {
        setStatus('No pending claim found for this IP');
      }
    } catch (error) {
      console.error('Pending claim check error:', error);
      setStatus('Error checking pending claim: ' + error.message);
    }
  };

  // Claim a session
  const claimSession = async (sessionToken) => {
    try {
      setStatus('Claiming session: ' + sessionToken);

      const claimUrl = `${serverUrl}/session/${sessionToken}/claim`;
      console.log('Claiming at:', claimUrl);

      const response = await fetch(claimUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'demo-user-token-' + Date.now(), // Simulated user token
          device_id: 'demo-device-001',
          app_version: '1.0.0-demo',
        }),
      });

      const data = await response.json();
      console.log('Claim response:', data);

      if (data.status === 'claimed') {
        setStatus('Claimed! Verified: ' + (data.user_verified ? 'Yes' : 'No'));
        Alert.alert('Success', 'Session claimed successfully!\n\nVerified: ' + (data.user_verified ? 'Yes' : 'No'));
      } else if (data.error) {
        setStatus('Failed: ' + data.error);
        Alert.alert('Claim Failed', data.error);
      } else {
        setStatus('Unexpected response');
        Alert.alert('Unexpected Response', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Claim error:', error);
      setStatus('Error: ' + error.message);
      Alert.alert('Network Error', error.message);
    }
  };

  // Handle deep links (when app is opened via URL)
  useEffect(() => {
    const handleUrl = async (event) => {
      const url = event.url;
      console.log('Received URL:', url);

      // Parse session token from various URL formats
      let session = null;
      if (url.includes('session/') && url.includes('/claim')) {
        // Format: /session/{token}/claim
        const match = url.match(/session\/([^/]+)\/claim/);
        if (match) session = match[1];
      } else if (url.includes('session=')) {
        session = url.split('session=')[1].split('&')[0];
      } else if (url.includes('/v.php?s=')) {
        session = url.split('s=')[1].split('&')[0];
      }

      if (session) {
        await claimSession(session);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Check initial URL (cold start via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => subscription.remove();
  }, [serverUrl]);

  // Load saved settings
  useEffect(() => {
    AsyncStorage.getItem('serverUrl').then(url => {
      if (url) setServerUrl(url);
    });
    AsyncStorage.getItem('mode').then(m => {
      if (m) setMode(m);
    });
  }, []);

  // Save settings
  const saveSettings = async () => {
    await AsyncStorage.setItem('serverUrl', serverUrl);
    await AsyncStorage.setItem('mode', mode);
    setShowSettings(false);
    Alert.alert('Saved', 'Settings saved successfully');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AW Demo</Text>
      <Text style={styles.subtitle}>Deep Link Testing</Text>

      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>Mode: {mode.toUpperCase()}</Text>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'ios' && styles.modeButtonActive]}
          onPress={() => setMode('ios')}
        >
          <Text style={styles.modeButtonText}>iOS (IP Match)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'android' && styles.modeButtonActive]}
          onPress={() => setMode('android')}
        >
          <Text style={styles.modeButtonText}>Android (Referrer)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.status}>{status}</Text>

      <TouchableOpacity style={styles.button} onPress={checkPendingClaim}>
        <Text style={styles.buttonText}>Check Pending Claim</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.settingsButton]}
        onPress={() => setShowSettings(!showSettings)}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      {showSettings && (
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsLabel}>Server URL:</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://your-ngrok-url.ngrok.io"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.button} onPress={saveSettings}>
            <Text style={styles.buttonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.hint}>
        {mode === 'ios'
          ? 'iOS mode: Tap "Check Pending Claim" to find session via IP matching'
          : 'Android mode: Session token comes from Install Referrer (requires Play Store install)'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  modeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  modeLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ddd',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  status: {
    fontSize: 18,
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    minWidth: 200,
    alignItems: 'center',
  },
  settingsButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  settingsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  hint: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
