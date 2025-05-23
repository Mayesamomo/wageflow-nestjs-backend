import { PartialType } from '@nestjs/swagger';
import { CreateMileageDto } from './create-mileage.dto';

export class UpdateMileageDto extends PartialType(CreateMileageDto) {}