import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Existing endpoint
  @Post('clients/:id/generate-invoice')
  generateInvoice(@Param('id') clientId: string) {
    return this.appService.generateInvoice(clientId);
  }

  // NEW ENDPOINTS

  // Profile client
  @Get('clients/:id/profile')
  getClientProfile(@Param('id') id: string) {
    return this.appService.getClientProfile(id);
  }

  // Orders for a client
  @Get('clients/:id/orders')
  getClientOrders(@Param('id') id: string) {
    return this.appService.getClientOrders(id);
  }

  // Create a client
  @Post('clients')
  createClient(@Body() data: any) {
    return this.appService.createClient(data);
  }

  // List all clients
  @Get('clients')
  getAllClients() {
    return this.appService.getAllClients();
  }
}
