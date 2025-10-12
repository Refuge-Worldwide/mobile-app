import { useThemeColor } from '@/hooks/useThemeColor';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, ReactNode, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  children: ReactNode;
  snapPoints?: (string | number)[];
  onDismiss?: () => void;
}

export const BottomSheet = forwardRef<BottomSheetModal, BottomSheetProps>(
  ({ children, snapPoints = ['70%', '90%'], onDismiss }, ref) => {
    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const insets = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.8}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor }}
        handleIndicatorStyle={{ backgroundColor: textColor }}
        keyboardBehavior="interactive"
        android_keyboardInputMode="adjustResize"
        onDismiss={onDismiss}
        enableDynamicSizing={false}
      >
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
      </BottomSheetModal>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
});
