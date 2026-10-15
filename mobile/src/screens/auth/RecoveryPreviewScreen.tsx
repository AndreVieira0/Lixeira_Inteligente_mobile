import type { ReactElement } from 'react';

import { Card, Heading, Notice, Page, TextLink } from '../../components/common/AuthUi';

export function RecoveryPreviewScreen({ onBack }: { onBack: () => void }): ReactElement {
  return <Page compact>
    <Heading title="Recuperar senha" />
    <Card><Notice message="Recuperação por e-mail indisponível no momento." /></Card>
    <TextLink onPress={onBack}>Voltar para entrar</TextLink>
  </Page>;
}
