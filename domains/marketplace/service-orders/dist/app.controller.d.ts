import { RmqContext } from '@nestjs/microservices';
import { OrdersService } from './orders/orders.service';
export declare class AppController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    handleInvoiceCreated(data: any, context: RmqContext): Promise<void>;
    getOrdersByClient(clientId: string): Promise<import("./orders/order.schema").Order[]>;
    getAllOrders(): Promise<import("./orders/order.schema").Order[]>;
}
