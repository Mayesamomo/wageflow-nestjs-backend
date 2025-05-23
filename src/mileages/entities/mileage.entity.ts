import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity()
export class Mileage extends AbstractEntity {
  @Column({ type: 'datetime' })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  distance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ratePerKm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  fromLocation: string;

  @Column({ nullable: true })
  toLocation: string;

  @ManyToOne(() => User, (user) => user.mileages, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Client, (client) => client.mileages, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @Column()
  clientId: string;

  @ManyToMany(() => Invoice, (invoice) => invoice.mileages)
  invoices: Invoice[];

  @Column({ default: false })
  isInvoiced: boolean;
}