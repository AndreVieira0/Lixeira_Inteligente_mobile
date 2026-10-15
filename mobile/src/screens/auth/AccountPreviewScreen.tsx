import type { ReactElement } from 'react';

import { AppShell } from '../../components/common/AppShell';
import { Button, Card, Field } from '../../components/common/AuthUi';

export function AccountPreviewScreen({ visitor, onBack, onLogout }: {
  visitor: { nome: string; email: string }; onBack: () => void; onLogout: () => void;
}): ReactElement {
  return <AppShell title="Perfil" onBack={onBack}>
    <Card><Field label="Nome" value={visitor.nome} editable={false} /><Field label="E-mail" value={visitor.email || 'Não informado'} editable={false} /></Card>
    <Button title="Sair da conta" variant="secondary" onPress={onLogout} />
  </AppShell>;
}
