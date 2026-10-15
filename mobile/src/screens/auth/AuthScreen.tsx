import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Field, Heading, Notice, Page, TextLink, uiStyles } from '../../components/common/AuthUi';
import { ScreenTransition } from '../../components/common/ScreenTransition';
import { AUTH_LIMITS, RESET_PASSWORD_MESSAGE } from '../../constants/auth';
import { useAuth } from '../../contexts/AuthContext';
import type { Registration } from '../../types/account';
import { validateEmail, validateLogin, validateRegistration, type FormErrors } from '../../utils/authValidation';

export type AuthMode = 'login' | 'register' | 'reset';
const copy = {
  login: { title: 'Entrar', button: 'Entrar' },
  register: { title: 'Criar conta', button: 'Criar conta' },
  reset: { title: 'Recuperar senha', subtitle: 'Receba um link de recuperação por e-mail.', button: 'Enviar link' },
};

interface AuthFormProps {
  mode: AuthMode;
  navigate: (mode: AuthMode) => void;
  onSubmit: (mode: AuthMode, values: Registration) => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
  configured?: boolean;
  clearError?: () => void;
  demo?: boolean;
}

export function AuthForm({ mode, navigate, onSubmit, busy = false, error = null, configured = true, clearError, demo = false }: AuthFormProps): ReactElement {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [sent, setSent] = useState(false);
  const content = copy[mode];
  const unavailable = !configured ? 'O serviço de acesso está indisponível. Tente novamente mais tarde.' : null;

  function changeMode(next: AuthMode): void { clearError?.(); navigate(next); }
  async function submit(): Promise<void> {
    if (busy || sent) return;
    const values = { nome, email, password, confirmation };
    const emailError = validateEmail(email);
    const validation = mode === 'register' ? validateRegistration(values) : mode === 'login' ? validateLogin(values) : emailError ? { email: emailError } : {};
    setErrors(validation);
    if (!demo && Object.keys(validation).length) return;
    if (demo) setErrors({});
    const success = await onSubmit(mode, values);
    setPassword('');
    setConfirmation('');
    if (success && mode === 'reset') setSent(true);
  }

  return <Page compact>
    <Heading {...content} />
    <Card>
      <Notice message={error ?? unavailable} />
      {sent ? <ScreenTransition><Notice kind={demo ? 'error' : 'success'} message={demo ? 'Recuperação por e-mail indisponível no momento.' : RESET_PASSWORD_MESSAGE} /></ScreenTransition> : <>
        {mode === 'register' && <Field label="Seu nome" value={nome} onChangeText={setNome} placeholder="Seu nome" autoComplete="name" textContentType="name" maxLength={AUTH_LIMITS.maxName} editable={!busy} error={errors.nome} />}
        <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" maxLength={AUTH_LIMITS.maxEmail} editable={!busy} error={errors.email} returnKeyType={mode === 'reset' ? 'done' : 'next'} onSubmitEditing={mode === 'reset' ? submit : undefined} />
        {mode !== 'reset' && <Field label="Senha" value={password} onChangeText={setPassword} placeholder={mode === 'register' ? 'Pelo menos 8 caracteres' : 'Digite sua senha'} secret autoComplete={mode === 'register' ? 'new-password' : 'current-password'} textContentType={mode === 'register' ? 'newPassword' : 'password'} maxLength={AUTH_LIMITS.maxPassword} editable={!busy} error={errors.password} onSubmitEditing={mode === 'login' ? submit : undefined} returnKeyType={mode === 'login' ? 'go' : 'next'} />}
        {mode === 'register' && <Field label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} placeholder="Digite a senha novamente" secret autoComplete="new-password" textContentType="newPassword" maxLength={AUTH_LIMITS.maxPassword} editable={!busy} error={errors.confirmation} onSubmitEditing={submit} returnKeyType="go" />}
        {mode === 'login' && <TextLink disabled={busy} onPress={() => { changeMode('reset'); }}>Esqueci minha senha</TextLink>}
        <Button title={content.button} onPress={submit} loading={busy} disabled={!configured} />
      </>}

    </Card>
    <View style={uiStyles.centered}>
      {mode === 'login' ? <><Text style={uiStyles.text}>Ainda não tem uma conta?</Text><Button title="Criar uma conta" variant="secondary" disabled={busy} onPress={() => { changeMode('register'); }} /></>
        : <TextLink disabled={busy} onPress={() => { changeMode('login'); }}>Voltar para entrar</TextLink>}
    </View>
  </Page>;
}

export function AuthScreen({ mode, navigate }: { mode: AuthMode; navigate: (mode: AuthMode) => void }): ReactElement {
  const { busy, error, execute, clearError, configured } = useAuth();
  return <AuthForm mode={mode} navigate={navigate} busy={busy} error={error} configured={configured} clearError={clearError}
    onSubmit={(action, values) => execute(async (accounts) => {
      if (action === 'register') await accounts.register(values);
      else if (action === 'login') await accounts.login(values.email, values.password);
      else await accounts.resetPassword(values.email);
    })} />;
}
