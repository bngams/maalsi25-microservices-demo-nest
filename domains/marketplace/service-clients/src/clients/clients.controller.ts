import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClientsService } from './clients.service';
import { Client } from './client.schema';

@Controller()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @MessagePattern({ cmd: 'create_client' })
  async createClient(@Payload() data: Partial<Client>) {
    return this.clientsService.create(data);
  }

  @MessagePattern({ cmd: 'get_all_clients' })
  async getAllClients() {
    return this.clientsService.findAll();
  }

  @MessagePattern({ cmd: 'get_client_by_id' })
  async getClientById(@Payload() id: string) {
    return this.clientsService.findOne(id);
  }

  @MessagePattern({ cmd: 'get_client_profile' })
  async getClientProfile(@Payload() id: string) {
    return this.clientsService.getProfile(id);
  }

  @MessagePattern({ cmd: 'update_client' })
  async updateClient(@Payload() data: { id: string; updateData: Partial<Client> }) {
    return this.clientsService.update(data.id, data.updateData);
  }

  @MessagePattern({ cmd: 'delete_client' })
  async deleteClient(@Payload() id: string) {
    return this.clientsService.delete(id);
  }
}
