import { useState, type ReactElement } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { Searchbar } from 'react-native-paper';

import { BinCard } from '../../components/bin/BinCard';
import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card } from '../../components/common/AuthUi';
import { colors } from '../../constants/theme';
import type { BinPreview, PreviewState } from '../../types/bin';

export function BinListScreen({ bins, state, setState, onSelect, onEdit, onAdd, onAccount }: {
  bins: BinPreview[]; state: PreviewState; setState: (state: PreviewState) => void;
  onSelect: (id: string) => void; onEdit: (id: string) => void; onAdd: () => void; onAccount: () => void;
}): ReactElement {
  const [search, setSearch] = useState('');
  const canSearch = bins.length > 1;
  const query = canSearch ? search.trim().toLocaleLowerCase('pt-BR') : '';
  const visible = bins.filter((bin) => `${bin.name} ${bin.location}`.toLocaleLowerCase('pt-BR').includes(query));
  return <AppShell title="Minhas lixeiras" onAccount={onAccount} onAdd={onAdd}>
    {state === 'ready' && bins.length > 0 && <>
      {canSearch && <Searchbar accessibilityLabel="Buscar lixeira" value={search} onChangeText={setSearch}
        placeholder="Nome ou localização" clearAccessibilityLabel="Limpar busca" searchAccessibilityLabel="Buscar"
        elevation={0} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18 }} />}
      {visible.map((bin) => <BinCard key={bin.id} bin={bin} onPress={() => { onSelect(bin.id); }} onEdit={() => { onEdit(bin.id); }} />)}
      {!visible.length && <Card><Text style={s.title}>Nenhuma lixeira encontrada.</Text><Text style={s.text}>Tente outro nome ou localização.</Text></Card>}
    </>}
    {state === 'loading' && <Card><ActivityIndicator color={colors.primary} /><Text style={s.text}>Carregando suas lixeiras…</Text></Card>}
    {(state === 'empty' || (state === 'ready' && !bins.length)) && <Card><Text style={s.title}>Nenhuma lixeira cadastrada.</Text><Button title="Adicionar primeira lixeira" onPress={onAdd} /></Card>}
    {state === 'error' && <Card><Text accessibilityRole="alert" style={s.title}>Não foi possível carregar as lixeiras.</Text><Button title="Tentar novamente" onPress={() => { setSearch(''); setState('ready'); }} /></Card>}
  </AppShell>;
}
