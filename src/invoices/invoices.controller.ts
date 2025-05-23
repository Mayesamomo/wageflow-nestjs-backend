import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Patch, 
  Post, 
  Query, 
  Req, 
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceDto } from './dto/invoice.dto';
import { MarkAsPaidDto } from './dto/mark-as-paid.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoicesFilterDto } from './dto/invoices-filter.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'The invoice has been successfully created', type: InvoiceDto })
  create(@Req() req, @Body() createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDto> {
    return this.invoicesService.create(req.user.id, createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices with optional filtering' })
  @ApiResponse({ status: 200, description: 'Return all invoices', type: PageDto })
  findAll(
    @Req() req,
    @Query() filterDto: InvoicesFilterDto,
  ): Promise<PageDto<InvoiceDto>> {
    return this.invoicesService.findAll(req.user.id, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by id' })
  @ApiResponse({ status: 200, description: 'Return the invoice', type: InvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(@Req() req, @Param('id') id: string): Promise<InvoiceDto> {
    return this.invoicesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({ status: 200, description: 'The invoice has been successfully updated', type: InvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceDto> {
    return this.invoicesService.update(req.user.id, id, updateInvoiceDto);
  }

  @Patch(':id/mark-as-paid')
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  @ApiResponse({ status: 200, description: 'The invoice has been marked as paid', type: InvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  markAsPaid(
    @Req() req,
    @Param('id') id: string,
    @Body() markAsPaidDto: MarkAsPaidDto,
  ): Promise<InvoiceDto> {
    return this.invoicesService.markAsPaid(req.user.id, id, markAsPaidDto);
  }

  @Post(':id/payment-proof')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload payment proof' })
  @ApiResponse({ status: 200, description: 'Payment proof uploaded', type: InvoiceDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  uploadPaymentProof(
    @Req() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<InvoiceDto> {
    return this.invoicesService.uploadPaymentProof(req.user.id, id, file);
  }

  @Get(':id/payment-proof')
  @ApiOperation({ summary: 'Get payment proof file' })
  @ApiResponse({ status: 200, description: 'Return the payment proof file' })
  @ApiResponse({ status: 404, description: 'Invoice or payment proof not found' })
  async getPaymentProof(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { path, filename } = await this.invoicesService.getPaymentProof(req.user.id, id);
    res.download(path, filename);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiResponse({ status: 200, description: 'The invoice has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    return this.invoicesService.remove(req.user.id, id);
  }
}