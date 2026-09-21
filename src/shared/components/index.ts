import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  TextProps,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  style,
  ...props
}) => {
  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.primaryBtn,
    variant === 'secondary' && styles.secondaryBtn,
    variant === 'outline' && styles.outlineBtn,
    style,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'outline' && styles.outlineText,
  ];

  return (
    <TouchableOpacity style={buttonStyle} activeOpacity={0.8} {...props}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

export const Card: React.FC<React.PropsWithChildren<{ style?: object }>> = ({
  children,
  style,
}) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.secondary,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineText: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
