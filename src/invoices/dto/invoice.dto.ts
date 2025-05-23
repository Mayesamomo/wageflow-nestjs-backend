import { ApiProperty } from '@nestjs/swagger';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { ClientDto } from '../../clients/dto/client.dto';
import { ShiftDto } from '../../shifts/dto/shift.dto';
import { MileageDto } from '../../mileages/dto/mileage.dto';

export class InvoiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty({ required: false })
  dueDate: Date;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  hoursTotal: number;

  @ApiProperty()
  earningsTotal: number;

  @ApiProperty()
  mileageTotal: number;

  @ApiProperty()
  hstTotal: number;

  @ApiProperty()
  grandTotal: number;

  @ApiProperty({ required: false })
  notes: string;

  @ApiProperty({ required: false })
  paymentNotes: string;

  @ApiProperty({ required: false })
  paymentProofFilename: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  clientId: string;

  @ApiProperty({ type: ClientDto, required: false })
  client?: ClientDto;

  @ApiProperty({ type: [ShiftDto], required: false })
  shifts?: ShiftDto[];

  @ApiProperty({ type: [MileageDto], required: false })
  mileages?: MileageDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(invoice: Invoice) {
    this.id = invoice.id;
    this.invoiceNumber = invoice.invoiceNumber;
    this.issueDate = invoice.issueDate;
    this.dueDate = invoice.dueDate;
    this.status = invoice.status;
    this.hoursTotal = invoice.hoursTotal;
    this.earningsTotal = invoice.earningsTotal;
    this.mileageTotal = invoice.mileageTotal;
    this.hstTotal = invoice.hstTotal;
    this.grandTotal = invoice.grandTotal;
    this.notes = invoice.notes;
    this.paymentNotes = invoice.paymentNotes;
    this.paymentProofFilename = invoice.paymentProofFilename;
    this.userId = invoice.userId;
    this.clientId = invoice.clientId;
    this.createdAt = invoice.createdAt;
    this.updatedAt = invoice.updatedAt;
    
    if (invoice.client) {
      this.client = new ClientDto(invoice.client);
    }
    
    if (invoice.shifts) {
      this.shifts = invoice.shifts.map(shift => new ShiftDto(shift));
    }
    
    if (invoice.mileages) {
      this.mileages = invoice.mileages.map(mileage => new MileageDto(mileage));
    }
  }
}