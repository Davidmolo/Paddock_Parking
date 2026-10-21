import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../data/data-store.service.js';

@Injectable()
export class PropertiesService {
  constructor(private readonly store: DataStoreService) {}

  findAll() {
    return this.store.properties;
  }

  findOne(id: string) {
    const property = this.store.properties.find((p) => p.id === id);
    if (!property) {
      throw new NotFoundException(`Property ${id} not found`);
    }
    return property;
  }
}
