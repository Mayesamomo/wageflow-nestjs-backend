import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { Client } from '../clients/entities/client.entity';
import { DashboardFilterDto, TimeFrame } from './dto/dashboard-filter.dto';
import { DashboardSummaryDto, ClientSummary, TimePeriodSummary, InvoiceStatusSummary } from './dto/dashboard-summary.dto';
import * as moment from 'moment';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(Mileage)
    private mileagesRepository: Repository<Mileage>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async getDashboardSummary(userId: string, filterDto: DashboardFilterDto): Promise<DashboardSummaryDto> {
    const { timeFrame, clientId, startDate, endDate } = filterDto;
    
    // Determine date range based on time frame
    let dateRange: { startDate: Date; endDate: Date };
    
    if (startDate && endDate) {
      // Custom date range
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    } else {
      // Predefined time frame
      dateRange = this.getDateRangeFromTimeFrame(timeFrame);
    }
    
    // Common conditions for queries
    const dateCondition = {
      startTime: Between(dateRange.startDate, dateRange.endDate),
    };
    
    const mileageDateCondition = {
      date: Between(dateRange.startDate, dateRange.endDate),
    };
    
    const invoiceDateCondition = {
      issueDate: Between(dateRange.startDate, dateRange.endDate),
    };
    
    const userCondition = { userId };
    
    // Add client filter if provided
    const clientCondition = clientId ? { clientId } : {};
    
    // Fetch data
    const shifts = await this.shiftsRepository.find({
      where: { ...userCondition, ...clientCondition, ...dateCondition },
      relations: ['client'],
    });
    
    const mileages = await this.mileagesRepository.find({
      where: { ...userCondition, ...clientCondition, ...mileageDateCondition },
      relations: ['client'],
    });
    
    const invoices = await this.invoicesRepository.find({
      where: { ...userCondition, ...clientCondition, ...invoiceDateCondition },
    });
    
    const clients = clientId 
      ? await this.clientsRepository.find({ where: { id: clientId, userId } })
      : await this.clientsRepository.find({ where: { userId } });
    
    // Calculate summary data
    const totalHours = shifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
    const totalEarnings = shifts.reduce((sum, shift) => sum + Number(shift.earnings), 0);
    const totalHst = shifts.reduce((sum, shift) => sum + Number(shift.hstAmount), 0);
    const totalMileage = mileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0);
    const totalMileageAmount = mileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
    
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0);
    const totalPaid = invoices
      .filter(invoice => invoice.status === InvoiceStatus.PAID)
      .reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0);
    const totalUnpaid = totalInvoiced - totalPaid;
    
    // Client summaries
    const clientSummaries: ClientSummary[] = clients.map(client => {
      const clientShifts = shifts.filter(shift => shift.clientId === client.id);
      const clientMileages = mileages.filter(mileage => mileage.clientId === client.id);
      
      return {
        id: client.id,
        name: client.name,
        totalHours: clientShifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0),
        totalEarnings: clientShifts.reduce((sum, shift) => sum + Number(shift.earnings), 0),
        totalMileage: clientMileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0),
        totalMileageAmount: clientMileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0),
      };
    });
    
    // Period summaries (by day, week, month, or year)
    const periodSummaries = this.calculatePeriodSummaries(shifts, mileages, timeFrame, dateRange);
    
    // Invoice status summaries
    const invoiceStatusSummaries: InvoiceStatusSummary[] = Object.values(InvoiceStatus).map(status => {
      const statusInvoices = invoices.filter(invoice => invoice.status === status);
      return {
        status,
        count: statusInvoices.length,
        total: statusInvoices.reduce((sum, invoice) => sum + Number(invoice.grandTotal), 0),
      };
    });
    
    return {
      totalHours,
      totalEarnings,
      totalHst,
      totalMileage,
      totalMileageAmount,
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      clientSummaries,
      periodSummaries,
      invoiceStatusSummaries,
    };
  }

  private getDateRangeFromTimeFrame(timeFrame: TimeFrame): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;
    
    switch (timeFrame) {
      case TimeFrame.DAY:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate.setHours(23, 59, 59, 999);
        break;
      case TimeFrame.WEEK:
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case TimeFrame.MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case TimeFrame.YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        // Default to month if invalid time frame
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }
    
    return { startDate, endDate };
  }

  private calculatePeriodSummaries(
    shifts: Shift[],
    mileages: Mileage[],
    timeFrame: TimeFrame,
    dateRange: { startDate: Date; endDate: Date },
  ): TimePeriodSummary[] {
    const periodSummaries: TimePeriodSummary[] = [];
    const shiftsByPeriod = new Map<string, Shift[]>();
    const mileagesByPeriod = new Map<string, Mileage[]>();
    
    // Group shifts and mileages by period
    shifts.forEach(shift => {
      const periodKey = this.getPeriodKey(shift.startTime, timeFrame);
      if (!shiftsByPeriod.has(periodKey)) {
        shiftsByPeriod.set(periodKey, []);
      }
      shiftsByPeriod.get(periodKey).push(shift);
    });
    
    mileages.forEach(mileage => {
      const periodKey = this.getPeriodKey(mileage.date, timeFrame);
      if (!mileagesByPeriod.has(periodKey)) {
        mileagesByPeriod.set(periodKey, []);
      }
      mileagesByPeriod.get(periodKey).push(mileage);
    });
    
    // Generate all period keys in the range
    const allPeriods = this.generateAllPeriodKeys(dateRange.startDate, dateRange.endDate, timeFrame);
    
    // Create summaries for each period
    allPeriods.forEach(periodKey => {
      const periodShifts = shiftsByPeriod.get(periodKey) || [];
      const periodMileages = mileagesByPeriod.get(periodKey) || [];
      
      periodSummaries.push({
        period: periodKey,
        totalHours: periodShifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0),
        totalEarnings: periodShifts.reduce((sum, shift) => sum + Number(shift.earnings), 0),
        totalMileage: periodMileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0),
        totalMileageAmount: periodMileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0),
      });
    });
    
    return periodSummaries;
  }

  private getPeriodKey(date: Date, timeFrame: TimeFrame): string {
    const momentDate = moment(date);
    
    switch (timeFrame) {
      case TimeFrame.DAY:
        return momentDate.format('YYYY-MM-DD');
      case TimeFrame.WEEK:
        return `${momentDate.year()}-W${momentDate.isoWeek()}`;
      case TimeFrame.MONTH:
        return momentDate.format('YYYY-MM');
      case TimeFrame.YEAR:
        return momentDate.format('YYYY');
      default:
        return momentDate.format('YYYY-MM-DD');
    }
  }

  private generateAllPeriodKeys(startDate: Date, endDate: Date, timeFrame: TimeFrame): string[] {
    const keys: string[] = [];
    let current = moment(startDate);
    const end = moment(endDate);
    
    while (current.isSameOrBefore(end)) {
      keys.push(this.getPeriodKey(current.toDate(), timeFrame));
      
      switch (timeFrame) {
        case TimeFrame.DAY:
          current.add(1, 'day');
          break;
        case TimeFrame.WEEK:
          current.add(1, 'week');
          break;
        case TimeFrame.MONTH:
          current.add(1, 'month');
          break;
        case TimeFrame.YEAR:
          current.add(1, 'year');
          break;
        default:
          current.add(1, 'day');
      }
    }
    
    return keys;
  }
}