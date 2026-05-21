export interface NormalizedIdentityClaims {
  subject: string;
  provider: 'local' | 'external';
  email?: string;
  username?: string;
  roles: string[];
  scope: string[];
}

export interface ResolvedIdentity {
  userId: number;
  username: string;
  email?: string;
  roles: string[];
  active: boolean;
}

export abstract class IdentityProviderPort {
  abstract resolveIdentity(
    claims: NormalizedIdentityClaims,
  ): Promise<ResolvedIdentity>;
}
