import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceDto } from './dto/invoice.dto';
import { InvoicesFilterDto } from './dto/invoices-filter.dto';
import { MarkAsPaidDto } from './dto/mark-as-paid.dto';
import { PageDto } from '../common/dto/page.dto';
import { PageMetaDto } from '../common/dto/page-meta.dto';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(Mileage)
    private mileagesRepository: Repository<Mileage>,
    private clientsService: ClientsService,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDto> {
    // Verify client exists and belongs to user
    await this.clientsService.findOne(userId, createInvoiceDto.clientId);
    
    // Verify shifts exist, belong to user, and are not already invoiced
    const shifts = await this.shiftsRepository.find({
      where: {
        id: In(createInvoiceDto.shiftIds),
        userId,
        isInvoiced: false,
      },
    });
    
    if (shifts.length !== createInvoiceDto.shiftIds.length) {
      throw new BadRequestException('Some shifts were not found, don\'t belong to you, or are already invoiced');
    }
    
    // Verify mileages exist, belong to user, and are not already invoiced
    const mileages = await this.mileagesRepository.find({
      where: {
        id: In(createInvoiceDto.mileageIds),
        userId,
        isInvoiced: false,
      },
    });
    
    if (mileages.length !== createInvoiceDto.mileageIds.length) {
      throw new BadRequestException('Some mileage entries were not found, don\'t belong to you, or are already invoiced');
    }
    
    // Generate invoice number
    const invoiceCount = await this.invoicesRepository.count({ where: { userId } });
    const invoiceNumber = `INV-${userId.substring(0, 4)}-${(invoiceCount + 1).toString().padStart(4, '0')}`;
    
    // Calculate totals
    let hoursTotal = 0;
    let earningsTotal = 0;
    let hstTotal = 0;
    let mileageTotal = 0;
    
    shifts.forEach((shift) => {
      hoursTotal += Number(shift.totalHours);
      earningsTotal += Number(shift.earnings);
      hstTotal += Number(shift.hstAmount);
    });
    
    mileages.forEach((mileage) => {
      mileageTotal += Number(mileage.amount);
    });
    
    const grandTotal = earningsTotal + hstTotal + mileageTotal;
    
    // Set dates
    const issueDate = createInvoiceDto.issueDate ? new Date(createInvoiceDto.issueDate) : new Date();
    const dueDate = createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default: 30 days from issue date
    
    // Create invoice
    const invoice = this.invoicesRepository.create({
      invoiceNumber,
      issueDate,
      dueDate,
      userId,
      clientId: createInvoiceDto.clientId,
      hoursTotal,
      earningsTotal,
      mileageTotal,
      hstTotal,
      grandTotal,
      notes: createInvoiceDto.notes,
      status: InvoiceStatus.DRAFT,
      shifts,
      mileages,
    });
    
    const savedInvoice = await this.invoicesRepository.save(invoice);
    
    // Mark shifts and mileages as invoiced
    await this.shiftsRepository.update(
      { id: In(createInvoiceDto.shiftIds) }, 
      { isInvoiced: true }
    );
    
    await this.mileagesRepository.update(
      { id: In(createInvoiceDto.mileageIds) }, 
      { isInvoiced: true }
    );
    
    return this.findOne(userId, savedInvoice.id);
  }

  async findAll(userId: string, filterDto: InvoicesFilterDto): Promise<PageDto<InvoiceDto>> {
    const { clientId, status, startDate, endDate, order, take, skip } = filterDto;
    
    const queryBuilder = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.userId = :userId', { userId });
      
    // Apply filters
    if (clientId) {
      queryBuilder.andWhere('invoice.clientId = :clientId', { clientId });
    }
    
    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }
    
    if (startDate && endDate) {
      queryBuilder.andWhere('invoice.issueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('invoice.issueDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('invoice.issueDate <= :endDate', { endDate });
    }
    
    // Apply pagination and ordering
    queryBuilder
      .orderBy('invoice.issueDate', order)
      .skip(skip)
      .take(take);
      
    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    
    const invoiceDtos = entities.map(invoice => new InvoiceDto(invoice));
    const pageMetaDto = new PageMetaDto({ pageOptionsDto: filterDto, itemCount });
    
    return new PageDto(invoiceDtos, pageMetaDto);
  }

  async findOne(userId: string, id: string): Promise<InvoiceDto> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
      relations: ['client', 'shifts', 'mileages'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    return new InvoiceDto(invoice);
  }

  async update(userId: string, id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<InvoiceDto> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
      relations: ['shifts', 'mileages'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    // Don't allow editing if invoice is paid
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot edit a paid invoice');
    }
    
    // Update dates if provided
    if (updateInvoiceDto.issueDate) {
      invoice.issueDate = new Date(updateInvoiceDto.issueDate);
    }
    
    if (updateInvoiceDto.dueDate) {
      invoice.dueDate = new Date(updateInvoiceDto.dueDate);
    }
    
    // Update status if provided
    if (updateInvoiceDto.status) {
      invoice.status = updateInvoiceDto.status;
    }
    
    // Update notes if provided
    if (updateInvoiceDto.notes !== undefined) {
      invoice.notes = updateInvoiceDto.notes;
    }
    
    if (updateInvoiceDto.paymentNotes !== undefined) {
      invoice.paymentNotes = updateInvoiceDto.paymentNotes;
    }
    
    // Update included shifts and mileages if provided
    if (updateInvoiceDto.shiftIds || updateInvoiceDto.mileageIds) {
      // Get current shifts and mileages
      const currentShiftIds = invoice.shifts.map(shift => shift.id);
      const currentMileageIds = invoice.mileages.map(mileage => mileage.id);
      
      // Determine shifts and mileages to add and remove
      const newShiftIds = updateInvoiceDto.shiftIds || currentShiftIds;
      const newMileageIds = updateInvoiceDto.mileageIds || currentMileageIds;
      
      const shiftsToAdd = newShiftIds.filter(id => !currentShiftIds.includes(id));
      const shiftsToRemove = currentShiftIds.filter(id => !newShiftIds.includes(id));
      
      const mileagesToAdd = newMileageIds.filter(id => !currentMileageIds.includes(id));
      const mileagesToRemove = currentMileageIds.filter(id => !newMileageIds.includes(id));
      
      // Verify new shifts exist, belong to user, and are not already invoiced
      if (shiftsToAdd.length > 0) {
        const shifts = await this.shiftsRepository.find({
          where: {
            id: In(shiftsToAdd),
            userId,
            isInvoiced: false,
          },
        });
        
        if (shifts.length !== shiftsToAdd.length) {
          throw new BadRequestException('Some new shifts were not found, don\'t belong to you, or are already invoiced');
        }
      }
      
      // Verify new mileages exist, belong to user, and are not already invoiced
      if (mileagesToAdd.length > 0) {
        const mileages = await this.mileagesRepository.find({
          where: {
            id: In(mileagesToAdd),
            userId,
            isInvoiced: false,
          },
        });
        
        if (mileages.length !== mileagesToAdd.length) {
          throw new BadRequestException('Some new mileage entries were not found, don\'t belong to you, or are already invoiced');
        }
      }
      
      // Update shifts
      if (shiftsToRemove.length > 0) {
        await this.shiftsRepository.update(
          { id: In(shiftsToRemove) }, 
          { isInvoiced: false }
        );
      }
      
      if (shiftsToAdd.length > 0) {
        await this.shiftsRepository.update(
          { id: In(shiftsToAdd) }, 
          { isInvoiced: true }
        );
      }
      
      // Update mileages
      if (mileagesToRemove.length > 0) {
        await this.mileagesRepository.update(
          { id: In(mileagesToRemove) }, 
          { isInvoiced: false }
        );
      }
      
      if (mileagesToAdd.length > 0) {
        await this.mileagesRepository.update(
          { id: In(mileagesToAdd) }, 
          { isInvoiced: true }
        );
      }
      
      // Get updated shifts and mileages
      const shifts = await this.shiftsRepository.find({
        where: {
          id: In(newShiftIds),
        },
      });
      
      const mileages = await this.mileagesRepository.find({
        where: {
          id: In(newMileageIds),
        },
      });
      
      // Calculate totals
      let hoursTotal = 0;
      let earningsTotal = 0;
      let hstTotal = 0;
      let mileageTotal = 0;
      
      shifts.forEach((shift) => {
        hoursTotal += Number(shift.totalHours);
        earningsTotal += Number(shift.earnings);
        hstTotal += Number(shift.hstAmount);
      });
      
      mileages.forEach((mileage) => {
        mileageTotal += Number(mileage.amount);
      });
      
      const grandTotal = earningsTotal + hstTotal + mileageTotal;
      
      // Update invoice with new totals and relations
      invoice.shifts = shifts;
      invoice.mileages = mileages;
      invoice.hoursTotal = hoursTotal;
      invoice.earningsTotal = earningsTotal;
      invoice.mileageTotal = mileageTotal;
      invoice.hstTotal = hstTotal;
      invoice.grandTotal = grandTotal;
    }
    
    const updatedInvoice = await this.invoicesRepository.save(invoice);
    return this.findOne(userId, updatedInvoice.id);
  }

  async markAsPaid(userId: string, id: string, markAsPaidDto: MarkAsPaidDto): Promise<InvoiceDto> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    invoice.status = InvoiceStatus.PAID;
    
    if (markAsPaidDto.paymentNotes !== undefined) {
      invoice.paymentNotes = markAsPaidDto.paymentNotes;
    }
    
    const updatedInvoice = await this.invoicesRepository.save(invoice);
    return new InvoiceDto(updatedInvoice);
  }

  async uploadPaymentProof(userId: string, id: string, file: Express.Multer.File): Promise<InvoiceDto> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', userId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${invoice.id}_payment_proof${fileExt}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Delete old file if it exists
    if (invoice.paymentProofFilename) {
      const oldFilePath = path.join(uploadsDir, invoice.paymentProofFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    // Write new file
    fs.writeFileSync(filePath, file.buffer);
    
    // Update invoice
    invoice.paymentProofFilename = fileName;
    if (invoice.status !== InvoiceStatus.PAID) {
      invoice.status = InvoiceStatus.PAID;
    }
    
    const updatedInvoice = await this.invoicesRepository.save(invoice);
    return new InvoiceDto(updatedInvoice);
  }

  async getPaymentProof(userId: string, id: string): Promise<{ path: string; filename: string }> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    if (!invoice.paymentProofFilename) {
      throw new NotFoundException('No payment proof found for this invoice');
    }
    
    const filePath = path.join(process.cwd(), 'uploads', userId, invoice.paymentProofFilename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Payment proof file not found');
    }
    
    return {
      path: filePath,
      filename: invoice.paymentProofFilename,
    };
  }
  
  async remove(userId: string, id: string): Promise<void> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, userId },
      relations: ['shifts', 'mileages'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }
    
    // Don't allow deletion if invoice is sent or paid
    if (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete an invoice that has been sent or paid');
    }
    
    // Get shift and mileage IDs to update
    const shiftIds = invoice.shifts.map(shift => shift.id);
    const mileageIds = invoice.mileages.map(mileage => mileage.id);
    
    // Update shifts and mileages to not be invoiced
    if (shiftIds.length > 0) {
      await this.shiftsRepository.update(
        { id: In(shiftIds) }, 
        { isInvoiced: false }
      );
    }
    
    if (mileageIds.length > 0) {
      await this.mileagesRepository.update(
        { id: In(mileageIds) }, 
        { isInvoiced: false }
      );
    }
    
    // Delete payment proof file if it exists
    if (invoice.paymentProofFilename) {
      const filePath = path.join(process.cwd(), 'uploads', userId, invoice.paymentProofFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await this.invoicesRepository.remove(invoice);
  }
}