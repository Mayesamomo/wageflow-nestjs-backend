import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkAsPaidDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentNotes?: string;
}