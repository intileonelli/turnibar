import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from './colors';

interface TextFieldProps extends TextInputProps {
  label: string;
}

export function TextField({ label, style, secureTextEntry, ...rest }: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPasswordField = secureTextEntry === true;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, isPasswordField && styles.inputWithToggle, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPasswordField && !visible}
          {...rest}
        />
        {isPasswordField && (
          <Pressable style={styles.toggleButton} onPress={() => setVisible((v) => !v)}>
            <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
              {visible ? 'Nascondi' : 'Mostra'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputRow: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithToggle: {
    paddingRight: 72,
  },
  toggleButton: {
    position: 'absolute',
    right: 10,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
