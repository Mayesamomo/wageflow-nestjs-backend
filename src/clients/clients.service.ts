import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientDto } from './dto/client.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async create(userId: string, createClientDto: CreateClientDto): Promise<ClientDto> {
    const client = this.clientsRepository.create({
      ...createClientDto,
      userId,
    });
    
    const savedClient = await this.clientsRepository.save(client);
    return new ClientDto(savedClient);
  }

  async findAll(userId: string, pageOptionsDto: PageOptionsDto): Promise<PageDto<ClientDto>> {
    const queryBuilder = this.clientsRepository
      .createQueryBuilder('client')
      .where('client.userId = :userId', { userId })
      .orderBy('client.name', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const clientDtos = entities.map(client => new ClientDto(client));
    const pageMetaDto = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(clientDtos, pageMetaDto);
  }

  async findOne(userId: string, id: string): Promise<ClientDto> {
    const client = await this.clientsRepository.findOne({
      where: { id, userId },
    });
    
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    
    return new ClientDto(client);
  }

  async update(userId: string, id: string, updateClientDto: UpdateClientDto): Promise<ClientDto> {
    const client = await this.clientsRepository.findOne({
      where: { id, userId },
    });
    
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    
    Object.assign(client, updateClientDto);
    const updatedClient = await this.clientsRepository.save(client);
    
    return new ClientDto(updatedClient);
  }

  async remove(userId: string, id: string): Promise<void> {
    const client = await this.clientsRepository.findOne({
      where: { id, userId },
    });
    
    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found`);
    }
    
    await this.clientsRepository.remove(client);
  }
}