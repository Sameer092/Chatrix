import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authService } from '../../../services/auth.service';
import type { AuthNavProp } from '../../../types/navigation.types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const navigation = useNavigation<AuthNavProp>();
  const insets = useSafeAreaInsets();

  const { control, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', username: '', email: '', password: '', confirmPassword: '' },
  });

  const { mutate: signUp, isPending } = useMutation({
    mutationFn: authService.signUp,
    onSuccess: async (data, variables) => {
      // Case 1: a session was returned (email confirmation is OFF) → the auth
      // listener in useAuth fires SIGNED_IN and the app switches to Main. Done.
      if (data.session) return;

      // Case 2: no session. Either confirmation is OFF but Supabase didn't
      // auto-create a session, or confirmation is ON. Try to sign in right
      // away — if it works, the listener takes us straight into the app.
      try {
        await authService.signIn({ email: variables.email, password: variables.password });
      } catch {
        // Sign-in failed → email confirmation is required.
        Alert.alert(
          'Verify your email',
          "We've sent a confirmation link to your email. Please verify your account, then sign in.",
          [{ text: 'Go to Sign In', onPress: () => navigation.navigate('Login') }]
        );
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('already registered')) {
        setError('email', { message: 'This email is already registered' });
      } else {
        setError('email', { message: error.message });
      }
    },
  });

  const onSubmit = async (data: FormData) => {
    const isAvailable = await authService.checkUsernameAvailability(data.username);
    if (!isAvailable) {
      setError('username', { message: 'This username is already taken' });
      return;
    }
    signUp({ email: data.email, password: data.password, username: data.username.toLowerCase(), name: data.name });
  };

  return (
    <LinearGradient colors={['#0F0F23', '#1A1A3E']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Chatrix and start connecting</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Full Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  leftIcon="person-outline"
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Username"
                  value={value}
                  onChangeText={(t) => onChange(t.toLowerCase())}
                  placeholder="john_doe"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="at-outline"
                  error={errors.username?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail-outline"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Confirm Password"
                  value={value}
                  onChangeText={onChange}
                  placeholder="••••••••"
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isPending}
              gradient
              size="lg"
              style={styles.createBtn}
            />

            <View style={styles.signInRow}>
              <Text style={styles.signInText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInLink}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 24 },
  header: { marginBottom: 32 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#94A3B8' },
  form: { flex: 1 },
  createBtn: { width: '100%', marginTop: 8 },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signInText: { color: '#94A3B8', fontSize: 15 },
  signInLink: { color: '#6C63FF', fontSize: 15, fontWeight: '700' },
});
