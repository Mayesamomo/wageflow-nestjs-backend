import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Mileage } from './entities/mileage.entity';
import { CreateMileageDto } from './dto/create-mileage.dto';
import { UpdateMileageDto } from './dto/update-mileage.dto';
import { MileageDto } from './dto/mileage.dto';
import { MileagesFilterDto } from './dto/mileages-filter.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class MileagesService {
  constructor(
    @InjectRepository(Mileage)
    private mileagesRepository: Repository<Mileage>,
    private clientsService: ClientsService,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createMileageDto: CreateMileageDto): Promise<MileageDto> {
    // Verify client exists and belongs to user
    await this.clientsService.findOne(userId, createMileageDto.clientId);
    
    const user = await this.usersService.findById(userId);
    
    // Use user's mileage rate if not provided
    const ratePerKm = createMileageDto.ratePerKm ?? user.mileageRate;
    
    // Calculate amount
    const amount = createMileageDto.distance * ratePerKm;
    
    const mileage = this.mileagesRepository.create({
      ...createMileageDto,
      date: new Date(createMileageDto.date),
      userId,
      ratePerKm,
      amount,
    });
    
    const savedMileage = await this.mileagesRepository.save(mileage);
    return new MileageDto(savedMileage);
  }

  async findAll(userId: string, filterDto: MileagesFilterDto): Promise<PageDto<MileageDto>> {
    const { clientId, startDate, endDate, isInvoiced, order, take, skip } = filterDto;
    
    const queryBuilder = this.mileagesRepository
      .createQueryBuilder('mileage')
      .leftJoinAndSelect('mileage.client', 'client')
      .where('mileage.userId = :userId', { userId });
      
    // Apply filters
    if (clientId) {
      queryBuilder.andWhere('mileage.clientId = :clientId', { clientId });
    }
    
    if (startDate && endDate) {
      queryBuilder.andWhere('mileage.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('mileage.date >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('mileage.date <= :endDate', { endDate });
    }
    
    if (isInvoiced !== undefined) {
      queryBuilder.andWhere('mileage.isInvoiced = :isInvoiced', { isInvoiced });
    }
    
    // Apply pagination and ordering
    queryBuilder
      .orderBy('mileage.date', order)
      .skip(skip)
      .take(take);
      
    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    
    const mileageDtos = entities.map(mileage => new MileageDto(mileage));
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: filterDto, itemCount });
    
    return new PageDto(mileageDtos, pageMetaDto);
  }

  async findOne(userId: string, id: string): Promise<MileageDto> {
    const mileage = await this.mileagesRepository.findOne({
      where: { id, userId },
      relations: ['client'],
    });
    
    if (!mileage) {
      throw new NotFoundException(`Mileage entry with ID "${id}" not found`);
    }
    
    return new MileageDto(mileage);
  }

  async update(userId: string, id: string, updateMileageDto: UpdateMileageDto): Promise<MileageDto> {
    const mileage = await this.mileagesRepository.findOne({
      where: { id, userId },
    });
    
    if (!mileage) {
      throw new NotFoundException(`Mileage entry with ID "${id}" not found`);
    }
    
    // If mileage is already invoiced, don't allow updates
    if (mileage.isInvoiced) {
      throw new NotFoundException(`Cannot update a mileage entry that is already invoiced`);
    }
    
    // Update date if provided
    if (updateMileageDto.date) {
      mileage.date = new Date(updateMileageDto.date);
    }
    
    // Update distance if provided
    if (updateMileageDto.distance !== undefined) {
      mileage.distance = updateMileageDto.distance;
    }
    
    // Update rate if provided
    if (updateMileageDto.ratePerKm !== undefined) {
      mileage.ratePerKm = updateMileageDto.ratePerKm;
    }
    
    // Update other fields
    if (updateMileageDto.description !== undefined) {
      mileage.description = updateMileageDto.description;
    }
    
    if (updateMileageDto.fromLocation !== undefined) {
      mileage.fromLocation = updateMileageDto.fromLocation;
    }
    
    if (updateMileageDto.toLocation !== undefined) {
      mileage.toLocation = updateMileageDto.toLocation;
    }
    
    if (updateMileageDto.clientId !== undefined) {
      // Verify client exists and belongs to user
      await this.clientsService.findOne(userId, updateMileageDto.clientId);
      mileage.clientId = updateMileageDto.clientId;
    }
    
    // Recalculate amount
    mileage.amount = mileage.distance * mileage.ratePerKm;
    
    const updatedMileage = await this.mileagesRepository.save(mileage);
    return new MileageDto(updatedMileage);
  }

  async remove(userId: string, id: string): Promise<void> {
    const mileage = await this.mileagesRepository.findOne({
      where: { id, userId },
    });
    
    if (!mileage) {
      throw new NotFoundException(`Mileage entry with ID "${id}" not found`);
    }
    
    // If mileage is already invoiced, don't allow deletion
    if (mileage.isInvoiced) {
      throw new NotFoundException(`Cannot delete a mileage entry that is already invoiced`);
    }
    
    await this.mileagesRepository.remove(mileage);
  }
}