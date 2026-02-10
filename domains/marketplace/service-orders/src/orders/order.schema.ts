import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ type: [{ product: String, quantity: Number, price: Number }] })
  items: { product: string; quantity: number; price: number }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'pending' })
  status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
