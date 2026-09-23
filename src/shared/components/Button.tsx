import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableOpacityProps,
} from 'react-native';
import { useAppTheme } from '../hooks';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  style,
  ...props
}) => {
  const { themeColors } = useAppTheme();

  const buttonStyle = [
    styles.button,
    variant === 'primary' && { backgroundColor: themeColors.primary },
    variant === 'secondary' && { backgroundColor: themeColors.secondary },
    variant === 'outline' && {
      borderWidth: 1,
      borderColor: themeColors.primary,
      backgroundColor: 'transparent',
    },
    style,
  ];

  const textStyle = [
    styles.buttonText,
    variant === 'outline' && { color: themeColors.primary },
  ];

  return (
    <TouchableOpacity style={buttonStyle} activeOpacity={0.8} {...props}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default Button;
