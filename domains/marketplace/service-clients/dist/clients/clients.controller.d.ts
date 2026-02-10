import { ClientsService } from './clients.service';
import { Client } from './client.schema';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    createClient(data: Partial<Client>): Promise<Client>;
    getAllClients(): Promise<Client[]>;
    getClientById(id: string): Promise<Client>;
    getClientProfile(id: string): Promise<Client>;
    updateClient(data: {
        id: string;
        updateData: Partial<Client>;
    }): Promise<Client>;
    deleteClient(id: string): Promise<Client>;
}
