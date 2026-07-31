import { Image, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/theme';

type Props = {
  uri: string | null;
  handle: string;
  size: number;
  color?: string;
};

export function Avatar({ uri, handle, size, color = Colors.accent }: Props) {
  const radius = size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: color },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>
        {handle.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#ffffff', fontWeight: '700' },
});
