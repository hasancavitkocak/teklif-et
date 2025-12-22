import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, onFocus, disabled = false }: MessageInputProps) {
  const [messageText, setMessageText] = useState('');
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    if (!messageText.trim() || disabled) return;
    
    onSendMessage(messageText.trim());
    setMessageText('');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'position' : undefined}
    >
      <View style={[styles.inputWrapper, { paddingBottom: insets.bottom }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mesaj..."
            placeholderTextColor="#8E8E93"
            value={messageText}
            onChangeText={setMessageText}
            onFocus={onFocus}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || disabled}
          >
            <Send size={20} color={messageText.trim() ? '#8B5CF6' : '#D1D5DB'} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 2,
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
    fontSize: 15,
    maxHeight: 80,
    color: '#000',
    borderWidth: 0,
    minHeight: 20,
  },
  sendButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 1,
  },
});