import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Mileage } from '../../mileages/entities/mileage.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity()
export class Invoice extends AbstractEntity {
  @Column()
  invoiceNumber: string;

  @Column({ type: 'datetime' })
  issueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @Column({
    type: 'varchar',
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hoursTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  earningsTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  mileageTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hstTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  paymentNotes: string;

  @Column({ nullable: true })
  paymentProofFilename: string;

  @ManyToOne(() => User, (user) => user.invoices, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Client, (client) => client.invoices, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @Column()
  clientId: string;

  @ManyToMany(() => Shift, (shift) => shift.invoices)
  @JoinTable()
  shifts: Shift[];

  @ManyToMany(() => Mileage, (mileage) => mileage.invoices)
  @JoinTable()
  mileages: Mileage[];
}