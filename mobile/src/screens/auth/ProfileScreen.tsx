import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Field, Heading, Notice, Page, TextLink, uiStyles } from '../../components/common/AuthUi';
import { AUTH_LIMITS } from '../../constants/auth';
import { useAuth } from '../../contexts/AuthContext';
import { validateName } from '../../utils/authValidation';

export function ProfileScreen(): ReactElement {
  const { identity, profile, busy, error, execute, clearError } = useAuth();
  const [draftName, setNome] = useState<string | null>(null);
  const nome = draftName ?? profile?.nome ?? '';
  const [nameError, setNameError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function save(): Promise<void> {
    const invalid = validateName(nome);
    setNameError(invalid);
    setSaved(false);
    if (invalid) return;
    if (await execute(async (accounts) => { await accounts.saveName(nome); })) setSaved(true);
  }
  async function remove(): Promise<void> {
    setDeleteError(null);
    if (!password || confirmation.trim() !== 'EXCLUIR') {
      setDeleteError('Informe sua senha e digite EXCLUIR para confirmar.');
      return;
    }
    await execute(async (accounts) => { await accounts.deleteAccount(password); });
    setPassword('');
  }
  function toggleDelete(value: boolean): void {
    clearError(); setSaved(false); setDeleteError(null); setPassword(''); setConfirmation(''); setDeleting(value);
  }

  return <Page>
    <Heading eyebrow={profile ? 'SUA CONTA' : 'FALTA SÓ UM PASSO'} title={profile ? 'Seu perfil,\ndo seu jeito.' : 'Vamos completar\nseu perfil.'} subtitle={profile ? 'Confira seus dados e mantenha sua conta atualizada.' : 'Seu acesso já existe. Salve seu nome para concluir o cadastro.'} />
    <Card>
      <Notice message={error} />
      {saved && <Notice kind="success" message="Seu perfil foi salvo." />}
      <Field label="Nome" value={nome} onChangeText={(value) => { setNome(value); setSaved(false); }} maxLength={AUTH_LIMITS.maxName} editable={!busy && !deleting} autoComplete="name" error={nameError} />
      <Field label="E-mail da conta" value={identity?.email ?? ''} editable={false} />
      <Text style={uiStyles.text}>Seu e-mail identifica a conta e é usado para recuperar o acesso.</Text>
      {!deleting && <Button title={profile ? 'Salvar alterações' : 'Concluir cadastro'} onPress={save} loading={busy} />}
    </Card>
    {deleting ? <Card>
      <Text accessibilityRole="header" style={uiStyles.strong}>Excluir sua conta?</Text>
      <Text style={uiStyles.text}>Seu perfil e seu acesso serão apagados. Esta ação não pode ser desfeita. Confirme sua senha para continuar.</Text>
      <Notice message={deleteError} />
      <Field label="Senha atual" secret value={password} onChangeText={setPassword} editable={!busy} autoComplete="current-password" textContentType="password" maxLength={AUTH_LIMITS.maxPassword} />
      <Field label="Digite EXCLUIR para confirmar" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} editable={!busy} />
      <Button title="Excluir minha conta definitivamente" variant="danger" loading={busy} onPress={remove} />
      <TextLink disabled={busy} onPress={() => { toggleDelete(false); }}>Cancelar e manter minha conta</TextLink>
    </Card> : <View style={uiStyles.actions}>
      <Button title="Sair da conta" variant="secondary" disabled={busy} onPress={async () => { await execute(async (accounts) => { await accounts.logout(); }); }} />
      <TextLink disabled={busy} onPress={() => { toggleDelete(true); }}>Excluir minha conta</TextLink>
    </View>}
  </Page>;
}
