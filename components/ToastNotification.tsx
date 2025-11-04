import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { View } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

export function ToastNotification() {
  const colorScheme = useColorScheme();
  const textColor = Colors[colorScheme ?? 'light'].text;
  const backgroundColor = Colors[colorScheme ?? 'light'].background;

  // Custom toast configuration with dynamic theme colors
  const toastConfig: ToastConfig = {
    success: (props) => (
      <View style={{ zIndex: 9999 }}>
        <BaseToast
          {...props}
          style={{
            borderWidth: 1,
            borderLeftColor: textColor,
            borderLeftWidth: 1,
            borderColor: textColor,
            backgroundColor: backgroundColor,
            height: 60,
            paddingHorizontal: 12,
            zIndex: 9999,
            borderRadius: 0,
          }}
          contentContainerStyle={{
            paddingHorizontal: 12,
          }}
          text1Style={{
            fontSize: 15,
            fontWeight: '600',
            color: textColor,
            fontFamily: 'VisueltMedium',
          }}
          text2Style={{
            fontSize: 13,
            color: textColor,
            fontFamily: 'VisueltMedium',
          }}
          text2NumberOfLines={1}
        />
      </View>
    ),
    error: (props) => (
      <View style={{ zIndex: 9999 }}>
        <ErrorToast
          {...props}
          style={{
            borderWidth: 1,
            borderColor: textColor,
            backgroundColor: backgroundColor,
            height: 60,
            paddingHorizontal: 12,
            zIndex: 9999,
            borderRadius: 0,
          }}
          contentContainerStyle={{
            paddingHorizontal: 12,
          }}
          text1Style={{
            fontSize: 15,
            fontWeight: '600',
            color: textColor,
            fontFamily: 'VisueltMedium',
          }}
          text2Style={{
            fontSize: 13,
            color: textColor,
            fontFamily: 'VisueltMedium',
          }}
          text2NumberOfLines={1}
        />
      </View>
    ),
  };

  return (
    <Toast
      config={toastConfig}
      bottomOffset={130}
      animationType="fade"
    />
  );
}
