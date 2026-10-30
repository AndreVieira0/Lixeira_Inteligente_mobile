import { useState, type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card, Field, Notice } from '../../components/common/AuthUi';
import type { Bin } from '../../types/bin';

interface MembersScreenProps {
  bin: Bin;
  ownerUid: string;
  busy: boolean;
  error: string | null;
  onClearError: () => void;
  onBack: () => void;
  onAdd: (uid: string) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
}

export function MembersScreen({
  bin, ownerUid, busy, error, onClearError, onBack, onAdd, onRemove,
}: MembersScreenProps): ReactElement {
  const [newUid, setNewUid] = useState('');

  return (
    <AppShell title="Membros" subtitle={bin.name} onBack={onBack}>
      <Card>
        <Text style={s.title}>Membros autorizados</Text>
        <Text style={s.text}>
          Todos os membros podem visualizar o nível atual e o histórico desta lixeira.
          Somente o proprietário pode adicionar ou remover membros.
        </Text>
        {bin.members.map((uid) => (
          <View key={uid} style={s.row}>
            <Text style={[s.text, { flex: 1, fontFamily: 'monospace' }]} numberOfLines={1}>
              {uid}{uid === ownerUid ? ' (proprietário)' : ''}
            </Text>
            {uid !== ownerUid && (
              <Button
                title="Remover"
                variant="secondary"
                disabled={busy}
                onPress={async () => {
                  onClearError();
                  await onRemove(uid);
                }}
              />
            )}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={s.title}>Adicionar membro</Text>
        <Text style={s.text}>
          Informe o UID do usuário. Ele pode encontrar o próprio UID nas configurações da conta.
        </Text>
        <Field
          label="UID do usuário"
          value={newUid}
          onChangeText={(v) => { setNewUid(v); onClearError(); }}
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Ex.: aBcDeFgH1234567890AB"
          maxLength={40}
          editable={!busy}
        />
        <Notice message={error} />
        <Button
          title="Adicionar membro"
          loading={busy}
          onPress={async () => {
            if (!newUid.trim()) return;
            onClearError();
            const ok = await (async () => {
              await onAdd(newUid.trim());
              return true;
            })().catch(() => false);
            if (ok) setNewUid('');
          }}
        />
      </Card>
    </AppShell>
  );
}
