import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { login, resetPassword, signUp, loginAsGuest } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleAuthAction = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', '请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      if (isLoginMode) {
        await login(email, password);
        router.replace('/(tabs)');
      } else {
        await signUp(email, password);
        Alert.alert('注册成功', '请检查邮箱验证或直接登录');
        setIsLoginMode(true);
      }
    } catch (e: any) {
      Alert.alert(isLoginMode ? '登录失败' : '注册失败', e?.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('提示', '请输入邮箱地址以重置密码');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      Alert.alert('邮件已发送', '请检查您的邮箱以重置密码');
    } catch (e: any) {
      Alert.alert('发送失败', e?.message || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JIANGHU / {isLoginMode ? 'LOGIN' : 'SIGNUP'}</Text>
      <Text style={styles.subtitle}>
        {isLoginMode ? '连接后台账号以同步数据' : '创建新账号开启江湖之旅'}
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>邮箱</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#666"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>密码</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••"
          placeholderTextColor="#666"
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity style={styles.submit} onPress={handleAuthAction} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitText}>{isLoginMode ? '登录' : '注册'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerActions}>
          <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
            <Text style={styles.footerLink}>
              {isLoginMode ? '没有账号？去注册' : '已有账号？去登录'}
            </Text>
          </TouchableOpacity>
          
          {isLoginMode && (
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.footerLink}>忘记密码？</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity onPress={() => loginAsGuest()} style={{marginTop: 40, alignSelf: 'center'}}>
            <Text style={{color: '#444', fontSize: 10, letterSpacing: 2, fontWeight: 'bold'}}>CONTINUE AS GUEST</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cyberpunk.darkBg,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: Colors.cyberpunk.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: Colors.cyberpunk.textDim,
    marginTop: 8,
    marginBottom: 24,
  },
  form: {
    gap: 12,
  },
  label: {
    color: Colors.cyberpunk.textDim,
    fontSize: 12,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: Colors.cyberpunk.text,
    backgroundColor: '#0b0b0b',
  },
  submit: {
    marginTop: 12,
    backgroundColor: Colors.cyberpunk.neonGreen,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#000',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerLink: {
    color: Colors.cyberpunk.neonGreen,
    fontSize: 14,
  },
});
