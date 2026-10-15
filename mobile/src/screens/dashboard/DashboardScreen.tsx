import { useState, type ReactElement } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Button, Card, Field, Notice, uiStyles } from '../../components/common/AuthUi';
import { dashboardColors, DEMO_BINS, DEMO_HISTORY, type DemoBin } from '../../constants/demo';
import { colors } from '../../constants/theme';

import { dashboardStyles as s } from './dashboardStyles';

type Section = 'overview' | 'bins' | 'alerts' | 'profile';
const navigation: { id: Section; label: string; symbol: string }[] = [
  { id: 'overview', label: 'Visão geral', symbol: '◫' },
  { id: 'bins', label: 'Minhas lixeiras', symbol: '▤' },
  { id: 'alerts', label: 'Alertas', symbol: '○' },
  { id: 'profile', label: 'Meu perfil', symbol: '◇' },
];

function levelStyle(level: number): { label: string; color: string; background: string } {
  if (level >= 80) return { label: 'Coleta prioritária', color: colors.danger, background: colors.dangerSoft };
  if (level >= 50) return { label: 'Em atenção', color: dashboardColors.warning, background: dashboardColors.warningSoft };
  return { label: 'Normal', color: colors.primary, background: colors.primarySoft };
}

function BinCard({ bin, onPress }: { bin: DemoBin; onPress: () => void }): ReactElement {
  const status = levelStyle(bin.level);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${bin.name}`} onPress={onPress}
    style={({ pressed }) => [s.binCard, pressed && s.pressed]}>
    <View style={s.cardTop}>
      <View style={[s.binIcon, { backgroundColor: status.background }]}><Text style={[s.binGlyph, { color: status.color }]}>▤</Text></View>
      <View style={s.connection}><View style={s.dot} /><Text style={s.smallText}>Conectada</Text></View>
    </View>
    <Text style={s.cardTitle}>{bin.name}</Text>
    <Text style={s.smallText}>{bin.location}</Text>
    <View style={s.levelRow}><Text style={s.level}>{bin.level}<Text style={s.percent}>%</Text></Text><Text style={s.smallText}>de preenchimento</Text></View>
    <View style={s.progressTrack}><View style={[s.progressFill, { width: `${bin.level.toString()}%` as `${number}%`, backgroundColor: status.color }]} /></View>
    <View style={s.cardBottom}><View style={[s.badge, { backgroundColor: status.background }]}><Text style={[s.badgeText, { color: status.color }]}>{status.label}</Text></View><Text style={s.smallText}>Ver detalhes →</Text></View>
  </Pressable>;
}

export function DashboardScreen({ visitor, onLogout }: { visitor: { nome: string; email: string }; onLogout: () => void }): ReactElement {
  const wide = useWindowDimensions().width >= 1000;
  const [section, setSection] = useState<Section>('overview');
  const [bins, setBins] = useState<DemoBin[]>(DEMO_BINS);
  const [search, setSearch] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<DemoBin | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const priority = bins.filter((bin) => bin.level >= 80);
  const mean = Math.round(bins.reduce((sum, bin) => sum + bin.level, 0) / bins.length);
  const visibleBins = bins.filter((bin) => (!onlyAttention || bin.level >= 50)
    && `${bin.name} ${bin.location}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const title = navigation.find((item) => item.id === section)?.label ?? 'Visão geral';

  function addBin(): void {
    if (!name.trim() || !location.trim()) { setFormError('Preencha o nome e a localização.'); return; }
    setBins((previous) => [...previous, { id: `demo-${Date.now().toString()}`, name: name.trim(), location: location.trim(), level: 0 }]);
    setAdding(false); setName(''); setLocation(''); setFormError(null); setSearch(''); setOnlyAttention(false); setSection('bins');
  }

  const menu = navigation.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: section === item.id }}
    onPress={() => { setSection(item.id); }} style={[s.navItem, section === item.id && s.navActive]}>
    <Text style={[s.navSymbol, section === item.id && s.navSelected]}>{item.symbol}</Text>
    <Text style={[s.navLabel, section === item.id && s.navSelected]}>{item.label}</Text>
    {item.id === 'alerts' && <View style={s.alertCount}><Text style={s.alertCountText}>{priority.length}</Text></View>}
  </Pressable>);

  return <SafeAreaView style={[s.root, wide && s.rootWide]}>
    {wide && <View style={s.sidebar}>
      <Brand /><Text style={s.menuCaption}>SEU ESPAÇO</Text><View style={s.menu}>{menu}</View>
      <View style={s.sidebarBottom}>
        <View style={s.ecoCard}><Text style={s.ecoTitle}>Cada cuidado conta.</Text><Text style={s.smallText}>Acompanhar hoje é transformar o amanhã.</Text></View>
        <Text style={s.smallText}>Lixeira Inteligente · Prévia 01</Text>
      </View>
    </View>}
    <View style={s.main}>
      <View style={[s.topbar, !wide && s.topbarCompact]}>
        {wide ? <Text style={s.breadcrumb}>Meu espaço / <Text style={s.bold}>{title}</Text></Text> : <Brand />}
        <View style={s.userActions}>
          {wide && <><View style={s.demoPill}><Text style={s.demoPillText}>Modo demonstração</Text></View><View style={s.avatar}><Text style={s.avatarText}>{visitor.nome.charAt(0).toUpperCase()}</Text></View></>}
          <Pressable accessibilityRole="button" onPress={onLogout} style={s.logout}><Text style={s.logoutText}>Sair</Text></Pressable>
        </View>
      </View>
      {!wide && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mobileNav} contentContainerStyle={s.mobileNavContent}>{menu}</ScrollView>}
      <ScrollView style={s.body} contentContainerStyle={[s.bodyContent, !wide && s.bodyCompact]}>
        <View style={[s.pageHeader, !wide && s.stack]}>
          <View style={s.headerText}><Text style={s.eyebrow}>Olá, {visitor.nome.split(' ')[0]}.</Text><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={s.subtitle}>Um olhar atento para os espaços que você cuida.</Text></View>
          {(section === 'overview' || section === 'bins') && <Button title="Adicionar lixeira" onPress={() => { setAdding(true); setFormError(null); }} />}
        </View>
        <Text style={s.demoNote}>Demonstração com dados ilustrativos · alterações não são salvas.</Text>

        {section === 'overview' && <>
          <View style={s.stats}>
            {[{ label: 'Lixeiras monitoradas', value: bins.length.toString().padStart(2, '0'), detail: 'Tudo em um só lugar', color: colors.primary },
              { label: 'Precisam de coleta', value: priority.length.toString().padStart(2, '0'), detail: 'Atenção ao próximo passo', color: colors.danger },
              { label: 'Ocupação média', value: `${mean.toString()}%`, detail: 'Visão dos seus espaços', color: dashboardColors.blue }].map((stat) => <View key={stat.label} style={s.stat}><Text style={s.statLabel}>{stat.label}</Text><Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text><Text style={s.smallText}>{stat.detail}</Text></View>)}
          </View>
          <View style={[s.priorityBanner, !wide && s.stack]}>
            <View style={s.bannerCopy}><Text style={s.bannerEyebrow}>UM POUCO DE ATENÇÃO FAZ A DIFERENÇA</Text><Text style={s.bannerTitle}>A próxima coleta já tem prioridade.</Text><Text style={s.bannerText}>A lixeira do pátio está em 92%. Acompanhe os detalhes e planeje a coleta.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => { setSelected(bins[0]); }} style={s.bannerButton}><Text style={s.bannerButtonText}>Ver prioridade →</Text></Pressable>
          </View>
        </>}

        {(section === 'overview' || section === 'bins') && <View style={s.section}>
          <View style={[s.sectionHeader, !wide && s.stack]}>
            <Text accessibilityRole="header" style={s.sectionTitle}>Suas lixeiras</Text>
            <TextInput accessibilityLabel="Buscar lixeira" placeholder="Buscar por nome ou local" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={[s.search, !wide && s.searchCompact]} />
          </View>
          <View style={s.filters}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !onlyAttention }} onPress={() => { setOnlyAttention(false); }} style={[s.filter, !onlyAttention && s.filterActive]}><Text style={[s.filterText, !onlyAttention && s.filterSelected]}>Todas ({bins.length})</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: onlyAttention }} onPress={() => { setOnlyAttention(true); }} style={[s.filter, onlyAttention && s.filterActive]}><Text style={[s.filterText, onlyAttention && s.filterSelected]}>Precisam de atenção</Text></Pressable>
          </View>
          <View style={s.binGrid}>{visibleBins.map((bin) => <BinCard key={bin.id} bin={bin} onPress={() => { setSelected(bin); }} />)}</View>
          {visibleBins.length === 0 && <Card><Text style={s.subtitle}>Nenhuma lixeira encontrada. Tente outro nome ou filtro.</Text></Card>}
        </View>}

        {section === 'overview' && <View style={[s.lowerGrid, !wide && s.stack]}>
          <View style={s.historyCard}>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Ao longo da semana</Text><Text style={s.smallText}>Ocupação média</Text></View>
            <View style={s.chart}>{DEMO_HISTORY.map((day, index) => <View key={day.day} style={s.chartColumn} accessibilityLabel={`${day.day}: ${day.level.toString()} por cento`}>
              <Text style={s.chartValue}>{day.level}%</Text><View style={[s.chartBar, { height: day.level * 1.5, backgroundColor: index === DEMO_HISTORY.length - 1 ? colors.primary : colors.primarySoft }]} /><Text style={s.smallText}>{day.day}</Text>
            </View>)}</View>
          </View>
          <View style={s.activityCard}><Text style={s.sectionTitle}>Últimas atualizações</Text>
            <View style={s.activity}><View style={[s.activityDot, { backgroundColor: colors.danger }]} /><View style={s.flex}><Text style={s.activityTitle}>Hora de ficar de olho</Text><Text style={s.smallText}>Pátio atingiu 92% de ocupação.</Text><Text style={s.activityTime}>Há 2 minutos · exemplo</Text></View></View>
            <View style={s.activity}><View style={s.activityDot} /><View style={s.flex}><Text style={s.activityTitle}>Tudo certo na sala</Text><Text style={s.smallText}>Nível atualizado para 28%.</Text><Text style={s.activityTime}>Há 5 minutos · exemplo</Text></View></View>
          </View>
        </View>}

        {section === 'alerts' && <View style={s.section}>
          <Text style={s.subtitle}>Os avisos ajudam você a acompanhar o que precisa de atenção.</Text>
          {priority.map((bin) => <Card key={bin.id}><Text style={s.cardTitle}>{bin.name} está próxima da capacidade</Text><Text style={s.subtitle}>{bin.level}% de ocupação · {bin.location}</Text><Button title="Ver lixeira" variant="secondary" onPress={() => { setSelected(bin); }} /></Card>)}
          <Text style={s.smallText}>Prévia visual dos alertas. Nenhuma notificação real é enviada.</Text>
        </View>}

        {section === 'profile' && <View style={s.profileCard}><Card><Text style={s.sectionTitle}>Seu espaço começa com você.</Text><Field label="Nome" value={visitor.nome} editable={false} /><Field label="E-mail" value={visitor.email || 'Não informado na demonstração'} editable={false} /><Text style={s.subtitle}>Você está explorando uma prévia. Nenhuma conta foi criada e seus dados não serão salvos.</Text><Button title="Voltar à visão geral" variant="secondary" onPress={() => { setSection('overview'); }} /></Card></View>}
        <Text style={s.footer}>Pequenas atitudes. Espaços melhores.</Text>
      </ScrollView>
    </View>

    <Modal visible={adding || selected !== null} transparent animationType="fade" onRequestClose={() => { setAdding(false); setSelected(null); }}>
      <View style={s.modalBackdrop}><ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled"><View style={s.modalCard}>
        <Card>{adding ? <>
          <Text accessibilityRole="header" style={s.sectionTitle}>Uma nova lixeira no seu espaço</Text>
          <Text style={s.subtitle}>Experimente como ela aparecerá no painel. Não é necessário conectar um dispositivo.</Text>
          <Field label="Nome da lixeira" value={name} onChangeText={setName} placeholder="Ex.: Lixeira da biblioteca" maxLength={80} />
          <Field label="Localização" value={location} onChangeText={setLocation} placeholder="Ex.: Bloco B · Térreo" maxLength={100} />
          <Notice message={formError} /><Button title="Adicionar à demonstração" onPress={addBin} />
        </> : selected && <>
          <Text style={s.eyebrow}>DETALHES DA LIXEIRA</Text><Text accessibilityRole="header" style={s.title}>{selected.name}</Text><Text style={s.subtitle}>{selected.location}</Text>
          <Text style={[s.detailLevel, { color: levelStyle(selected.level).color }]}>{selected.level}%</Text>
          <View style={s.progressTrack}><View style={[s.progressFill, { width: `${selected.level.toString()}%` as `${number}%`, backgroundColor: levelStyle(selected.level).color }]} /></View>
          <Text style={s.cardTitle}>{levelStyle(selected.level).label}</Text><Text style={uiStyles.text}>Leitura ilustrativa. Os dados reais do sensor estarão disponíveis na etapa de integração.</Text>
        </>}
          <Button title="Fechar" variant="secondary" onPress={() => { setAdding(false); setSelected(null); }} />
        </Card>
      </View></ScrollView></View>
    </Modal>
  </SafeAreaView>;
}
