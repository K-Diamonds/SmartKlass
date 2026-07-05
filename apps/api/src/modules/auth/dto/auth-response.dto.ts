export class AuthTokensDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}

export class AuthUserDto {
  id!: string;
  email!: string;
  displayName!: string;
  isCreator!: boolean;
  creatorProfileId!: string | null;
}

export class AuthResponseDto {
  user!: AuthUserDto;
  tokens!: AuthTokensDto;
}
