import { NotImplementedException } from '@nestjs/common';

export abstract class PlaceholderService {
  protected notImplemented(feature: string): never {
    throw new NotImplementedException(`${feature} is not implemented yet.`);
  }
}
