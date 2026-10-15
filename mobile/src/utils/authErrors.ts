export class AccountError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'AccountError';
  }
}

const messages: Record<string, string> = {
  'account/invalid-form': 'Confira os campos informados e tente novamente.',
  'account/session-required': 'Sua sessão expirou. Entre novamente.',
  'account/profile-pending': 'Sua conta foi criada, mas o perfil ainda não foi salvo. Complete seu nome para continuar.',
  'account/recovery-required': 'Não foi possível concluir a exclusão. Entre novamente e complete seu perfil antes de tentar de novo.',
  'account/invalid-profile': 'Não foi possível ler seu perfil. Tente novamente ou procure o responsável pelo aplicativo.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado. Entre ou recupere sua senha.',
  'auth/invalid-email': 'Informe um e-mail válido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/weak-password': 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.',
  'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos de segurança. Escolha uma senha mais forte.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Confira sua conexão com a internet e tente novamente.',
  'auth/user-disabled': 'Não foi possível acessar esta conta. Procure o responsável pelo aplicativo.',
  'auth/requires-recent-login': 'Para sua segurança, entre novamente antes de excluir a conta.',
  'auth/operation-not-allowed': 'O acesso por e-mail ainda não está disponível. Procure o responsável pelo aplicativo.',
  'auth/invalid-api-key': 'O serviço de acesso está indisponível. Tente novamente mais tarde.',
  'permission-denied': 'Não foi possível acessar seu perfil. Procure o responsável pelo aplicativo.',
  'unavailable': 'O serviço está indisponível. Confira sua conexão e tente novamente.',
};

export function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') return error.code;
}

export function authErrorMessage(error: unknown): string {
  const code = errorCode(error);
  return (code ? messages[code] : undefined) ?? 'Não foi possível concluir. Tente novamente em instantes.';
}
