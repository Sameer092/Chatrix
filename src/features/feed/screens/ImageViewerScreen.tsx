import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { RootRouteProp } from '../../../types/navigation.types';

const { width, height } = Dimensions.get('window');

export default function ImageViewerScreen() {
  const route = useRoute<RootRouteProp<'ImageViewer'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { uri, uris, index = 0 } = route.params;
  const images = uris && uris.length > 0 ? uris : [uri];

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item, i) => `${item}_${i}`}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <Image source={{ uri: item }} style={styles.image} contentFit="contain" />
          </View>
        )}
      />
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  page: { width, height, alignItems: 'center', justifyContent: 'center' },
  image: { width, height: height * 0.8 },
  closeBtn: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
