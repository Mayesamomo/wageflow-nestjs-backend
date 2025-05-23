import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { Shift } from '../shifts/entities/shift.entity';
import { Mileage } from '../mileages/entities/mileage.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { ExportDataDto, ExportType, ExportDataType } from './dto/export-data.dto';

@Injectable()
export class ExportsService {
  constructor(
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(Mileage)
    private mileagesRepository: Repository<Mileage>,
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async exportData(userId: string, exportDataDto: ExportDataDto): Promise<{ filepath: string; filename: string }> {
    const { exportType, dataType } = exportDataDto;
    
    // Create export directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'exports', userId);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExt = exportType === ExportType.PDF ? 'pdf' : 'xlsx';
    const filename = `${dataType}_${timestamp}.${fileExt}`;
    const filepath = path.join(exportsDir, filename);
    
    // Export data based on type
    switch (dataType) {
      case ExportDataType.SHIFTS:
        await this.exportShifts(userId, exportType, exportDataDto, filepath);
        break;
      case ExportDataType.MILEAGES:
        await this.exportMileages(userId, exportType, exportDataDto, filepath);
        break;
      case ExportDataType.INVOICE:
        await this.exportInvoice(userId, exportType, exportDataDto, filepath);
        break;
      case ExportDataType.EARNINGS_SUMMARY:
        await this.exportEarningsSummary(userId, exportType, exportDataDto, filepath);
        break;
      default:
        throw new BadRequestException(`Unsupported data type: ${dataType}`);
    }
    
    return { filepath, filename };
  }

  private async exportShifts(
    userId: string,
    exportType: ExportType,
    exportDataDto: ExportDataDto,
    filepath: string,
  ): Promise<void> {
    const { clientId, startDate, endDate, ids } = exportDataDto;
    
    // Build query conditions
    const conditions: any = { userId };
    
    if (clientId) {
      conditions.clientId = clientId;
    }
    
    if (startDate && endDate) {
      conditions.startTime = Between(new Date(startDate), new Date(endDate));
    }
    
    if (ids && ids.length > 0) {
      conditions.id = In(ids);
    }
    
    // Get shifts
    const shifts = await this.shiftsRepository.find({
      where: conditions,
      relations: ['client'],
      order: { startTime: 'ASC' },
    });
    
    if (shifts.length === 0) {
      throw new NotFoundException('No shifts found with the specified criteria');
    }
    
    // Get user for header information
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    // Export based on type
    if (exportType === ExportType.PDF) {
      await this.generateShiftsPdf(shifts, user, filepath);
    } else {
      await this.generateShiftsExcel(shifts, user, filepath);
    }
  }

  private async exportMileages(
    userId: string,
    exportType: ExportType,
    exportDataDto: ExportDataDto,
    filepath: string,
  ): Promise<void> {
    const { clientId, startDate, endDate, ids } = exportDataDto;
    
    // Build query conditions
    const conditions: any = { userId };
    
    if (clientId) {
      conditions.clientId = clientId;
    }
    
    if (startDate && endDate) {
      conditions.date = Between(new Date(startDate), new Date(endDate));
    }
    
    if (ids && ids.length > 0) {
      conditions.id = In(ids);
    }
    
    // Get mileages
    const mileages = await this.mileagesRepository.find({
      where: conditions,
      relations: ['client'],
      order: { date: 'ASC' },
    });
    
    if (mileages.length === 0) {
      throw new NotFoundException('No mileage entries found with the specified criteria');
    }
    
    // Get user for header information
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    // Export based on type
    if (exportType === ExportType.PDF) {
      await this.generateMileagesPdf(mileages, user, filepath);
    } else {
      await this.generateMileagesExcel(mileages, user, filepath);
    }
  }

  private async exportInvoice(
    userId: string,
    exportType: ExportType,
    exportDataDto: ExportDataDto,
    filepath: string,
  ): Promise<void> {
    const { invoiceId } = exportDataDto;
    
    if (!invoiceId) {
      throw new BadRequestException('Invoice ID is required for invoice export');
    }
    
    // Get invoice
    const invoice = await this.invoicesRepository.findOne({
      where: { id: invoiceId, userId },
      relations: ['client', 'shifts', 'mileages'],
    });
    
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${invoiceId}" not found`);
    }
    
    // Get user for header information
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    // Export based on type
    if (exportType === ExportType.PDF) {
      await this.generateInvoicePdf(invoice, user, filepath);
    } else {
      await this.generateInvoiceExcel(invoice, user, filepath);
    }
  }

  private async exportEarningsSummary(
    userId: string,
    exportType: ExportType,
    exportDataDto: ExportDataDto,
    filepath: string,
  ): Promise<void> {
    const { startDate, endDate, clientId } = exportDataDto;
    
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required for earnings summary export');
    }
    
    // Build query conditions for shifts
    const shiftConditions: any = {
      userId,
      startTime: Between(new Date(startDate), new Date(endDate)),
    };
    
    // Build query conditions for mileages
    const mileageConditions: any = {
      userId,
      date: Between(new Date(startDate), new Date(endDate)),
    };
    
    // Add client filter if provided
    if (clientId) {
      shiftConditions.clientId = clientId;
      mileageConditions.clientId = clientId;
    }
    
    // Get shifts, mileages, and clients
    const [shifts, mileages, clients] = await Promise.all([
      this.shiftsRepository.find({
        where: shiftConditions,
        relations: ['client'],
      }),
      this.mileagesRepository.find({
        where: mileageConditions,
        relations: ['client'],
      }),
      clientId 
        ? this.clientsRepository.find({ where: { id: clientId, userId } })
        : this.clientsRepository.find({ where: { userId } }),
    ]);
    
    // Get user for header information
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    // Export based on type
    if (exportType === ExportType.PDF) {
      await this.generateEarningsSummaryPdf(shifts, mileages, clients, user, startDate, endDate, filepath);
    } else {
      await this.generateEarningsSummaryExcel(shifts, mileages, clients, user, startDate, endDate, filepath);
    }
  }

  private async generateShiftsPdf(shifts: Shift[], user: User, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      
      stream.on('error', reject);
      stream.on('finish', resolve);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('Shifts Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`${user.firstName} ${user.lastName}`, { align: 'center' });
      doc.fontSize(10).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Table Header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 150;
      const col3 = 250;
      const col4 = 300;
      const col5 = 370;
      const col6 = 450;
      
      doc.fontSize(10)
        .text('Date', col1, tableTop, { width: 80 })
        .text('Client', col2, tableTop, { width: 100 })
        .text('Hours', col3, tableTop, { width: 50 })
        .text('Rate', col4, tableTop, { width: 70 })
        .text('Earnings', col5, tableTop, { width: 80 })
        .text('HST', col6, tableTop, { width: 80 });
      
      doc.moveDown();
      let rowY = doc.y;
      
      // Table rows
      shifts.forEach((shift, i) => {
        // Add a new page if needed
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          rowY = 50;
        }
        
        const startDate = new Date(shift.startTime).toLocaleDateString();
        const clientName = shift.client ? shift.client.name : 'Unknown Client';
        
        doc.fontSize(10)
          .text(startDate, col1, rowY, { width: 80 })
          .text(clientName, col2, rowY, { width: 100 })
          .text(shift.totalHours.toString(), col3, rowY, { width: 50 })
          .text(`$${shift.hourlyRate.toFixed(2)}`, col4, rowY, { width: 70 })
          .text(`$${shift.earnings.toFixed(2)}`, col5, rowY, { width: 80 })
          .text(`$${shift.hstAmount.toFixed(2)}`, col6, rowY, { width: 80 });
        
        rowY = doc.y + 10;
      });
      
      // Add summary
      doc.moveDown(2);
      const totalHours = shifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
      const totalEarnings = shifts.reduce((sum, shift) => sum + Number(shift.earnings), 0);
      const totalHst = shifts.reduce((sum, shift) => sum + Number(shift.hstAmount), 0);
      
      doc.fontSize(10)
        .text(`Total Hours: ${totalHours.toFixed(2)}`, { align: 'right' })
        .text(`Total Earnings: $${totalEarnings.toFixed(2)}`, { align: 'right' })
        .text(`Total HST: $${totalHst.toFixed(2)}`, { align: 'right' })
        .text(`Grand Total: $${(totalEarnings + totalHst).toFixed(2)}`, { align: 'right' });
      
      doc.end();
    });
  }

  private async generateShiftsExcel(shifts: Shift[], user: User, filepath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Shifts');
    
    // Header
    worksheet.mergeCells('A1:G1');
    worksheet.mergeCells('A2:G2');
    worksheet.mergeCells('A3:G3');
    
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'Shifts Report';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    
    const nameRow = worksheet.getCell('A2');
    nameRow.value = `${user.firstName} ${user.lastName}`;
    nameRow.font = { size: 12 };
    nameRow.alignment = { horizontal: 'center' };
    
    const dateRow = worksheet.getCell('A3');
    dateRow.value = `Generated on ${new Date().toLocaleDateString()}`;
    dateRow.font = { size: 10 };
    dateRow.alignment = { horizontal: 'center' };
    
    // Table Header
    worksheet.addRow([]);
    worksheet.addRow(['Date', 'Start Time', 'End Time', 'Client', 'Hours', 'Rate', 'Earnings', 'HST']);
    
    // Style header row
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // Add data rows
    shifts.forEach((shift) => {
      const startDate = new Date(shift.startTime).toLocaleDateString();
      const startTime = new Date(shift.startTime).toLocaleTimeString();
      const endTime = new Date(shift.endTime).toLocaleTimeString();
      const clientName = shift.client ? shift.client.name : 'Unknown Client';
      
      worksheet.addRow([
        startDate,
        startTime,
        endTime,
        clientName,
        Number(shift.totalHours),
        Number(shift.hourlyRate),
        Number(shift.earnings),
        Number(shift.hstAmount),
      ]);
    });
    
    // Format number columns
    worksheet.getColumn(5).numFmt = '0.00';
    worksheet.getColumn(6).numFmt = '"$"#,##0.00';
    worksheet.getColumn(7).numFmt = '"$"#,##0.00';
    worksheet.getColumn(8).numFmt = '"$"#,##0.00';
    
    // Add summary
    const totalRow = worksheet.getRow(shifts.length + 6);
    totalRow.getCell(4).value = 'TOTAL:';
    totalRow.getCell(4).font = { bold: true };
    
    totalRow.getCell(5).value = {
      formula: `SUM(E6:E${shifts.length + 5})`,
      date1904: false,
    };
    
    totalRow.getCell(7).value = {
      formula: `SUM(G6:G${shifts.length + 5})`,
      date1904: false,
    };
    
    totalRow.getCell(8).value = {
      formula: `SUM(H6:H${shifts.length + 5})`,
      date1904: false,
    };
    
    // Grand total
    worksheet.addRow([]);
    const grandTotalRow = worksheet.getRow(shifts.length + 8);
    grandTotalRow.getCell(7).value = 'GRAND TOTAL:';
    grandTotalRow.getCell(7).font = { bold: true };
    
    grandTotalRow.getCell(8).value = {
      formula: `G${shifts.length + 6}+H${shifts.length + 6}`,
      date1904: false,
    };
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(filepath);
  }

  private async generateMileagesPdf(mileages: Mileage[], user: User, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      
      stream.on('error', reject);
      stream.on('finish', resolve);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('Mileage Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`${user.firstName} ${user.lastName}`, { align: 'center' });
      doc.fontSize(10).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Table Header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 150;
      const col3 = 250;
      const col4 = 330;
      const col5 = 400;
      
      doc.fontSize(10)
        .text('Date', col1, tableTop, { width: 80 })
        .text('Client', col2, tableTop, { width: 100 })
        .text('Distance (km)', col3, tableTop, { width: 80 })
        .text('Rate', col4, tableTop, { width: 70 })
        .text('Amount', col5, tableTop, { width: 80 });
      
      doc.moveDown();
      let rowY = doc.y;
      
      // Table rows
      mileages.forEach((mileage) => {
        // Add a new page if needed
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          rowY = 50;
        }
        
        const date = new Date(mileage.date).toLocaleDateString();
        const clientName = mileage.client ? mileage.client.name : 'Unknown Client';
        
        doc.fontSize(10)
          .text(date, col1, rowY, { width: 80 })
          .text(clientName, col2, rowY, { width: 100 })
          .text(mileage.distance.toString(), col3, rowY, { width: 80 })
          .text(`$${mileage.ratePerKm.toFixed(2)}`, col4, rowY, { width: 70 })
          .text(`$${mileage.amount.toFixed(2)}`, col5, rowY, { width: 80 });
        
        rowY = doc.y + 10;
      });
      
      // Add summary
      doc.moveDown(2);
      const totalDistance = mileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0);
      const totalAmount = mileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
      
      doc.fontSize(10)
        .text(`Total Distance: ${totalDistance.toFixed(2)} km`, { align: 'right' })
        .text(`Total Amount: $${totalAmount.toFixed(2)}`, { align: 'right' });
      
      doc.end();
    });
  }

  private async generateMileagesExcel(mileages: Mileage[], user: User, filepath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mileages');
    
    // Header
    worksheet.mergeCells('A1:F1');
    worksheet.mergeCells('A2:F2');
    worksheet.mergeCells('A3:F3');
    
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'Mileage Report';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    
    const nameRow = worksheet.getCell('A2');
    nameRow.value = `${user.firstName} ${user.lastName}`;
    nameRow.font = { size: 12 };
    nameRow.alignment = { horizontal: 'center' };
    
    const dateRow = worksheet.getCell('A3');
    dateRow.value = `Generated on ${new Date().toLocaleDateString()}`;
    dateRow.font = { size: 10 };
    dateRow.alignment = { horizontal: 'center' };
    
    // Table Header
    worksheet.addRow([]);
    worksheet.addRow(['Date', 'Client', 'From', 'To', 'Distance (km)', 'Rate', 'Amount']);
    
    // Style header row
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // Add data rows
    mileages.forEach((mileage) => {
      const date = new Date(mileage.date).toLocaleDateString();
      const clientName = mileage.client ? mileage.client.name : 'Unknown Client';
      
      worksheet.addRow([
        date,
        clientName,
        mileage.fromLocation || '',
        mileage.toLocation || '',
        Number(mileage.distance),
        Number(mileage.ratePerKm),
        Number(mileage.amount),
      ]);
    });
    
    // Format number columns
    worksheet.getColumn(5).numFmt = '0.00';
    worksheet.getColumn(6).numFmt = '"$"#,##0.00';
    worksheet.getColumn(7).numFmt = '"$"#,##0.00';
    
    // Add summary
    const totalRow = worksheet.getRow(mileages.length + 6);
    totalRow.getCell(4).value = 'TOTAL:';
    totalRow.getCell(4).font = { bold: true };
    
    totalRow.getCell(5).value = {
      formula: `SUM(E6:E${mileages.length + 5})`,
      date1904: false,
    };
    
    totalRow.getCell(7).value = {
      formula: `SUM(G6:G${mileages.length + 5})`,
      date1904: false,
    };
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(filepath);
  }

  private async generateInvoicePdf(invoice: Invoice, user: User, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      
      stream.on('error', reject);
      stream.on('finish', resolve);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(24).text('INVOICE', { align: 'right' });
      doc.fontSize(12).text(invoice.invoiceNumber, { align: 'right' });
      doc.moveDown();
      
      // From (User)
      doc.fontSize(14).text('From:', { continued: true })
        .fontSize(12).text(` ${user.firstName} ${user.lastName}`);
      doc.fontSize(10).text(`Email: ${user.email}`);
      doc.moveDown();
      
      // To (Client)
      const client = invoice.client;
      doc.fontSize(14).text('To:', { continued: true })
        .fontSize(12).text(` ${client.name}`);
      
      if (client.contactName) {
        doc.fontSize(10).text(`Attention: ${client.contactName}`);
      }
      
      if (client.address) {
        doc.fontSize(10).text(client.address);
      }
      
      if (client.contactEmail) {
        doc.fontSize(10).text(`Email: ${client.contactEmail}`);
      }
      
      // Invoice Details
      doc.moveDown(2);
      doc.fontSize(12).text('Invoice Details:');
      doc.fontSize(10)
        .text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`)
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      
      if (invoice.notes) {
        doc.moveDown()
          .fontSize(10)
          .text('Notes:')
          .text(invoice.notes);
      }
      
      // Shifts Section
      if (invoice.shifts && invoice.shifts.length > 0) {
        doc.moveDown(2);
        doc.fontSize(12).text('Shifts:');
        doc.moveDown();
        
        // Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 250;
        const col4 = 350;
        const col5 = 450;
        
        doc.fontSize(10)
          .text('Date', col1, tableTop, { width: 100 })
          .text('Hours', col2, tableTop, { width: 100 })
          .text('Rate', col3, tableTop, { width: 100 })
          .text('Amount', col4, tableTop, { width: 100 })
          .text('HST', col5, tableTop, { width: 100 });
        
        doc.moveDown();
        let rowY = doc.y;
        
        // Table rows
        invoice.shifts.forEach((shift) => {
          // Add a new page if needed
          if (rowY > doc.page.height - 100) {
            doc.addPage();
            rowY = 50;
          }
          
          const date = new Date(shift.startTime).toLocaleDateString();
          
          doc.fontSize(10)
            .text(date, col1, rowY, { width: 100 })
            .text(shift.totalHours.toString(), col2, rowY, { width: 100 })
            .text(`$${shift.hourlyRate.toFixed(2)}`, col3, rowY, { width: 100 })
            .text(`$${shift.earnings.toFixed(2)}`, col4, rowY, { width: 100 })
            .text(`$${shift.hstAmount.toFixed(2)}`, col5, rowY, { width: 100 });
          
          rowY = doc.y + 10;
        });
      }
      
      // Mileages Section
      if (invoice.mileages && invoice.mileages.length > 0) {
        doc.moveDown(2);
        doc.fontSize(12).text('Mileage:');
        doc.moveDown();
        
        // Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 250;
        const col4 = 350;
        
        doc.fontSize(10)
          .text('Date', col1, tableTop, { width: 100 })
          .text('Distance (km)', col2, tableTop, { width: 100 })
          .text('Rate', col3, tableTop, { width: 100 })
          .text('Amount', col4, tableTop, { width: 100 });
        
        doc.moveDown();
        let rowY = doc.y;
        
        // Table rows
        invoice.mileages.forEach((mileage) => {
          // Add a new page if needed
          if (rowY > doc.page.height - 100) {
            doc.addPage();
            rowY = 50;
          }
          
          const date = new Date(mileage.date).toLocaleDateString();
          
          doc.fontSize(10)
            .text(date, col1, rowY, { width: 100 })
            .text(mileage.distance.toString(), col2, rowY, { width: 100 })
            .text(`$${mileage.ratePerKm.toFixed(2)}`, col3, rowY, { width: 100 })
            .text(`$${mileage.amount.toFixed(2)}`, col4, rowY, { width: 100 });
          
          rowY = doc.y + 10;
        });
      }
      
      // Summary
      doc.moveDown(2);
      doc.fontSize(12).text('Summary:');
      doc.moveDown();
      
      doc.fontSize(10)
        .text(`Hours Total: ${invoice.hoursTotal.toFixed(2)} hours`, { align: 'right' })
        .text(`Earnings Total: $${invoice.earningsTotal.toFixed(2)}`, { align: 'right' })
        .text(`Mileage Total: $${invoice.mileageTotal.toFixed(2)}`, { align: 'right' })
        .text(`HST Total: $${invoice.hstTotal.toFixed(2)}`, { align: 'right' });
      
      doc.moveDown();
      doc.fontSize(12).text(`GRAND TOTAL: $${invoice.grandTotal.toFixed(2)}`, { align: 'right' });
      
      // Payment Instructions
      doc.moveDown(2);
      doc.fontSize(10).text('Payment Instructions:');
      doc.fontSize(10).text('Please make payment by the due date. Thank you for your business!');
      
      doc.end();
    });
  }

  private async generateInvoiceExcel(invoice: Invoice, user: User, filepath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');
    
    // Header
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'INVOICE';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'right' };
    
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = invoice.invoiceNumber;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'right' };
    
    // From (User)
    worksheet.addRow([]);
    worksheet.addRow(['From:', `${user.firstName} ${user.lastName}`]);
    worksheet.addRow(['Email:', user.email]);
    
    // To (Client)
    const client = invoice.client;
    worksheet.addRow([]);
    worksheet.addRow(['To:', client.name]);
    
    if (client.contactName) {
      worksheet.addRow(['Attention:', client.contactName]);
    }
    
    if (client.address) {
      worksheet.addRow(['Address:', client.address]);
    }
    
    if (client.contactEmail) {
      worksheet.addRow(['Email:', client.contactEmail]);
    }
    
    // Invoice Details
    worksheet.addRow([]);
    worksheet.addRow(['Invoice Details:']);
    worksheet.addRow(['Issue Date:', new Date(invoice.issueDate).toLocaleDateString()]);
    worksheet.addRow(['Due Date:', new Date(invoice.dueDate).toLocaleDateString()]);
    
    if (invoice.notes) {
      worksheet.addRow([]);
      worksheet.addRow(['Notes:', invoice.notes]);
    }
    
    // Shifts Section
    if (invoice.shifts && invoice.shifts.length > 0) {
      worksheet.addRow([]);
      worksheet.addRow(['Shifts:']);
      
      // Table header
      worksheet.addRow(['Date', 'Hours', 'Rate', 'Amount', 'HST']);
      
      // Style header row
      const shiftsHeaderRow = worksheet.lastRow;
      shiftsHeaderRow.font = { bold: true };
      shiftsHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCCCC' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      
      // Data rows
      invoice.shifts.forEach((shift) => {
        const date = new Date(shift.startTime).toLocaleDateString();
        worksheet.addRow([
          date,
          Number(shift.totalHours),
          Number(shift.hourlyRate),
          Number(shift.earnings),
          Number(shift.hstAmount),
        ]);
      });
      
      // Format number columns
      worksheet.getColumn(2).numFmt = '0.00';
      worksheet.getColumn(3).numFmt = '"$"#,##0.00';
      worksheet.getColumn(4).numFmt = '"$"#,##0.00';
      worksheet.getColumn(5).numFmt = '"$"#,##0.00';
      
      // Shifts totals
      const shiftsStartRow = shiftsHeaderRow.number + 1;
      const shiftsEndRow = worksheet.lastRow.number;
      
      worksheet.addRow(['Total:', {
        formula: `SUM(B${shiftsStartRow}:B${shiftsEndRow})`,
        date1904: false,
      }, '', {
        formula: `SUM(D${shiftsStartRow}:D${shiftsEndRow})`,
        date1904: false,
      }, {
        formula: `SUM(E${shiftsStartRow}:E${shiftsEndRow})`,
        date1904: false,
      }]);
      
      worksheet.lastRow.font = { bold: true };
    }
    
    // Mileages Section
    if (invoice.mileages && invoice.mileages.length > 0) {
      worksheet.addRow([]);
      worksheet.addRow(['Mileage:']);
      
      // Table header
      worksheet.addRow(['Date', 'Distance (km)', 'Rate', 'Amount']);
      
      // Style header row
      const mileagesHeaderRow = worksheet.lastRow;
      mileagesHeaderRow.font = { bold: true };
      mileagesHeaderRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCCCCCC' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      
      // Data rows
      invoice.mileages.forEach((mileage) => {
        const date = new Date(mileage.date).toLocaleDateString();
        worksheet.addRow([
          date,
          Number(mileage.distance),
          Number(mileage.ratePerKm),
          Number(mileage.amount),
        ]);
      });
      
      // Format number columns
      worksheet.getColumn(2).numFmt = '0.00';
      worksheet.getColumn(3).numFmt = '"$"#,##0.00';
      worksheet.getColumn(4).numFmt = '"$"#,##0.00';
      
      // Mileages totals
      const mileagesStartRow = mileagesHeaderRow.number + 1;
      const mileagesEndRow = worksheet.lastRow.number;
      
      worksheet.addRow(['Total:', {
        formula: `SUM(B${mileagesStartRow}:B${mileagesEndRow})`,
        date1904: false,
      }, '', {
        formula: `SUM(D${mileagesStartRow}:D${mileagesEndRow})`,
        date1904: false,
      }]);
      
      worksheet.lastRow.font = { bold: true };
    }
    
    // Summary
    worksheet.addRow([]);
    worksheet.addRow(['Summary:']);
    worksheet.addRow(['Hours Total:', `${invoice.hoursTotal.toFixed(2)} hours`]);
    worksheet.addRow(['Earnings Total:', `$${invoice.earningsTotal.toFixed(2)}`]);
    worksheet.addRow(['Mileage Total:', `$${invoice.mileageTotal.toFixed(2)}`]);
    worksheet.addRow(['HST Total:', `$${invoice.hstTotal.toFixed(2)}`]);
    worksheet.addRow(['GRAND TOTAL:', `$${invoice.grandTotal.toFixed(2)}`]);
    
    worksheet.lastRow.font = { bold: true };
    
    // Payment Instructions
    worksheet.addRow([]);
    worksheet.addRow(['Payment Instructions:']);
    worksheet.addRow(['Please make payment by the due date. Thank you for your business!']);
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(filepath);
  }

  private async generateEarningsSummaryPdf(
    shifts: Shift[],
    mileages: Mileage[],
    clients: Client[],
    user: User,
    startDate: string,
    endDate: string,
    filepath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      
      stream.on('error', reject);
      stream.on('finish', resolve);
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('Earnings Summary', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`${user.firstName} ${user.lastName}`, { align: 'center' });
      doc.fontSize(10).text(`Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Overall Summary
      const totalHours = shifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
      const totalEarnings = shifts.reduce((sum, shift) => sum + Number(shift.earnings), 0);
      const totalHst = shifts.reduce((sum, shift) => sum + Number(shift.hstAmount), 0);
      const totalMileage = mileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0);
      const totalMileageAmount = mileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
      const grandTotal = totalEarnings + totalHst + totalMileageAmount;
      
      doc.fontSize(12).text('Overall Summary:');
      doc.moveDown();
      doc.fontSize(10)
        .text(`Total Hours: ${totalHours.toFixed(2)} hours`)
        .text(`Total Earnings: $${totalEarnings.toFixed(2)}`)
        .text(`Total HST: $${totalHst.toFixed(2)}`)
        .text(`Total Mileage: ${totalMileage.toFixed(2)} km`)
        .text(`Total Mileage Amount: $${totalMileageAmount.toFixed(2)}`)
        .text(`Grand Total: $${grandTotal.toFixed(2)}`);
      
      // Per Client Summary
      doc.moveDown(2);
      doc.fontSize(12).text('Client Summary:');
      doc.moveDown();
      
      // Table Header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 200;
      const col3 = 300;
      const col4 = 400;
      const col5 = 500;
      
      doc.fontSize(10)
        .text('Client', col1, tableTop, { width: 150 })
        .text('Hours', col2, tableTop, { width: 100 })
        .text('Earnings', col3, tableTop, { width: 100 })
        .text('Mileage', col4, tableTop, { width: 100 })
        .text('Total', col5, tableTop, { width: 100 });
      
      doc.moveDown();
      let rowY = doc.y;
      
      // Table rows
      clients.forEach((client) => {
        // Add a new page if needed
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          rowY = 50;
        }
        
        const clientShifts = shifts.filter(shift => shift.clientId === client.id);
        const clientMileages = mileages.filter(mileage => mileage.clientId === client.id);
        
        const clientHours = clientShifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
        const clientEarnings = clientShifts.reduce((sum, shift) => sum + Number(shift.earnings) + Number(shift.hstAmount), 0);
        const clientMileageAmount = clientMileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
        const clientTotal = clientEarnings + clientMileageAmount;
        
        doc.fontSize(10)
          .text(client.name, col1, rowY, { width: 150 })
          .text(clientHours.toFixed(2), col2, rowY, { width: 100 })
          .text(`$${clientEarnings.toFixed(2)}`, col3, rowY, { width: 100 })
          .text(`$${clientMileageAmount.toFixed(2)}`, col4, rowY, { width: 100 })
          .text(`$${clientTotal.toFixed(2)}`, col5, rowY, { width: 100 });
        
        rowY = doc.y + 10;
      });
      
      doc.end();
    });
  }

  private async generateEarningsSummaryExcel(
    shifts: Shift[],
    mileages: Mileage[],
    clients: Client[],
    user: User,
    startDate: string,
    endDate: string,
    filepath: string,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Earnings Summary');
    
    // Header
    worksheet.mergeCells('A1:F1');
    worksheet.mergeCells('A2:F2');
    worksheet.mergeCells('A3:F3');
    worksheet.mergeCells('A4:F4');
    
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'Earnings Summary';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    
    const nameRow = worksheet.getCell('A2');
    nameRow.value = `${user.firstName} ${user.lastName}`;
    nameRow.font = { size: 12 };
    nameRow.alignment = { horizontal: 'center' };
    
    const periodRow = worksheet.getCell('A3');
    periodRow.value = `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    periodRow.font = { size: 10 };
    periodRow.alignment = { horizontal: 'center' };
    
    const genDateRow = worksheet.getCell('A4');
    genDateRow.value = `Generated on: ${new Date().toLocaleDateString()}`;
    genDateRow.font = { size: 10 };
    genDateRow.alignment = { horizontal: 'center' };
    
    // Overall Summary
    const totalHours = shifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
    const totalEarnings = shifts.reduce((sum, shift) => sum + Number(shift.earnings), 0);
    const totalHst = shifts.reduce((sum, shift) => sum + Number(shift.hstAmount), 0);
    const totalMileage = mileages.reduce((sum, mileage) => sum + Number(mileage.distance), 0);
    const totalMileageAmount = mileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
    const grandTotal = totalEarnings + totalHst + totalMileageAmount;
    
    worksheet.addRow([]);
    worksheet.addRow(['Overall Summary:']);
    worksheet.lastRow.font = { bold: true };
    
    worksheet.addRow(['Total Hours:', `${totalHours.toFixed(2)} hours`]);
    worksheet.addRow(['Total Earnings:', `$${totalEarnings.toFixed(2)}`]);
    worksheet.addRow(['Total HST:', `$${totalHst.toFixed(2)}`]);
    worksheet.addRow(['Total Mileage:', `${totalMileage.toFixed(2)} km`]);
    worksheet.addRow(['Total Mileage Amount:', `$${totalMileageAmount.toFixed(2)}`]);
    worksheet.addRow(['Grand Total:', `$${grandTotal.toFixed(2)}`]);
    worksheet.lastRow.font = { bold: true };
    
    // Per Client Summary
    worksheet.addRow([]);
    worksheet.addRow(['Client Summary:']);
    worksheet.lastRow.font = { bold: true };
    
    // Table header
    worksheet.addRow(['Client', 'Hours', 'Earnings', 'Mileage', 'Total']);
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // Client rows
    clients.forEach((client) => {
      const clientShifts = shifts.filter(shift => shift.clientId === client.id);
      const clientMileages = mileages.filter(mileage => mileage.clientId === client.id);
      
      const clientHours = clientShifts.reduce((sum, shift) => sum + Number(shift.totalHours), 0);
      const clientEarnings = clientShifts.reduce((sum, shift) => sum + Number(shift.earnings) + Number(shift.hstAmount), 0);
      const clientMileageAmount = clientMileages.reduce((sum, mileage) => sum + Number(mileage.amount), 0);
      const clientTotal = clientEarnings + clientMileageAmount;
      
      worksheet.addRow([
        client.name,
        clientHours,
        clientEarnings,
        clientMileageAmount,
        clientTotal,
      ]);
    });
    
    // Format number columns
    worksheet.getColumn(2).numFmt = '0.00';
    worksheet.getColumn(3).numFmt = '"$"#,##0.00';
    worksheet.getColumn(4).numFmt = '"$"#,##0.00';
    worksheet.getColumn(5).numFmt = '"$"#,##0.00';
    
    // Add totals row
    const dataStartRow = headerRow.number + 1;
    const dataEndRow = worksheet.lastRow.number;
    
    worksheet.addRow([
      'TOTAL',
      {
        formula: `SUM(B${dataStartRow}:B${dataEndRow})`,
        date1904: false,
      },
      {
        formula: `SUM(C${dataStartRow}:C${dataEndRow})`,
        date1904: false,
      },
      {
        formula: `SUM(D${dataStartRow}:D${dataEndRow})`,
        date1904: false,
      },
      {
        formula: `SUM(E${dataStartRow}:E${dataEndRow})`,
        date1904: false,
      },
    ]);
    
    worksheet.lastRow.font = { bold: true };
    
    // Create detailed worksheets
    this.addDetailedShiftsWorksheet(workbook, shifts, clients, startDate, endDate);
    this.addDetailedMileageWorksheet(workbook, mileages, clients, startDate, endDate);
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(filepath);
  }

  private addDetailedShiftsWorksheet(
    workbook: ExcelJS.Workbook,
    shifts: Shift[],
    clients: Client[],
    startDate: string,
    endDate: string,
  ): void {
    const worksheet = workbook.addWorksheet('Shifts Detail');
    
    // Header
    worksheet.mergeCells('A1:G1');
    worksheet.mergeCells('A2:G2');
    
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'Detailed Shifts Report';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    
    const periodRow = worksheet.getCell('A2');
    periodRow.value = `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    periodRow.font = { size: 10 };
    periodRow.alignment = { horizontal: 'center' };
    
    // Table header
    worksheet.addRow([]);
    worksheet.addRow(['Date', 'Client', 'Start Time', 'End Time', 'Hours', 'Rate', 'Amount', 'HST']);
    
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // Sort shifts by date
    const sortedShifts = [...shifts].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    // Add data rows
    sortedShifts.forEach((shift) => {
      const client = clients.find(c => c.id === shift.clientId);
      const clientName = client ? client.name : 'Unknown Client';
      
      worksheet.addRow([
        new Date(shift.startTime).toLocaleDateString(),
        clientName,
        new Date(shift.startTime).toLocaleTimeString(),
        new Date(shift.endTime).toLocaleTimeString(),
        Number(shift.totalHours),
        Number(shift.hourlyRate),
        Number(shift.earnings),
        Number(shift.hstAmount),
      ]);
    });
    
    // Format columns
    worksheet.getColumn(5).numFmt = '0.00';
    worksheet.getColumn(6).numFmt = '"$"#,##0.00';
    worksheet.getColumn(7).numFmt = '"$"#,##0.00';
    worksheet.getColumn(8).numFmt = '"$"#,##0.00';
    
    // Add totals row
    const dataStartRow = headerRow.number + 1;
    const dataEndRow = worksheet.lastRow.number;
    
    worksheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      {
        formula: `SUM(E${dataStartRow}:E${dataEndRow})`,
        date1904: false,
      },
      '',
      {
        formula: `SUM(G${dataStartRow}:G${dataEndRow})`,
        date1904: false,
      },
      {
        formula: `SUM(H${dataStartRow}:H${dataEndRow})`,
        date1904: false,
      },
    ]);
    
    worksheet.lastRow.font = { bold: true };
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  private addDetailedMileageWorksheet(
    workbook: ExcelJS.Workbook,
    mileages: Mileage[],
    clients: Client[],
    startDate: string,
    endDate: string,
  ): void {
    const worksheet = workbook.addWorksheet('Mileage Detail');
    
    // Header
    worksheet.mergeCells('A1:G1');
    worksheet.mergeCells('A2:G2');
    
    const titleRow = worksheet.getCell('A1');
    titleRow.value = 'Detailed Mileage Report';
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    
    const periodRow = worksheet.getCell('A2');
    periodRow.value = `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    periodRow.font = { size: 10 };
    periodRow.alignment = { horizontal: 'center' };
    
    // Table header
    worksheet.addRow([]);
    worksheet.addRow(['Date', 'Client', 'From', 'To', 'Distance (km)', 'Rate', 'Amount']);
    
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // Sort mileages by date
    const sortedMileages = [...mileages].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Add data rows
    sortedMileages.forEach((mileage) => {
      const client = clients.find(c => c.id === mileage.clientId);
      const clientName = client ? client.name : 'Unknown Client';
      
      worksheet.addRow([
        new Date(mileage.date).toLocaleDateString(),
        clientName,
        mileage.fromLocation || '',
        mileage.toLocation || '',
        Number(mileage.distance),
        Number(mileage.ratePerKm),
        Number(mileage.amount),
      ]);
    });
    
    // Format columns
    worksheet.getColumn(5).numFmt = '0.00';
    worksheet.getColumn(6).numFmt = '"$"#,##0.00';
    worksheet.getColumn(7).numFmt = '"$"#,##0.00';
    
    // Add totals row
    const dataStartRow = headerRow.number + 1;
    const dataEndRow = worksheet.lastRow.number;
    
    worksheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      {
        formula: `SUM(E${dataStartRow}:E${dataEndRow})`,
        date1904: false,
      },
      '',
      {
        formula: `SUM(G${dataStartRow}:G${dataEndRow})`,
        date1904: false,
      },
    ]);
    
    worksheet.lastRow.font = { bold: true };
    
    // Adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
  }
}