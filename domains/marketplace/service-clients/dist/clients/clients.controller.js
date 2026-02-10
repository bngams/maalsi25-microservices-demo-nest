"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const clients_service_1 = require("./clients.service");
let ClientsController = class ClientsController {
    constructor(clientsService) {
        this.clientsService = clientsService;
    }
    async createClient(data) {
        return this.clientsService.create(data);
    }
    async getAllClients() {
        return this.clientsService.findAll();
    }
    async getClientById(id) {
        return this.clientsService.findOne(id);
    }
    async getClientProfile(id) {
        return this.clientsService.getProfile(id);
    }
    async updateClient(data) {
        return this.clientsService.update(data.id, data.updateData);
    }
    async deleteClient(id) {
        return this.clientsService.delete(id);
    }
};
exports.ClientsController = ClientsController;
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'create_client' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "createClient", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_all_clients' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getAllClients", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_client_by_id' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getClientById", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_client_profile' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "getClientProfile", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'update_client' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "updateClient", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'delete_client' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClientsController.prototype, "deleteClient", null);
exports.ClientsController = ClientsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [clients_service_1.ClientsService])
], ClientsController);
//# sourceMappingURL=clients.controller.js.map