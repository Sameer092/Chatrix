import 'expo/build/Expo.fx';
import { registerRootComponent } from 'expo';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import App from './App';

if (__DEV__) {
  activateKeepAwakeAsync();
}

registerRootComponent(App);
