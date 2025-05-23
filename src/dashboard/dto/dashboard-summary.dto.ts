import { ApiProperty } from '@nestjs/swagger';

export class ClientSummary {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  totalMileage: number;

  @ApiProperty()
  totalMileageAmount: number;
}

export class TimePeriodSummary {
  @ApiProperty()
  period: string;

  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  totalMileage: number;

  @ApiProperty()
  totalMileageAmount: number;
}

export class InvoiceStatusSummary {
  @ApiProperty()
  status: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  total: number;
}

export class DashboardSummaryDto {
  @ApiProperty()
  totalHours: number;

  @ApiProperty()
  totalEarnings: number;

  @ApiProperty()
  totalHst: number;

  @ApiProperty()
  totalMileage: number;

  @ApiProperty()
  totalMileageAmount: number;

  @ApiProperty()
  totalInvoiced: number;

  @ApiProperty()
  totalPaid: number;

  @ApiProperty()
  totalUnpaid: number;

  @ApiProperty({ type: [ClientSummary] })
  clientSummaries: ClientSummary[];

  @ApiProperty({ type: [TimePeriodSummary] })
  periodSummaries: TimePeriodSummary[];

  @ApiProperty({ type: [InvoiceStatusSummary] })
  invoiceStatusSummaries: InvoiceStatusSummary[];
}