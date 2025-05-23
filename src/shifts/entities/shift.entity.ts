import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

export enum ShiftType {
  REGULAR = 'regular',
  OVERTIME = 'overtime',
  HOLIDAY = 'holiday',
  NIGHT = 'night',
  WEEKEND = 'weekend',
}

@Entity()
export class Shift extends AbstractEntity {
  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({
    type: 'varchar',
    default: ShiftType.REGULAR,
  })
  shiftType: ShiftType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hourlyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  earnings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hstAmount: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @ManyToOne(() => User, (user) => user.shifts, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Client, (client) => client.shifts, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @Column()
  clientId: string;

  @ManyToMany(() => Invoice, (invoice) => invoice.shifts)
  invoices: Invoice[];

  @Column({ default: false })
  isInvoiced: boolean;
}