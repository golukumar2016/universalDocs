import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../theme';

export interface CardProps extends ViewProps {
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default Card;
