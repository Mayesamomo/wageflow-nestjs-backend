import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MileagesService } from './mileages.service';
import { CreateMileageDto } from './dto/create-mileage.dto';
import { UpdateMileageDto } from './dto/update-mileage.dto';
import { MileageDto } from './dto/mileage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MileagesFilterDto } from './dto/mileages-filter.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('mileages')
@Controller('mileages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MileagesController {
  constructor(private readonly mileagesService: MileagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new mileage entry' })
  @ApiResponse({ status: 201, description: 'The mileage entry has been successfully created', type: MileageDto })
  create(@Req() req, @Body() createMileageDto: CreateMileageDto): Promise<MileageDto> {
    return this.mileagesService.create(req.user.id, createMileageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all mileage entries with optional filtering' })
  @ApiResponse({ status: 200, description: 'Return all mileage entries', type: PageDto })
  findAll(
    @Req() req,
    @Query() filterDto: MileagesFilterDto,
  ): Promise<PageDto<MileageDto>> {
    return this.mileagesService.findAll(req.user.id, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mileage entry by id' })
  @ApiResponse({ status: 200, description: 'Return the mileage entry', type: MileageDto })
  @ApiResponse({ status: 404, description: 'Mileage entry not found' })
  findOne(@Req() req, @Param('id') id: string): Promise<MileageDto> {
    return this.mileagesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a mileage entry' })
  @ApiResponse({ status: 200, description: 'The mileage entry has been successfully updated', type: MileageDto })
  @ApiResponse({ status: 404, description: 'Mileage entry not found or already invoiced' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateMileageDto: UpdateMileageDto,
  ): Promise<MileageDto> {
    return this.mileagesService.update(req.user.id, id, updateMileageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a mileage entry' })
  @ApiResponse({ status: 200, description: 'The mileage entry has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Mileage entry not found or already invoiced' })
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    return this.mileagesService.remove(req.user.id, id);
  }
}