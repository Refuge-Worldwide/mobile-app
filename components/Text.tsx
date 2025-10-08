import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

// Override the default Text component to use VisueltMedium font
export function Text(props: TextProps) {
  return (
    <RNText
      {...props}
      style={[
        { fontFamily: 'VisueltMedium' },
        props.style,
      ]}
    />
  );
}

// Re-export for easy importing
export default Text;