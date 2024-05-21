import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { WebSocketContext } from './WebSocketContext';
import { busLines } from './busLines';

const MapComponent = () => {
  const [location, setLocation] = useState(null);
  const [busStops, setBusStops] = useState([]);
  const [error, setError] = useState(null);
  const { socket, connectSocket, id, busLine } = useContext(WebSocketContext);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    connectSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connectSocket, socket]);

  useEffect(() => {
    getLocationPermission();
    fetchBusStops();
  }, []);

  useEffect(() => {
    if (socket && location) {
      socket.emit('updateLocation', {
        id,
        busLine,
        location,
      });
      setRegion((prevRegion) => ({
        ...prevRegion,
        latitude: location.latitude,
        longitude: location.longitude,
      }));
    }
  }, [location, socket, id, busLine]);

  const fetchBusStops = async () => {
    try {
      console.log('Fetching bus stops...');
      const response = await axios.get('http://localhost:5000/busstops');
      console.log('Bus stops fetched:', response.data);
      setBusStops(response.data);
    } catch (error) {
      console.error('Error fetching bus stops data:', error);
      setError('Error fetching bus stops data.');
    }
  };

  const getLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission denied. Please enable location services in your device settings.');
      return;
    }

    startLocationUpdates();
  };

  const startLocationUpdates = async () => {
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation },
      (locUpdate) => {
        setLocation({
          latitude: locUpdate.coords.latitude,
          longitude: locUpdate.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {error ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>{error}</Text>
      ) : location ? (
        <MapView
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          <Polyline
            coordinates={busLines[busLine] || []}
            strokeWidth={4}
            strokeColor="red"
          />
          <Marker coordinate={location} title="Your Location" />
          {busStops.map((stop) => (
            <Marker
              key={stop._id}
              coordinate={{
                latitude: stop.stop_lat,
                longitude: stop.stop_lon,
              }}
              title={stop.stop_name}
              description={`${stop.nom_commune}, ${stop.operatorname}`}
            />
          ))}
        </MapView>
      ) : (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      )}
    </View>
  );
};

export default MapComponent;
