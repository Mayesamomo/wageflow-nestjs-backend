import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftDto } from './dto/shift.dto';
import { ShiftsFilterDto } from './dto/shifts-filter.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    private clientsService: ClientsService,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createShiftDto: CreateShiftDto): Promise<ShiftDto> {
    // Verify client exists and belongs to user
    const client = await this.clientsService.findOne(userId, createShiftDto.clientId);
    
    const user = await this.usersService.findById(userId);
    
    // Calculate hours
    const startTime = new Date(createShiftDto.startTime);
    const endTime = new Date(createShiftDto.endTime);
    const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Hourly rate is required now
    const hourlyRate = createShiftDto.hourlyRate;
    
    // Calculate earnings and HST (use default HST if not set)
    const hstPercentage = user.hstPercentage || 13;
    const earnings = totalHours * hourlyRate;
    const hstAmount = (earnings * hstPercentage) / 100;
    
    // Location handling
    let location = createShiftDto.location;
    let latitude = null;
    let longitude = null;
    
    // If useCurrentLocation is true, use the client's location
    if (createShiftDto.useCurrentLocation && client) {
      location = client.address || location;
      latitude = client.latitude || null;
      longitude = client.longitude || null;
    }
    
    const shift = this.shiftsRepository.create({
      ...createShiftDto,
      startTime,
      endTime,
      userId,
      hourlyRate,
      totalHours,
      earnings,
      hstAmount,
      location,
      latitude,
      longitude
    });
    
    const savedShift = await this.shiftsRepository.save(shift);
    return new ShiftDto(savedShift);
  }

  async findAll(userId: string, filterDto: ShiftsFilterDto): Promise<PageDto<ShiftDto>> {
    const { clientId, startDate, endDate, isInvoiced, order, take, skip } = filterDto;
    
    const queryBuilder = this.shiftsRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.client', 'client')
      .where('shift.userId = :userId', { userId });
      
    // Apply filters
    if (clientId) {
      queryBuilder.andWhere('shift.clientId = :clientId', { clientId });
    }
    
    if (startDate && endDate) {
      queryBuilder.andWhere('shift.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('shift.startTime >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('shift.endTime <= :endDate', { endDate });
    }
    
    if (isInvoiced !== undefined) {
      queryBuilder.andWhere('shift.isInvoiced = :isInvoiced', { isInvoiced });
    }
    
    // Apply pagination and ordering
    queryBuilder
      .orderBy('shift.startTime', order)
      .skip(skip)
      .take(take);
      
    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    
    const shiftDtos = entities.map(shift => new ShiftDto(shift));
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: filterDto, itemCount });
    
    return new PageDto(shiftDtos, pageMetaDto);
  }

  async findOne(userId: string, id: string): Promise<ShiftDto> {
    const shift = await this.shiftsRepository.findOne({
      where: { id, userId },
      relations: ['client'],
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }
    
    return new ShiftDto(shift);
  }

  async update(userId: string, id: string, updateShiftDto: UpdateShiftDto): Promise<ShiftDto> {
    const shift = await this.shiftsRepository.findOne({
      where: { id, userId },
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }
    
    // If shift is already invoiced, don't allow updates
    if (shift.isInvoiced) {
      throw new NotFoundException(`Cannot update a shift that is already invoiced`);
    }
    
    const user = await this.usersService.findById(userId);
    
    // Calculate new hours if start or end time changed
    if (updateShiftDto.startTime || updateShiftDto.endTime) {
      const startTime = updateShiftDto.startTime ? new Date(updateShiftDto.startTime) : shift.startTime;
      const endTime = updateShiftDto.endTime ? new Date(updateShiftDto.endTime) : shift.endTime;
      shift.startTime = startTime;
      shift.endTime = endTime;
      shift.totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }
    
    // Update hourly rate if provided
    if (updateShiftDto.hourlyRate !== undefined) {
      shift.hourlyRate = updateShiftDto.hourlyRate;
    }
    
    // Update other fields
    if (updateShiftDto.shiftType !== undefined) {
      shift.shiftType = updateShiftDto.shiftType;
    }
    
    if (updateShiftDto.notes !== undefined) {
      shift.notes = updateShiftDto.notes;
    }
    
    // Update location if provided
    if (updateShiftDto.location !== undefined) {
      shift.location = updateShiftDto.location;
    }
    
    // Handle useCurrentLocation if provided
    if (updateShiftDto.useCurrentLocation && updateShiftDto.clientId) {
      const client = await this.clientsService.findOne(userId, updateShiftDto.clientId);
      shift.location = client.address || shift.location;
      shift.latitude = client.latitude || shift.latitude;
      shift.longitude = client.longitude || shift.longitude;
    }
    
    if (updateShiftDto.clientId !== undefined) {
      // Verify client exists and belongs to user
      await this.clientsService.findOne(userId, updateShiftDto.clientId);
      shift.clientId = updateShiftDto.clientId;
    }
    
    // Recalculate earnings and HST
    const hstPercentage = user.hstPercentage || 13;
    shift.earnings = shift.totalHours * shift.hourlyRate;
    shift.hstAmount = (shift.earnings * hstPercentage) / 100;
    
    const updatedShift = await this.shiftsRepository.save(shift);
    return new ShiftDto(updatedShift);
  }

  async remove(userId: string, id: string): Promise<void> {
    const shift = await this.shiftsRepository.findOne({
      where: { id, userId },
    });
    
    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }
    
    // If shift is already invoiced, don't allow deletion
    if (shift.isInvoiced) {
      throw new NotFoundException(`Cannot delete a shift that is already invoiced`);
    }
    
    await this.shiftsRepository.remove(shift);
  }
}