import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftDto } from './dto/shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShiftsFilterDto } from './dto/shifts-filter.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('shifts')
@Controller('shifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiResponse({ status: 201, description: 'The shift has been successfully created', type: ShiftDto })
  create(@Req() req, @Body() createShiftDto: CreateShiftDto): Promise<ShiftDto> {
    return this.shiftsService.create(req.user.id, createShiftDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts with optional filtering' })
  @ApiResponse({ status: 200, description: 'Return all shifts', type: PageDto })
  findAll(
    @Req() req,
    @Query() filterDto: ShiftsFilterDto,
  ): Promise<PageDto<ShiftDto>> {
    return this.shiftsService.findAll(req.user.id, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by id' })
  @ApiResponse({ status: 200, description: 'Return the shift', type: ShiftDto })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  findOne(@Req() req, @Param('id') id: string): Promise<ShiftDto> {
    return this.shiftsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift' })
  @ApiResponse({ status: 200, description: 'The shift has been successfully updated', type: ShiftDto })
  @ApiResponse({ status: 404, description: 'Shift not found or already invoiced' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ): Promise<ShiftDto> {
    return this.shiftsService.update(req.user.id, id, updateShiftDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiResponse({ status: 200, description: 'The shift has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Shift not found or already invoiced' })
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    return this.shiftsService.remove(req.user.id, id);
  }
}