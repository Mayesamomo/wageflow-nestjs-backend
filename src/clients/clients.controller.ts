import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { PageDto } from '../common/dto/page.dto';

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'The client has been successfully created', type: ClientDto })
  create(@Req() req, @Body() createClientDto: CreateClientDto): Promise<ClientDto> {
    return this.clientsService.create(req.user.id, createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiResponse({ status: 200, description: 'Return all clients', type: PageDto })
  findAll(
    @Req() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<ClientDto>> {
    return this.clientsService.findAll(req.user.id, pageOptionsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by id' })
  @ApiResponse({ status: 200, description: 'Return the client', type: ClientDto })
  @ApiResponse({ status: 404, description: 'Client not found' })
  findOne(@Req() req, @Param('id') id: string): Promise<ClientDto> {
    return this.clientsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiResponse({ status: 200, description: 'The client has been successfully updated', type: ClientDto })
  @ApiResponse({ status: 404, description: 'Client not found' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientDto> {
    return this.clientsService.update(req.user.id, id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client' })
  @ApiResponse({ status: 200, description: 'The client has been successfully deleted' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    return this.clientsService.remove(req.user.id, id);
  }
}