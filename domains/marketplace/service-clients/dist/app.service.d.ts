import { ClientProxy } from '@nestjs/microservices';
export declare class AppService {
    private readonly rabbitClient;
    constructor(rabbitClient: ClientProxy);
    generateInvoice(clientId: string): {
        message: string;
        invoiceId: string;
    };
}
