import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { OrdersService } from './orders/orders.service';

@Controller()
export class AppController {
  constructor(private readonly ordersService: OrdersService) {}

  @EventPattern('invoice_created')
  async handleInvoiceCreated(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('📨 Received invoice generation request:', data);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Create an order/invoice
    const order = await this.ordersService.create({
      clientId: data.clientId,
      invoiceNumber,
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      status: 'completed',
    });

    console.log('✅ Invoice created:', order);
    console.log('📧 (Simulated) Email sent to client\n');

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }

  @MessagePattern({ cmd: 'get_orders_by_client' })
  async getOrdersByClient(@Payload() clientId: string) {
    return this.ordersService.findByClientId(clientId);
  }

  @MessagePattern({ cmd: 'get_all_orders' })
  async getAllOrders() {
    return this.ordersService.findAll();
  }
}
