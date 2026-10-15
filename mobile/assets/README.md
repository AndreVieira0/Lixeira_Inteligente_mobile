# Imagens do aplicativo

Organização dos arquivos visuais fixos usados pelo app:

```text
assets/
├── branding/             # Logo, versões horizontais e arquivos originais
├── icons/                # Ícones usados na interface
├── illustrations/        # Ilustrações de telas e estados vazios
└── images/
    ├── backgrounds/      # Imagens de fundo
    └── placeholders/     # Imagens padrão quando não houver foto
```

## Como adicionar imagens

- Use nomes descritivos, em minúsculas, sem espaços ou acentos: `logo-horizontal.png`, `lixeira-vazia.png`.
- Coloque a logo em `branding/`. Prefira PNG com fundo transparente para uso direto e guarde o original em SVG quando disponível.
- Reduza dimensões e tamanho dos arquivos antes de adicioná-los ao app.
- Os arquivos `.gitkeep` apenas mantêm as pastas vazias no Git.

Exemplo de uso em um componente dentro de `src/screens/auth/`, após adicionar `branding/logo.png`:

```tsx
import { Image } from 'react-native';

<Image
  source={require('../../../assets/branding/logo.png')}
  style={{ width: 160, height: 60 }}
  resizeMode="contain"
  accessibilityLabel="Lixeira Inteligente"
/>
```

Os ícones do Expo e a imagem de abertura existentes permanecem na raiz de `assets/`, preservando os caminhos da configuração do aplicativo.

Fotos enviadas por usuários não devem ser incluídas nesta pasta ou no Git. Elas deverão ser armazenadas em um serviço externo, com a referência e os metadados registrados no banco de dados.
