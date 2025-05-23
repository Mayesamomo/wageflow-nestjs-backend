import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum TimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class DashboardFilterDto {
  @ApiPropertyOptional({ enum: TimeFrame, default: TimeFrame.MONTH })
  @IsOptional()
  @IsEnum(TimeFrame)
  timeFrame?: TimeFrame = TimeFrame.MONTH;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Start date for custom time range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for custom time range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}