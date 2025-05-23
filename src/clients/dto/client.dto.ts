import { ApiProperty } from '@nestjs/swagger';
import { Client } from '../entities/client.entity';

export class ClientDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  contactName: string;

  @ApiProperty({ required: false })
  contactEmail: string;

  @ApiProperty({ required: false })
  contactPhone: string;

  @ApiProperty({ required: false })
  address: string;

  @ApiProperty({ required: false })
  latitude: number;

  @ApiProperty({ required: false })
  longitude: number;

  @ApiProperty({ required: false })
  notes: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(client: Client) {
    this.id = client.id;
    this.name = client.name;
    this.contactName = client.contactName;
    this.contactEmail = client.contactEmail;
    this.contactPhone = client.contactPhone;
    this.address = client.address;
    this.latitude = client.latitude;
    this.longitude = client.longitude;
    this.notes = client.notes;
    this.userId = client.userId;
    this.createdAt = client.createdAt;
    this.updatedAt = client.updatedAt;
  }
}