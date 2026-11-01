import {StyleSheet} from 'react-native';

export const authButtonStyles = StyleSheet.create({
  button: {
    width: '100%',
    maxWidth: 340,
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(244, 143, 177, 0.34)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2185B',
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    elevation: 5,
  },
  label: {
    marginLeft: 8,
    color: '#202124',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {opacity: 0.75},
});
