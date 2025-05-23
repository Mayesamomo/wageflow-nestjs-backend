import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Client } from '../clients/entities/client.entity';
import { Shift, ShiftType } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(Mileage)
    private mileagesRepository: Repository<Mileage>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting database seeding...');
    
    // Check if database is already seeded
    const usersCount = await this.usersRepository.count();
    if (usersCount > 0) {
      this.logger.log('Database already has data, skipping seed');
      return;
    }

    try {
      // Create test users
      const users = await this.seedUsers();
      
      // Create clients for each user
      const clients = await this.seedClients(users);
      
      // Create shifts for each client
      const shifts = await this.seedShifts(users, clients);
      
      // Create mileage entries for each user
      const mileages = await this.seedMileages(users, clients);
      
      // Create invoices linking shifts and mileages
      await this.seedInvoices(users, clients, shifts, mileages);
      
      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.logger.error(`Error seeding database: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async seedUsers(): Promise<User[]> {
    this.logger.log('Seeding users...');
    
    const password = await bcrypt.hash('password123', 10);
    
    const users = this.usersRepository.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password,
        hourlyRate: 50,
        hstPercentage: 13,
        mileageRate: 0.61,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password,
        hourlyRate: 65,
        hstPercentage: 13,
        mileageRate: 0.65,
      },
    ]);
    
    return this.usersRepository.save(users);
  }

  private async seedClients(users: User[]): Promise<Client[]> {
    this.logger.log('Seeding clients...');
    
    const clients: Client[] = [];
    
    for (const user of users) {
      const userClients = this.clientsRepository.create([
        {
          name: 'Toronto General Hospital',
          contactName: 'Dr. Michael Brown',
          contactEmail: 'mbrown@tgh.ca',
          contactPhone: '416-555-1234',
          address: '200 Elizabeth St, Toronto, ON M5G 2C4',
          latitude: 43.6591,
          longitude: -79.3876,
          notes: 'Main nursing facility',
          userId: user.id,
        },
        {
          name: 'St. Joseph\'s Health Centre',
          contactName: 'Dr. Sarah Johnson',
          contactEmail: 'sjohnson@stjosephs.ca',
          contactPhone: '416-555-2345',
          address: '30 The Queensway, Toronto, ON M6R 1B5',
          latitude: 43.6366,
          longitude: -79.4491,
          notes: 'Specialized unit on 3rd floor',
          userId: user.id,
        },
        {
          name: 'Sunnybrook Health Sciences Centre',
          contactName: 'Dr. Robert Wilson',
          contactEmail: 'rwilson@sunnybrook.ca',
          contactPhone: '416-555-3456',
          address: '2075 Bayview Ave, Toronto, ON M4N 3M5',
          latitude: 43.7228,
          longitude: -79.3759,
          notes: 'Geriatric care unit',
          userId: user.id,
        },
        {
          name: 'Mount Sinai Hospital',
          contactName: 'Dr. Jennifer Lee',
          contactEmail: 'jlee@sinai.ca',
          contactPhone: '416-555-4567',
          address: '600 University Ave, Toronto, ON M5G 1X5',
          latitude: 43.6579,
          longitude: -79.3902,
          notes: 'Pediatric department',
          userId: user.id,
        },
        {
          name: 'Women\'s College Hospital',
          contactName: 'Dr. Emily Chen',
          contactEmail: 'echen@wch.ca',
          contactPhone: '416-555-5678',
          address: '76 Grenville St, Toronto, ON M5S 1B2',
          latitude: 43.6620,
          longitude: -79.3863,
          notes: 'Women\'s health unit',
          userId: user.id,
        },
      ]);
      
      const savedClients = await this.clientsRepository.save(userClients);
      clients.push(...savedClients);
    }
    
    return clients;
  }

  private async seedShifts(users: User[], clients: Client[]): Promise<Shift[]> {
    this.logger.log('Seeding shifts...');
    
    const shifts: Shift[] = [];
    
    for (const user of users) {
      const userClients = clients.filter(client => client.userId === user.id);
      
      for (const client of userClients) {
        // Create 10 shifts for each client with varied data
        for (let i = 0; i < 10; i++) {
          const shiftDate = new Date();
          shiftDate.setDate(shiftDate.getDate() - i * 3); // Spread shifts over time
          
          const startTime = new Date(shiftDate);
          startTime.setHours(9, 0, 0, 0); // 9 AM
          
          const endTime = new Date(shiftDate);
          const hours = 4 + Math.random() * 4; // 4-8 hours
          endTime.setHours(startTime.getHours() + Math.floor(hours), (hours % 1) * 60, 0, 0);
          
          const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          
          // Randomize shift type
          const shiftTypes = [ShiftType.REGULAR, ShiftType.OVERTIME, ShiftType.HOLIDAY];
          const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
          
          // Adjust hourly rate based on shift type
          let hourlyRate = user.hourlyRate;
          if (shiftType === ShiftType.OVERTIME) {
            hourlyRate *= 1.5;
          } else if (shiftType === ShiftType.HOLIDAY) {
            hourlyRate *= 2;
          }
          
          const earnings = totalHours * hourlyRate;
          const hstAmount = (earnings * user.hstPercentage) / 100;
          
          const shift = this.shiftsRepository.create({
            startTime,
            endTime,
            shiftType,
            hourlyRate,
            totalHours,
            earnings,
            hstAmount,
            notes: `Shift ${i + 1} for ${client.name}`,
            userId: user.id,
            clientId: client.id,
          });
          
          shifts.push(shift);
        }
      }
    }
    
    return this.shiftsRepository.save(shifts);
  }

  private async seedMileages(users: User[], clients: Client[]): Promise<Mileage[]> {
    this.logger.log('Seeding mileages...');
    
    const mileages: Mileage[] = [];
    
    for (const user of users) {
      const userClients = clients.filter(client => client.userId === user.id);
      
      for (const client of userClients) {
        // Create 5 mileage entries for each client
        for (let i = 0; i < 5; i++) {
          const mileageDate = new Date();
          mileageDate.setDate(mileageDate.getDate() - i * 5); // Spread mileages over time
          
          const distance = 10 + Math.random() * 40; // 10-50 km
          const amount = distance * user.mileageRate;
          
          const mileage = this.mileagesRepository.create({
            date: mileageDate,
            distance,
            ratePerKm: user.mileageRate,
            amount,
            description: `Travel to ${client.name}`,
            fromLocation: 'Home Office',
            toLocation: client.address,
            userId: user.id,
            clientId: client.id,
          });
          
          mileages.push(mileage);
        }
      }
    }
    
    return this.mileagesRepository.save(mileages);
  }

  private async seedInvoices(
    users: User[],
    clients: Client[],
    shifts: Shift[],
    mileages: Mileage[],
  ): Promise<void> {
    this.logger.log('Seeding invoices...');
    
    const invoices: Invoice[] = [];
    
    for (const user of users) {
      const userClients = clients.filter(client => client.userId === user.id);
      
      for (const client of userClients) {
        // Get shifts and mileages for this client
        const clientShifts = shifts.filter(shift => shift.clientId === client.id);
        const clientMileages = mileages.filter(mileage => mileage.clientId === client.id);
        
        // Create 1-2 invoices per client
        const invoiceCount = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < invoiceCount && clientShifts.length > 0; i++) {
          // Take half the shifts for the first invoice, the rest for the second
          const invoiceShifts = i === 0
            ? clientShifts.slice(0, Math.ceil(clientShifts.length / 2))
            : clientShifts.slice(Math.ceil(clientShifts.length / 2));
            
          // Take half the mileages for the first invoice, the rest for the second
          const invoiceMileages = i === 0
            ? clientMileages.slice(0, Math.ceil(clientMileages.length / 2))
            : clientMileages.slice(Math.ceil(clientMileages.length / 2));
          
          if (invoiceShifts.length === 0) {
            continue; // Skip if no shifts to include
          }
          
          // Calculate totals
          const hoursTotal = invoiceShifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
          const earningsTotal = invoiceShifts.reduce((sum, shift) => sum + Number(shift.earnings), 0);
          const hstTotal = invoiceShifts.reduce((sum, shift) => sum + Number(shift.hstAmount), 0);
          const mileageTotal = invoiceMileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
          const grandTotal = earningsTotal + hstTotal + mileageTotal;
          
          // Generate invoice number
          const invoiceNumber = `INV-${user.id.substring(0, 4)}-${(i + 1).toString().padStart(4, '0')}`;
          
          // Set dates
          const issueDate = new Date();
          issueDate.setDate(issueDate.getDate() - i * 15); // Spread invoices over time
          
          const dueDate = new Date(issueDate);
          dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
          
          // Randomly set status
          const statuses = [
            InvoiceStatus.DRAFT,
            InvoiceStatus.SENT,
            InvoiceStatus.PAID,
            InvoiceStatus.OVERDUE,
          ];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          const invoice = this.invoicesRepository.create({
            invoiceNumber,
            issueDate,
            dueDate,
            status,
            hoursTotal,
            earningsTotal,
            mileageTotal,
            hstTotal,
            grandTotal,
            notes: `Invoice for services provided to ${client.name}`,
            userId: user.id,
            clientId: client.id,
            shifts: invoiceShifts,
            mileages: invoiceMileages,
          });
          
          invoices.push(invoice);
          
          // Mark shifts and mileages as invoiced
          for (const shift of invoiceShifts) {
            shift.isInvoiced = true;
          }
          
          for (const mileage of invoiceMileages) {
            mileage.isInvoiced = true;
          }
        }
      }
    }
    
    // Save invoices
    await this.invoicesRepository.save(invoices);
    
    // Update shifts and mileages
    await this.shiftsRepository.save(shifts);
    await this.mileagesRepository.save(mileages);
  }
}