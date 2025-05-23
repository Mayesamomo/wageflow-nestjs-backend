import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ShiftsModule } from './shifts/shifts.module';
import { MileagesModule } from './mileages/mileages.module';
import { InvoicesModule } from './invoices/invoices.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';
import { SeedsModule } from './seeds/seeds.module';
import { LoggerModule } from './common/services/logger.module';
import { LoggerService } from './common/services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, LoggerService],
      useFactory: (configService: ConfigService, logger: LoggerService) => {
        logger.setContext('Database');
        const dbType = configService.get('DB_TYPE', 'sqlite');
        logger.log(`Database type: ${dbType}`);
        
        const baseConfig = {
          synchronize: configService.get('DB_SYNC', 'true') === 'true',
          autoLoadEntities: true,
          logging: configService.get('NODE_ENV') === 'development',
        };
        
        if (dbType === 'postgres') {
          const host = configService.get('DB_HOST', 'localhost');
          const port = configService.get('DB_PORT', 5432);
          const username = configService.get('DB_USERNAME', 'postgres');
          const database = configService.get('DB_DATABASE', 'wageflow');
          
          logger.log(`Connecting to PostgreSQL database: ${database} on ${host}:${port}`);
          
          return {
            type: 'postgres',
            host,
            port,
            username,
            password: configService.get('DB_PASSWORD', 'postgres'),
            database,
            ...baseConfig,
          };
        } else {
          const database = configService.get('DB_DATABASE', 'wageflow.sqlite');
          logger.log(`Connecting to SQLite database: ${database}`);
          
          return {
            type: 'sqlite',
            database,
            ...baseConfig,
          };
        }
      },
    }),
    AuthModule,
    UsersModule,
    ClientsModule,
    ShiftsModule,
    MileagesModule,
    InvoicesModule,
    DashboardModule,
    ExportsModule,
    SeedsModule,
  ],
})
export class AppModule {}