import { Injectable } from '@nestjs/common';
import {
  IdentityProviderPort,
  NormalizedIdentityClaims,
  ResolvedIdentity,
} from './identity-provider.port';
import { UserProvisioningService } from '../user-provisioning.service';

@Injectable()
export class LocalNocodbIdentityProviderService extends IdentityProviderPort {
  constructor(
    private readonly userProvisioningService: UserProvisioningService,
  ) {
    super();
  }

  async resolveIdentity(
    claims: NormalizedIdentityClaims,
  ): Promise<ResolvedIdentity> {
    return this.userProvisioningService.upsertIdentityUser({
      ...claims,
      provider: 'local',
    });
  }
}
