import { useState, type ReactElement } from 'react';
import { Text } from 'react-native';

import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card, Field, Notice } from '../../components/common/AuthUi';

interface ClaimBinScreenProps {
  busy: boolean;
  error: string | null;
  onClearError: () => void;
  onBack: () => void;
  onClaim: (binId: string, name: string, local: string) => Promise<void>;
}

export function ClaimBinScreen({ busy, error, onClearError, onBack, onClaim }: ClaimBinScreenProps): ReactElement {
  const [binId, setBinId] = useState('');
  const [name, setName] = useState('');
  const [local, setLocal] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function validate(): string | null {
    if (!binId.trim()) return 'Informe o código da lixeira (ex.: BIN-0001).';
    if (!name.trim()) return 'Informe um nome para identificar a lixeira.';
    return null;
  }

  return (
    <AppShell title="Vincular lixeira" onBack={onBack}>
      <Card>
        <Text style={s.text}>
          Informe o código da lixeira (gravado no dispositivo) e escolha um nome para identificá-la.
          A lixeira deve estar ativa — o ESP32 precisa ter enviado pelo menos uma medição.
        </Text>
        <Field
          label="Código da lixeira"
          value={binId}
          onChangeText={(v) => { setBinId(v); onClearError(); }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ex.: BIN-0001"
          maxLength={64}
          editable={!busy}
          autoFocus
        />
        <Field
          label="Nome da lixeira"
          value={name}
          onChangeText={(v) => { setName(v); onClearError(); }}
          placeholder="Ex.: Biblioteca"
          maxLength={80}
          editable={!busy}
        />
        <Field
          label="Localização (opcional)"
          value={local}
          onChangeText={(v) => { setLocal(v); onClearError(); }}
          placeholder="Ex.: Bloco B"
          maxLength={100}
          editable={!busy}
        />
        <Notice message={localError ?? error} />
        <Button
          title="Vincular lixeira"
          loading={busy}
          onPress={async () => {
            const err = validate();
            if (err) { setLocalError(err); return; }
            setLocalError(null);
            await onClaim(binId, name, local);
          }}
        />
      </Card>
    </AppShell>
  );
}
