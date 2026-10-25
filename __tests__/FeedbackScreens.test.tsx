import React from 'react';
import {ToastAndroid} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import FAQScreen from '../app/screens/FAQScreen';
import ReportBugScreen from '../app/screens/ReportBugScreen';
import SuggestFeatureScreen from '../app/screens/SuggestFeatureScreen';
import {submitBugReport, submitFeatureRequest} from '../app/utils/api';

const mockGoBack = jest.fn();

jest.mock('../app/utils/api', () => ({
  submitBugReport: jest.fn(),
  submitFeatureRequest: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const {Text} = require('react-native');
  return ({name}: {name: string}) => <Text>{name}</Text>;
});

jest.mock('react-native-image-crop-picker', () => ({
  openPicker: jest.fn(),
}));

describe('Settings support screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ToastAndroid, 'show').mockImplementation(jest.fn());
  });

  it('renders FAQ content inside the app', () => {
    let screen: renderer.ReactTestRenderer;

    act(() => {
      screen = renderer.create(<FAQScreen />);
    });

    expect(screen!.root.findByProps({testID: 'faq-screen'})).toBeTruthy();
    expect(
      screen!.root.findAllByProps({children: 'Why do I need Google Sign-In?'}).length,
    ).toBeGreaterThan(0);
    expect(screen!.root.findAllByProps({children: 'What is Gopzo?'}).length).toBeGreaterThan(0);
  });

  it('submits bug report text to the backend feedback endpoint', async () => {
    jest.mocked(submitBugReport).mockResolvedValue({id: 'bug-1'});
    let screen: renderer.ReactTestRenderer;

    await act(async () => {
      screen = renderer.create(<ReportBugScreen />);
    });

    act(() => {
      screen!.root.findByProps({testID: 'bug-what-happened'}).props.onChangeText('App froze');
      screen!.root
        .findByProps({testID: 'bug-steps-to-reproduce'})
        .props.onChangeText('Open Settings and tap FAQ');
    });

    await act(async () => {
      await screen!.root.findByProps({testID: 'bug-submit'}).props.onPress();
    });

    expect(submitBugReport).toHaveBeenCalledWith({
      whatHappened: 'App froze',
      stepsToReproduce: 'Open Settings and tap FAQ',
      screenshot: null,
    });
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Bug report submitted',
      ToastAndroid.SHORT,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('submits feature request title and description', async () => {
    jest.mocked(submitFeatureRequest).mockResolvedValue({id: 'feature-1'});
    let screen: renderer.ReactTestRenderer;

    await act(async () => {
      screen = renderer.create(<SuggestFeatureScreen />);
    });

    act(() => {
      screen!.root.findByProps({testID: 'feature-title'}).props.onChangeText('Community Polls');
      screen!.root
        .findByProps({testID: 'feature-description'})
        .props.onChangeText('Allow community owners to create polls.');
    });

    await act(async () => {
      await screen!.root.findByProps({testID: 'feature-submit'}).props.onPress();
    });

    expect(submitFeatureRequest).toHaveBeenCalledWith({
      title: 'Community Polls',
      description: 'Allow community owners to create polls.',
    });
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Feature request submitted',
      ToastAndroid.SHORT,
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

jest.mock('react-native-vector-icons/Feather',()=>{const {Text}=require('react-native');return ({name}:any)=>require('react').createElement(Text,null,name);});

jest.mock('react-native-vector-icons/FontAwesome',()=>{const {Text}=require('react-native');return ({name}:any)=>require('react').createElement(Text,null,name);});

jest.mock('react-native-vector-icons/MaterialCommunityIcons',()=>{const {Text}=require('react-native');return ({name}:any)=>require('react').createElement(Text,null,name);});
