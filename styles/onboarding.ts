import { StyleSheet } from 'react-native';

export const onboardingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    marginTop: 60,
  },
  progress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionButton: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionButtonSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#8B5CF6',
  },
});
