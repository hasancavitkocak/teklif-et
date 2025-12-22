import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onKeyboardShow?: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, onKeyboardShow, disabled = false }: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const keyboardDidShow = () => {
      onKeyboardShow?.();
    };

    const subscription = Keyboard.addListener('keyboardDidShow', keyboardDidShow);
    return () => subscription?.remove();
  }, [onKeyboardShow]);

  const handleSend = () => {
    if (!messageText.trim() || disabled) return;
    
    onSendMessage(messageText.trim());
    setMessageText('');
  };

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Mesaj..."
          placeholderTextColor="#8E8E93"
          value={messageText}
          onChangeText={setMessageText}
          onFocus={() => {
            // Klavye açıldığında callback'i çağır
            setTimeout(() => {
              onKeyboardShow?.();
            }, 300);
          }}
          multiline={false}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || disabled}
        >
          <Send size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 34,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
    borderRadius: 25,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});