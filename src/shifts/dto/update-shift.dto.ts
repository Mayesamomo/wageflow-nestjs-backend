import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateShiftDto } from './create-shift.dto';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @ApiProperty({ required: false, description: 'Use current location', default: false })
  @IsOptional()
  @IsBoolean()
  useCurrentLocation?: boolean;
}