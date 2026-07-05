import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

export const CreatorProfileId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<{ creatorProfileId?: string }>();

    if (!request.creatorProfileId) {
      throw new ForbiddenException('Creator context is required.');
    }

    return request.creatorProfileId;
  },
);
