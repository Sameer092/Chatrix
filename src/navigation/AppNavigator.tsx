import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';

import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useNotifications } from '../hooks/useNotifications';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import type { RootStackParamList } from '../types/navigation.types';

// Screens accessible from anywhere
import UserProfileScreen from '../features/profile/screens/UserProfileScreen';
import EditProfileScreen from '../features/profile/screens/EditProfileScreen';
import SearchScreen from '../features/search/screens/SearchScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import GroupChatScreen from '../features/groups/screens/GroupChatScreen';
import CreateGroupScreen from '../features/groups/screens/CreateGroupScreen';
import GroupInfoScreen from '../features/groups/screens/GroupInfoScreen';
import PostDetailScreen from '../features/feed/screens/PostDetailScreen';
import ImageViewerScreen from '../features/feed/screens/ImageViewerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  useOnlineStatus();
  useNotifications();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Friends"
            component={FriendsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="GroupChat"
            component={GroupChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="GroupInfo"
            component={GroupInfoScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ImageViewer"
            component={ImageViewerScreen}
            options={{ animation: 'fade', presentation: 'transparentModal' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
