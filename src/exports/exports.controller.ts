import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { ExportDataDto } from './dto/export-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('exports')
@Controller('exports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  @ApiOperation({ summary: 'Export data to PDF or Excel' })
  @ApiResponse({ status: 200, description: 'Returns the exported file' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid export parameters' })
  @ApiResponse({ status: 404, description: 'Not found - No data to export' })
  async exportData(
    @Req() req,
    @Body() exportDataDto: ExportDataDto,
    @Res() res: Response,
  ): Promise<void> {
    const { filepath, filename } = await this.exportsService.exportData(req.user.id, exportDataDto);
    
    res.download(filepath, filename);
  }
}