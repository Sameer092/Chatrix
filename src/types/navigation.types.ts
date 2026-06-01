import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Chats: undefined;
  Groups: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: { conversationId: string; userId: string; username: string; avatar?: string };
  GroupChat: { groupId: string; groupName: string; avatar?: string };
  CreateGroup: undefined;
  GroupInfo: { groupId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  UserProfile: { userId: string };
  EditProfile: undefined;
  Search: undefined;
  Settings: undefined;
  Friends: undefined;
  Chat: { conversationId: string; userId: string; username: string; avatar?: string };
  GroupChat: { groupId: string; groupName: string; avatar?: string };
  CreateGroup: undefined;
  GroupInfo: { groupId: string };
  PostDetail: { postId: string };
  ImageViewer: { uri: string; uris?: string[]; index?: number };
};

export type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavProp = BottomTabNavigationProp<MainTabParamList>;
export type ChatNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type AuthRouteProp<T extends keyof AuthStackParamList> = RouteProp<AuthStackParamList, T>;
export type RootRouteProp<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;
export type ChatRouteProp<T extends keyof ChatStackParamList> = RouteProp<ChatStackParamList, T>;
