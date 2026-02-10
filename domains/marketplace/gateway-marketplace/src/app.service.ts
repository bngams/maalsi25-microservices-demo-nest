import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';

@Injectable()
export class AppService {
  constructor(
    @Inject('CLIENTS_SERVICE') private readonly clientsService: ClientProxy,
    @Inject('ORDERS_SERVICE') private readonly ordersService: ClientProxy,
  ) {}

  generateInvoice(clientId: string) {
    console.log(`📤 Publishing invoice generation for client ${clientId}`);

    // Publish async message (RabbitMQ)
    this.ordersService.emit('invoice_created', {
      clientId,
      items: [
        { product: 'Product A', quantity: 2, price: 50 },
        { product: 'Product B', quantity: 1, price: 100 },
      ],
      totalAmount: 200,
    });

    return {
      message: 'Invoice generation requested. You will receive an email when ready.',
      clientId,
    };
  }

  getClientProfile(id: string) {
    return this.clientsService.send({ cmd: 'get_client_profile' }, id);
  }

  getClientOrders(id: string) {
    return this.ordersService.send({ cmd: 'get_orders_by_client' }, id);
  }

  createClient(data: any) {
    return this.clientsService.send({ cmd: 'create_client' }, data);
  }

  getAllClients() {
    return this.clientsService.send({ cmd: 'get_all_clients' }, {});
  }
}
