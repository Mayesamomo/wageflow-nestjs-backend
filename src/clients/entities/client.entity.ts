import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Mileage } from '../../mileages/entities/mileage.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity()
export class Client extends AbstractEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  contactName: string;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => User, (user) => user.clients, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Shift, (shift) => shift.client)
  shifts: Shift[];

  @OneToMany(() => Mileage, (mileage) => mileage.client)
  mileages: Mileage[];

  @OneToMany(() => Invoice, (invoice) => invoice.client)
  invoices: Invoice[];
}