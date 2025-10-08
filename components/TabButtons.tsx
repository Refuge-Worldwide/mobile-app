import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TabTriggerSlotProps } from 'expo-router/ui';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TabButtonProps extends TabTriggerSlotProps {
  children: React.ReactNode;
}

export function TabButton({ children, isFocused, ...props }: TabButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      {...props}
      style={[
        styles.mainTab,
        {
          borderColor: isFocused ? colors.text : 'transparent',
          borderWidth: isFocused ? 2 : 1,
        }
      ]}
    >
      <Text
        style={[
          styles.mainTabText,
          {
            color: isFocused ? colors.text : colors.text + '80',
            fontWeight: isFocused ? '700' : '600',
          }
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: 'transparent',
  },
  secondaryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mainTabText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryTabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});