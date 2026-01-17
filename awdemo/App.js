import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import * as Linking from 'expo-linking';

export default function App() {
  const [status, setStatus] = useState('Ready to verify');

  useEffect(() => {
    const handleUrl = async (event) => {
      const url = event.url;
      console.log('Received URL:', url);
      
      let session = null;
      if (url.includes('session=')) {
        session = url.split('session=')[1].split('&')[0];
      } else if (url.includes('/v.php?s=')) {
        session = url.split('s=')[1].split('&')[0];
      }
      
      if (session) {
        setStatus('Claiming session: ' + session);
        
        try {
          const claimUrl = 'https://jzm.qah.mybluehost.me/website_10f009d1/claim.php?s=' + session;
          console.log('Claiming at:', claimUrl);
          
          const response = await fetch(claimUrl);
          const data = await response.json();
          
          console.log('Response:', data);
          
          if (data.ok === true) {
            setStatus('✓ Verified!');
            Alert.alert('Success', 'Session claimed: ' + session);
          } else {
            setStatus('Failed: ' + (data.error || 'Unknown error'));
            Alert.alert('Claim Failed', data.error || 'Unknown error');
          }
        } catch (error) {
          console.error('Fetch error:', error);
          setStatus('Error: ' + error.message);
          Alert.alert('Network Error', 'URL: https://jzm.qah.mybluehost.me/website_10f009d1/claim.php?s=' + session + '\n\nError: ' + error.message);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    
    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AW Demo</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 18,
    color: '#666',
  },
});