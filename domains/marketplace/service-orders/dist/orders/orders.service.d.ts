import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';
export declare class OrdersService {
    private orderModel;
    constructor(orderModel: Model<OrderDocument>);
    create(createOrderDto: Partial<Order>): Promise<Order>;
    findAll(): Promise<Order[]>;
    findByClientId(clientId: string): Promise<Order[]>;
    findOne(id: string): Promise<Order>;
    updateStatus(id: string, status: string): Promise<Order>;
}
