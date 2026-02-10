# Tutoriel : Persistance avec MongoDB

## 🎯 Objectifs d'Apprentissage

Dans ce tutoriel, vous allez apprendre à :
- Comprendre le rôle des **bases de données** dans une architecture microservices
- Installer et configurer **MongoDB** avec Docker
- Intégrer **Mongoose** dans NestJS pour la persistance
- Implémenter le pattern **Database per Service**
- Créer des endpoints CRUD avec MongoDB
- Gérer les données clients et commandes

## 📚 Contexte

Actuellement, votre architecture ne persiste aucune donnée :
- **Pas de stockage** : Les données sont perdues au redémarrage
- **Services sans état** : Impossible de conserver l'historique
- **Pas de requêtes complexes** : Difficile de rechercher ou filtrer les données

**Problème** : Sans base de données, impossible de construire des fonctionnalités métier réalistes (gestion clients, commandes, historique).

**Solution** : **MongoDB** est une base de données NoSQL orientée documents, parfaite pour stocker des données structurées en JSON.

## 🏗️ Architecture Cible

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ HTTP :8000
       │
┌──────▼──────────────┐
│   Kong API Gateway  │
└──────┬──────────────┘
       │
       ├─────/marketplace/*─────┐
       │                        │
       │                   ┌────▼────────────────┐
       │                   │Gateway Marketplace. │
       │                   │   (Port 3300 ou X)  │
       │                   └────┬────────────────┘
       │                        │
       │          ┌─────────────┼─────────────┐
       │          │             │             │
       │     ┌────▼──────┐ ┌───▼────┐   ┌────▼────┐
       │     │Service    │ │Service │   │RabbitMQ │
       │     │Clients    │ │Orders  │   └─────────┘
       │     │(Port 3003)│ │(Port   │
       │     └────┬──────┘ │3004)   │
       │          │        └───┬────┘
       │          │            │
       │     ┌────▼────────────▼─────┐
       │     │      MongoDB          │
       │     │   (Port 27017)        │
       │     │                       │
       │     │  - DB: clients_db     │
       │     │  - DB: orders_db      │
       │     └───────────────────────┘
```

**Principe : Database per Service**
- Chaque microservice a sa propre base de données
- Isolation complète des données
- Les services ne doivent **JAMAIS** accéder directement à la DB d'un autre service

## 📋 Prérequis

- Docker et Docker Compose installés
- Avoir suivi TODO-CONSUL.md et TODO-RMQ.md
- Services NestJS fonctionnels (service-clients, service-orders)

---

## 🛠️ Étape 1 : Installation de MongoDB

### 1.1 Comprendre MongoDB

**MongoDB** est une base de données NoSQL qui stocke les données au format BSON (Binary JSON).

**Avantages** :
- ✅ Schéma flexible (pas besoin de migrations strictes)
- ✅ Performant pour les lectures/écritures
- ✅ Intégration native avec JavaScript/TypeScript
- ✅ Requêtes complexes avec agrégations

**Concepts clés** :
- **Database** : Conteneur de collections (équivalent à un schéma SQL)
- **Collection** : Groupe de documents (équivalent à une table SQL)
- **Document** : Enregistrement JSON (équivalent à une ligne SQL)

### 1.2 Ajouter MongoDB au `compose.yaml`

**`compose.yaml`** - Ajouter le service MongoDB :

```yaml
services:
  # ... services existants (rabbitmq, kong, consul, keycloak, postgres)

  mongodb:
    image: mongo:7
    container_name: mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  rabbitmq_data:
  consul_data:
  postgres_data:
  mongodb_data: # Nouveau volume pour MongoDB
```

**Explications** :
- `mongo:7` : Version 7 de MongoDB (dernière stable)
- `MONGO_INITDB_ROOT_USERNAME/PASSWORD` : Identifiants du super-utilisateur
- `27017` : Port par défaut de MongoDB
- `mongodb_data` : Volume pour persister les données

### 1.3 Démarrer MongoDB

```bash
docker-compose up -d mongodb
```

Vérifiez que MongoDB est lancé :

```bash
docker logs mongodb
```

Vous devriez voir : `Waiting for connections on port 27017`

### 1.4 Accéder à MongoDB avec Mongosh (optionnel)

Connectez-vous au shell MongoDB :

```bash
docker exec -it mongodb mongosh -u admin -p admin
```

**Commandes utiles** :

```javascript
// Lister les bases de données
show dbs

// Créer/utiliser une base de données
use clients_db

// Lister les collections
show collections

// Insérer un document
db.clients.insertOne({ name: "Alice", email: "alice@example.com" })

// Lister les documents
db.clients.find()

// Quitter
exit
```

### ✅ Point de Contrôle 1

- ✅ MongoDB démarre sans erreur
- ✅ Le shell Mongosh est accessible
- ✅ Vous pouvez créer des bases de données et collections

---

## 🛠️ Étape 2 : Intégrer MongoDB dans service-clients

### 2.1 Installation des Dépendances

```bash
cd domains/marketplace/service-clients
npm install @nestjs/mongoose mongoose
```

**Explications** :
- `@nestjs/mongoose` : Module NestJS pour MongoDB
- `mongoose` : ODM (Object-Document Mapper) pour MongoDB

### 2.2 Créer le Schéma Client

**`domains/marketplace/service-clients/src/clients/client.schema.ts`** (nouveau fichier) :

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop({ default: 'active' })
  status: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
```

**Explications** :
- `@Schema({ timestamps: true })` : Ajoute automatiquement `createdAt` et `updatedAt`
- `@Prop({ required: true })` : Champ obligatoire
- `@Prop({ unique: true })` : Index unique (pas de doublons)
- `@Prop()` : Champ optionnel

### 2.3 Créer le Module Clients

**`domains/marketplace/service-clients/src/clients/clients.module.ts`** (nouveau fichier) :

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client, ClientSchema } from './client.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
```

### 2.4 Créer le Service Clients

**`domains/marketplace/service-clients/src/clients/clients.service.ts`** (nouveau fichier) :

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './client.schema';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  async create(createClientDto: Partial<Client>): Promise<Client> {
    const createdClient = new this.clientModel(createClientDto);
    return createdClient.save();
  }

  async findAll(): Promise<Client[]> {
    return this.clientModel.find().exec();
  }

  async findOne(id: string): Promise<Client> {
    return this.clientModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<Client> {
    return this.clientModel.findOne({ email }).exec();
  }

  async update(id: string, updateClientDto: Partial<Client>): Promise<Client> {
    return this.clientModel
      .findByIdAndUpdate(id, updateClientDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Client> {
    return this.clientModel.findByIdAndDelete(id).exec();
  }

  async getProfile(id: string): Promise<Client> {
    return this.clientModel.findById(id).select('-__v').exec();
  }
}
```

### 2.5 Créer le Contrôleur Clients

**`domains/marketplace/service-clients/src/clients/clients.controller.ts`** (nouveau fichier) :

```typescript
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
```

### 2.6 Configurer le Module Principal

**`domains/marketplace/service-clients/src/app.module.ts`** :

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:admin@localhost:27017/clients_db?authSource=admin'),
    ClientsModule,
  ],
})
export class AppModule {}
```

**Explications** :
- `mongodb://admin:admin@localhost:27017` : URL de connexion MongoDB
- `clients_db` : Nom de la base de données (sera créée automatiquement)
- `authSource=admin` : Base de données pour l'authentification

### 2.7 Démarrer le Service

```bash
cd domains/marketplace/service-clients
npm run start:dev
```

### ✅ Point de Contrôle 2

Vérifications :

1. **Logs du service** : `Mapped {/clients, POST} route`
2. **MongoDB** : Connectez-vous avec Mongosh et vérifiez :
   ```bash
   docker exec -it mongodb mongosh -u admin -p admin
   use clients_db
   show collections
   # Vous devriez voir la collection "clients"
   ```

---

## 🛠️ Étape 3 : Intégrer MongoDB dans service-orders

### 3.1 Installation des Dépendances

```bash
cd domains/marketplace/service-orders
npm install @nestjs/mongoose mongoose
```

### 3.2 Créer le Schéma Order

**`domains/marketplace/service-orders/src/orders/order.schema.ts`** (nouveau fichier) :

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ type: [{ product: String, quantity: Number, price: Number }] })
  items: { product: string; quantity: number; price: number }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'pending' })
  status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
```

### 3.3 Créer le Module Orders

**`domains/marketplace/service-orders/src/orders/orders.module.ts`** (nouveau fichier) :

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

### 3.4 Créer le Service Orders

**`domains/marketplace/service-orders/src/orders/orders.service.ts`** (nouveau fichier) :

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(createOrderDto: Partial<Order>): Promise<Order> {
    const createdOrder = new this.orderModel(createOrderDto);
    return createdOrder.save();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findByClientId(clientId: string): Promise<Order[]> {
    return this.orderModel.find({ clientId }).exec();
  }

  async findOne(id: string): Promise<Order> {
    return this.orderModel.findById(id).exec();
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    return this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }
}
```

### 3.5 Créer le Contrôleur Orders

**`domains/marketplace/service-orders/src/orders/orders.controller.ts`** (nouveau fichier) :

```typescript
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @EventPattern('invoice_generated')
  async handleInvoiceGenerated(@Payload() data: any) {
    console.log('📨 Received invoice generation request:', data);

    // Générer un numéro de facture
    const invoiceNumber = `INV-${Date.now()}`;

    // Créer une commande/facture
    const order = await this.ordersService.create({
      clientId: data.clientId,
      invoiceNumber,
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      status: 'completed',
    });

    console.log('✅ Invoice created:', order);
    return order;
  }
}
```

### 3.6 Configurer le Module Principal

**`domains/marketplace/service-orders/src/app.module.ts`** :

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:admin@localhost:27017/orders_db?authSource=admin'),
    OrdersModule,
  ],
})
export class AppModule {}
```

### 3.7 Démarrer le Service

```bash
cd domains/marketplace/service-orders
npm run start:dev
```

### ✅ Point de Contrôle 3

Vérifications dans Mongosh :

```bash
docker exec -it mongodb mongosh -u admin -p admin
show dbs
# Vous devriez voir "clients_db" et "orders_db"
use orders_db
show collections
# Vous devriez voir la collection "orders"
```

---

## 🛠️ Étape 4 : Ajouter les Endpoints au Gateway

### 4.1 Mettre à Jour le Gateway Marketplace

**`domains/marketplace/gateway-marketplace/src/app.controller.ts`** :

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint existant
  @Post('clients/:id/generate-invoice')
  generateInvoice(@Param('id') clientId: string) {
    return this.appService.generateInvoice(clientId);
  }

  // NOUVEAUX ENDPOINTS

  // Profile client
  @Get('clients/:id/profile')
  getClientProfile(@Param('id') id: string) {
    return this.appService.getClientProfile(id);
  }

  // Commandes d'un client
  @Get('clients/:id/orders')
  getClientOrders(@Param('id') id: string) {
    return this.appService.getClientOrders(id);
  }

  // Créer un client
  @Post('clients')
  createClient(@Body() data: any) {
    return this.appService.createClient(data);
  }

  // Lister tous les clients
  @Get('clients')
  getAllClients() {
    return this.appService.getAllClients();
  }
}
```

### 4.2 Implémenter les Méthodes dans le Service

**`domains/marketplace/gateway-marketplace/src/app.service.ts`** :

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    @Inject('SERVICE_CLIENTS') private clientsService: ClientProxy,
  ) {}

  generateInvoice(clientId: string) {
    console.log(`📤 Publishing invoice generation for client ${clientId}`);

    // Publier un message asynchrone (RabbitMQ)
    this.clientsService.emit('invoice_generated', {
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
    // À implémenter : appeler service-orders
    return { message: 'Not implemented yet', clientId: id };
  }

  createClient(data: any) {
    return this.clientsService.send({ cmd: 'create_client' }, data);
  }

  getAllClients() {
    return this.clientsService.send({ cmd: 'get_all_clients' }, {});
  }
}
```

### ✅ Point de Contrôle 4

Vérifications :

1. Le gateway expose les nouveaux endpoints
2. Les appels TCP vers `service-clients` fonctionnent
3. Les messages RabbitMQ vers `service-orders` fonctionnent

---

## 🧪 Étape 5 : Tests & Vérification

### 5.1 Créer un Client

```bash
curl -X POST http://localhost:3001/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Dupont",
    "email": "alice@example.com",
    "phone": "0123456789",
    "address": "123 Rue de Paris"
  }'
```

**Réponse attendue** :

```json
{
  "_id": "67891234567890abcdef1234",
  "name": "Alice Dupont",
  "email": "alice@example.com",
  "phone": "0123456789",
  "address": "123 Rue de Paris",
  "status": "active",
  "createdAt": "2025-02-10T10:00:00.000Z",
  "updatedAt": "2025-02-10T10:00:00.000Z"
}
```

### 5.2 Lister tous les Clients

```bash
curl http://localhost:3001/clients
```

### 5.3 Récupérer le Profil d'un Client

```bash
# Remplacez {id} par l'ID retourné lors de la création
curl http://localhost:3001/clients/{id}/profile
```

### 5.4 Générer une Facture (Asynchrone)

```bash
curl -X POST http://localhost:3001/clients/{id}/generate-invoice
```

**Réponse immédiate** :

```json
{
  "message": "Invoice generation requested. You will receive an email when ready.",
  "clientId": "67891234567890abcdef1234"
}
```

**Vérifier dans les logs de `service-orders`** :

```
📨 Received invoice generation request: { clientId: '...', items: [...] }
✅ Invoice created: { _id: '...', invoiceNumber: 'INV-1739181234567', ... }
```

### 5.5 Vérifier dans MongoDB

```bash
docker exec -it mongodb mongosh -u admin -p admin

use clients_db
db.clients.find().pretty()

use orders_db
db.orders.find().pretty()
```

### ✅ Point de Contrôle 5

- ✅ Création de clients fonctionnelle
- ✅ Récupération du profil client
- ✅ Génération asynchrone de factures
- ✅ Données persistées dans MongoDB

---

## 🚀 Pour Aller Plus Loin (Extensions Optionnelles)

### 1. **Implémenter `GET /clients/:id/orders`**

Ajouter une communication entre `service-orders` et `gateway-marketplace` pour récupérer les commandes d'un client.

### 2. **Ajouter des Validations avec `class-validator`**

```typescript
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  phone?: string;
}
```

### 3. **Pagination des Résultats**

```typescript
async findAll(page: number = 1, limit: number = 10): Promise<Client[]> {
  return this.clientModel
    .find()
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
}
```

### 4. **Indexation pour les Performances**

Dans le schéma, ajouter des index :

```typescript
@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;
}
```

### 5. **Agrégations MongoDB**

Calculer le total des commandes par client :

```typescript
async getTotalByClient(clientId: string): Promise<number> {
  const result = await this.orderModel.aggregate([
    { $match: { clientId } },
    { $group: { _id: '$clientId', total: { $sum: '$totalAmount' } } },
  ]);
  return result[0]?.total || 0;
}
```

### 6. **Transactions MongoDB**

Pour garantir l'intégrité des données (nécessite MongoDB en mode Replica Set) :

```typescript
const session = await this.orderModel.startSession();
session.startTransaction();
try {
  await this.clientModel.updateOne({ _id: clientId }, { status: 'active' }, { session });
  await this.orderModel.create([{ clientId, ... }], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## 📊 Comparaison : Avant / Après MongoDB

| Critère | Sans Base de Données | Avec MongoDB |
|---------|----------------------|--------------|
| **Persistance** | Données perdues au redémarrage | Données persistées |
| **Recherche** | Impossible | Requêtes flexibles |
| **Scalabilité** | Limitée | Haute performance |
| **Historique** | Pas d'historique | Audit complet |
| **CRUD** | À développer manuellement | Intégré avec Mongoose |

---

## 🎓 Résumé

Vous avez appris à :
- ✅ Installer et configurer **MongoDB** avec Docker
- ✅ Intégrer **Mongoose** dans NestJS
- ✅ Créer des **schémas** et **modèles** MongoDB
- ✅ Implémenter le pattern **Database per Service**
- ✅ Créer des endpoints **CRUD** (Create, Read, Update, Delete)
- ✅ Combiner **TCP (synchrone)** et **RabbitMQ (asynchrone)** avec MongoDB

**Prochaine étape** : Explorez les agrégations, transactions, et optimisations de performances !

---

## 📚 Ressources

- [Documentation MongoDB](https://www.mongodb.com/docs/)
- [Documentation Mongoose](https://mongoosejs.com/docs/)
- [NestJS MongoDB](https://docs.nestjs.com/techniques/mongodb)
- [MongoDB Aggregations](https://www.mongodb.com/docs/manual/aggregation/)
- [Database per Service Pattern](https://microservices.io/patterns/data/database-per-service.html)

---

**Bon courage pour l'implémentation de la persistance avec MongoDB ! 🗄️🚀**
