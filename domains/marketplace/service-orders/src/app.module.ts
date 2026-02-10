import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:admin@localhost:27017/orders_db?authSource=admin'),
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
