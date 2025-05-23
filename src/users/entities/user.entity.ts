import { AbstractEntity } from '../../common/entities/abstract.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Mileage } from '../../mileages/entities/mileage.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity()
export class User extends AbstractEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true, default: null })
  hourlyRate: number;

  @Column({ nullable: true, default: 13 })
  hstPercentage: number;

  @Column({ nullable: true, default: 0.61 })
  mileageRate: number;

  @OneToMany(() => Client, (client) => client.user)
  clients: Client[];

  @OneToMany(() => Shift, (shift) => shift.user)
  shifts: Shift[];

  @OneToMany(() => Mileage, (mileage) => mileage.user)
  mileages: Mileage[];

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices: Invoice[];
}