import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import BleManager from 'react-native-ble-manager';

interface BluetoothDevice {
  id: string;
  name?: string;
}

const App = () => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);

  useEffect(() => {
    // Start BLE Manager
    BleManager.start({showAlert: false});

    const eventEmitter = new NativeEventEmitter(NativeModules.BleManager);

    const handleDiscoverPeripheral = (device: BluetoothDevice) => {
      console.log('Discovered device:', device);
      setDevices(prevDevices => {
        if (!prevDevices.some(d => d.id === device.id)) {
          return [...prevDevices, device];
        }
        return prevDevices;
      });
    };

    const discoverPeripheralListener = eventEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral,
    );

    return () => {
      discoverPeripheralListener.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      if (
        granted['android.permission.BLUETOOTH_SCAN'] !== 'granted' ||
        granted['android.permission.BLUETOOTH_CONNECT'] !== 'granted' ||
        granted['android.permission.ACCESS_FINE_LOCATION'] !== 'granted'
      ) {
        console.error('Bluetooth permissions not granted');
        Alert.alert('Error', 'Bluetooth permissions are required.');
      }
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const startScan = () => {
    if (scanning) return;

    setDevices([]);
    setScanning(true);

    BleManager.scan([], 10, true)
      .then(() => {
        console.log('Scanning started...');
      })
      .catch(error => {
        console.error('Scan failed:', error);
        setScanning(false);
      });

    setTimeout(() => {
      setScanning(false);
    }, 10000);
  };

  const handleConnect = (id: string) => {
    BleManager.connect(id)
      .then(() => {
        Alert.alert('Success', `Connected to device: ${id}`);
        console.log(`Connected to device: ${id}`);
      })
      .catch(error => {
        Alert.alert('Error', `Could not connect to device: ${id}`);
        console.error(error);
      });
  };

  const renderItem = ({item}: {item: BluetoothDevice}) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleConnect(item.id)}>
      <Text style={styles.deviceName}>{item.name || 'Unnamed Device'}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Device Scanner</Text>
      <Button
        title={scanning ? 'Scanning...' : 'Start Scan'}
        onPress={startScan}
        disabled={scanning}
      />
      <FlatList<BluetoothDevice>
        data={devices}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={() => (
          <Text style={styles.emptyList}>
            {scanning ? 'Scanning for devices...' : 'No devices found.'}
          </Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deviceItem: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 14,
    color: '#888',
  },
  emptyList: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#aaa',
  },
});

export default App;
