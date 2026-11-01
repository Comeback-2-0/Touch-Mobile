import {StyleSheet} from 'react-native';

export const authButtonStyles = StyleSheet.create({
  button: {
    width: '100%',
    maxWidth: 340,
    minHeight: 56,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '400',
  },
  pressed: {opacity: 0.75},
});
