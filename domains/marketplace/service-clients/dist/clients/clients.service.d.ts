import { Model } from 'mongoose';
import { Client, ClientDocument } from './client.schema';
export declare class ClientsService {
    private clientModel;
    constructor(clientModel: Model<ClientDocument>);
    create(createClientDto: Partial<Client>): Promise<Client>;
    findAll(): Promise<Client[]>;
    findOne(id: string): Promise<Client>;
    findByEmail(email: string): Promise<Client>;
    update(id: string, updateClientDto: Partial<Client>): Promise<Client>;
    delete(id: string): Promise<Client>;
    getProfile(id: string): Promise<Client>;
}
