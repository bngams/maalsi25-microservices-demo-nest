# Tutoriel : Service Registry avec Consul - Approche Bibliothèque Partagée

## 🎯 Objectifs d'Apprentissage

Dans ce tutoriel, vous allez apprendre à :
- Créer une **bibliothèque partagée** (shared library) dans un monorepo
- Implémenter un **module NestJS réutilisable** pour Consul
- Utiliser les **Dynamic Modules** de NestJS
- Appliquer le principe **DRY** (Don't Repeat Yourself)
- Gérer des dépendances partagées avec Turbo/Workspaces
- Configurer des modules via des options injectables

## 📚 Contexte

Dans le tutoriel `TODO-CONSUL.md`, nous avons copié le fichier `consul.service.ts` dans chaque service. Cela pose des problèmes :
- ❌ **Duplication de code** : Le même code est répété 4 fois (service-a, service-b, service-clients, service-orders)
- ❌ **Maintenance difficile** : Une modification nécessite de mettre à jour 4 fichiers
- ❌ **Risque d'incohérence** : Les services peuvent avoir des versions différentes du code
- ❌ **Violation du DRY** : Don't Repeat Yourself

**Solution** : Créer une bibliothèque partagée `@shared/consul` qui expose un module NestJS réutilisable.

## 🏗️ Architecture Cible

```
microservices-demos/
├── shared/                           # 📦 Bibliothèques partagées
│   └── consul/
│       ├── src/
│       │   ├── consul.module.ts      # Module NestJS réutilisable
│       │   ├── consul.service.ts     # Service d'enregistrement
│       │   └── index.ts              # Exports publics
│       ├── package.json
│       └── tsconfig.json
├── domains/
│   ├── ab/
│   │   ├── service-a/                # ✅ Importe @shared/consul
│   │   └── service-b/                # ✅ Importe @shared/consul
│   └── marketplace/
│       ├── service-clients/          # ✅ Importe @shared/consul
│       └── service-orders/           # ✅ Importe @shared/consul
└── package.json                      # Workspaces configuration
```

**Avantages** :
- ✅ Code centralisé et maintenable
- ✅ Configuration simplifiée (une ligne d'import)
- ✅ Mise à jour propagée automatiquement à tous les services
- ✅ Réutilisabilité et cohérence

---

## 📋 Prérequis

- Avoir suivi TODO-CONSUL.md (Étapes 1 et 2)
- Comprendre les bases des modules NestJS
- Connaître les concepts de monorepo et workspaces

---

## 🛠️ Étape 1 : Créer la Bibliothèque Partagée

### 1.1 Créer la structure de la bibliothèque

À la racine du projet :

```bash
mkdir -p shared/consul/src
cd shared/consul
```

### 1.2 Initialiser le `package.json`

**`shared/consul/package.json`** :

```json
{
  "name": "@shared/consul",
  "version": "1.0.0",
  "description": "NestJS Consul Service Registry module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "consul": "^1.2.0"
  },
  "devDependencies": {
    "@types/consul": "^0.40.0",
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0"
  }
}
```

**Explications** :
- `name: "@shared/consul"` : Nom du package avec un scope `@shared`
- `main` et `types` : Points d'entrée pour JavaScript et TypeScript
- `peerDependencies` : NestJS doit être fourni par le projet parent

### 1.3 Configurer TypeScript

**`shared/consul/tsconfig.json`** :

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Installer les dépendances

```bash
npm install
```

### ✅ Point de Contrôle 1

```bash
# Depuis shared/consul/
npm run build
# Devrait compiler sans erreur (même si src/ est vide pour l'instant)
```

---

## 🛠️ Étape 2 : Implémenter le Module Consul Réutilisable

### 2.1 Créer le Service Consul

**`shared/consul/src/consul.service.ts`** :

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import * as Consul from 'consul';
import { CONSUL_OPTIONS } from './consul.constants';
import { ConsulModuleOptions } from './consul.interface';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private consul: Consul.Consul;
  private serviceId: string;

  constructor(
    @Inject(CONSUL_OPTIONS) private options: ConsulModuleOptions,
  ) {
    this.consul = new Consul({
      host: options.consulHost || process.env.CONSUL_HOST || 'localhost',
      port: options.consulPort || process.env.CONSUL_PORT || '8500',
    });
  }

  async onModuleInit() {
    const serviceName = this.options.serviceName;
    const servicePort = this.options.servicePort;
    const serviceHost = this.options.serviceHost || 'host.docker.internal';
    const healthCheckPath = this.options.healthCheckPath || '/health';

    this.serviceId = `${serviceName}-${servicePort}`;

    console.log(`📝 [Consul] Registering service: ${this.serviceId}`);

    await this.consul.agent.service.register({
      id: this.serviceId,
      name: serviceName,
      address: serviceHost,
      port: servicePort,
      tags: this.options.tags || [],
      meta: this.options.meta || {},
      check: {
        http: `http://${serviceHost}:${servicePort}${healthCheckPath}`,
        interval: this.options.healthCheckInterval || '10s',
        timeout: this.options.healthCheckTimeout || '5s',
      },
    });

    console.log(`✅ [Consul] Service registered successfully: ${this.serviceId}`);
  }

  async onModuleDestroy() {
    console.log(`📤 [Consul] Deregistering service: ${this.serviceId}`);
    try {
      await this.consul.agent.service.deregister(this.serviceId);
      console.log(`✅ [Consul] Service deregistered: ${this.serviceId}`);
    } catch (error) {
      console.error(`❌ [Consul] Error deregistering service:`, error);
    }
  }

  /**
   * Découvrir les instances d'un service
   */
  async getServiceInstances(serviceName: string): Promise<Array<{ host: string; port: number }>> {
    const services = await this.consul.health.service({
      service: serviceName,
      passing: true, // Seulement les instances en bonne santé
    });

    return services.map(s => ({
      host: s.Service.Address,
      port: s.Service.Port,
    }));
  }

  /**
   * Découvrir une instance d'un service (load balancing simple)
   */
  async getServiceUrl(serviceName: string): Promise<string> {
    const instances = await this.getServiceInstances(serviceName);

    if (instances.length === 0) {
      throw new Error(`Service ${serviceName} not found in Consul or all instances are unhealthy`);
    }

    // Simple round-robin (première instance disponible)
    const instance = instances[0];
    return `http://${instance.host}:${instance.port}`;
  }
}
```

### 2.2 Créer les interfaces et constantes

**`shared/consul/src/consul.interface.ts`** :

```typescript
export interface ConsulModuleOptions {
  /**
   * Nom du service à enregistrer dans Consul
   */
  serviceName: string;

  /**
   * Port du service
   */
  servicePort: number;

  /**
   * Hôte du service (défaut: host.docker.internal)
   */
  serviceHost?: string;

  /**
   * Chemin du health check (défaut: /health)
   */
  healthCheckPath?: string;

  /**
   * Intervalle des health checks (défaut: 10s)
   */
  healthCheckInterval?: string;

  /**
   * Timeout des health checks (défaut: 5s)
   */
  healthCheckTimeout?: string;

  /**
   * Hôte de Consul (défaut: localhost)
   */
  consulHost?: string;

  /**
   * Port de Consul (défaut: 8500)
   */
  consulPort?: string;

  /**
   * Tags Consul optionnels
   */
  tags?: string[];

  /**
   * Métadonnées optionnelles
   */
  meta?: Record<string, string>;
}
```

**`shared/consul/src/consul.constants.ts`** :

```typescript
export const CONSUL_OPTIONS = 'CONSUL_OPTIONS';
```

### 2.3 Créer le Module Dynamique

**`shared/consul/src/consul.module.ts`** :

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { ConsulService } from './consul.service';
import { ConsulModuleOptions } from './consul.interface';
import { CONSUL_OPTIONS } from './consul.constants';

@Module({})
export class ConsulModule {
  /**
   * Enregistrement synchrone du module
   */
  static register(options: ConsulModuleOptions): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        {
          provide: CONSUL_OPTIONS,
          useValue: options,
        },
        ConsulService,
      ],
      exports: [ConsulService],
      global: false,
    };
  }

  /**
   * Enregistrement asynchrone (pour récupérer la config depuis un ConfigService)
   */
  static registerAsync(options: {
    useFactory: (...args: any[]) => Promise<ConsulModuleOptions> | ConsulModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        {
          provide: CONSUL_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        ConsulService,
      ],
      exports: [ConsulService],
      global: false,
    };
  }
}
```

**Explications** :
- `register()` : Configuration synchrone (valeurs directes)
- `registerAsync()` : Configuration asynchrone (via factory, ex: ConfigService)
- `global: false` : Le module doit être importé explicitement dans chaque module

### 2.4 Créer le point d'entrée

**`shared/consul/src/index.ts`** :

```typescript
export * from './consul.module';
export * from './consul.service';
export * from './consul.interface';
export * from './consul.constants';
```

### 2.5 Compiler la bibliothèque

```bash
cd shared/consul
npm run build
```

### ✅ Point de Contrôle 2

Vérifiez que le dossier `dist/` a été créé avec :
- `consul.module.js` + `consul.module.d.ts`
- `consul.service.js` + `consul.service.d.ts`
- `index.js` + `index.d.ts`

---

## 🛠️ Étape 3 : Configurer le Monorepo

### 3.1 Mettre à jour le `package.json` racine

**`package.json` (racine)** :

```json
{
  "name": "microservices-demos",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "shared/*",
    "domains/ab/*",
    "domains/marketplace/*"
  ],
  "devDependencies": {
    "turbo": "^2.3.3"
  },
  "scripts": {
    "dev": "turbo run start:dev",
    "build": "turbo run build"
  }
}
```

**Note** : `shared/*` est ajouté aux workspaces.

### 3.2 Réinstaller les dépendances

```bash
# À la racine du projet
npm install
```

Cela crée des liens symboliques entre `@shared/consul` et les autres packages.

### ✅ Point de Contrôle 3

Vérifiez que le workspace est reconnu :

```bash
npm ls @shared/consul
# Devrait afficher @shared/consul@1.0.0
```

---

## 🛠️ Étape 4 : Utiliser la Bibliothèque dans les Services

### 4.1 Ajouter la dépendance dans service-a

**`domains/ab/service-a/package.json`** :

```json
{
  "name": "service-a",
  "version": "1.0.0",
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/microservices": "^10.0.0",
    "@shared/consul": "workspace:*",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  }
}
```

**Note** : `workspace:*` indique d'utiliser la version du workspace local.

Installez les dépendances :

```bash
cd domains/ab/service-a
npm install
```

### 4.2 Supprimer l'ancien `consul.service.ts`

```bash
# Dans service-a
rm src/consul.service.ts
```

### 4.3 Importer le `ConsulModule`

**`domains/ab/service-a/src/app.module.ts`** :

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsulModule } from '@shared/consul';

@Module({
  imports: [
    ConsulModule.register({
      serviceName: process.env.SERVICE_NAME || 'service-a',
      servicePort: parseInt(process.env.SERVICE_PORT || '3001', 10),
      serviceHost: process.env.SERVICE_HOST || 'host.docker.internal',
      healthCheckPath: '/health',
      healthCheckInterval: '10s',
      healthCheckTimeout: '5s',
      tags: ['domain:ab', 'type:tcp'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Explications** :
- ✅ Plus besoin de créer `ConsulService` manuellement
- ✅ Configuration en une seule ligne avec `ConsulModule.register()`
- ✅ Tous les paramètres sont documentés (autocomplete TypeScript)

### 4.4 Le contrôleur reste inchangé

**`domains/ab/service-a/src/app.controller.ts`** :

```typescript
import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'service-a' };
  }

  @MessagePattern({ cmd: 'get_service_a' })
  getServiceA() {
    return this.appService.getServiceA();
  }
}
```

### ✅ Point de Contrôle 4

Démarrez le service :

```bash
cd domains/ab/service-a
SERVICE_NAME=service-a SERVICE_PORT=3001 npm run start:dev
```

**Vérifications** :
1. Logs : `📝 [Consul] Registering service: service-a-3001`
2. Logs : `✅ [Consul] Service registered successfully: service-a-3001`
3. Interface Consul : [http://localhost:8500](http://localhost:8500) → Service `service-a` visible
4. Health check : Status **passing** (vert)

---

## 🛠️ Étape 5 : Répliquer pour Tous les Services

### 5.1 Service B

**`domains/ab/service-b/package.json`** - Ajouter :

```json
"dependencies": {
  "@shared/consul": "workspace:*"
}
```

**`domains/ab/service-b/src/app.module.ts`** :

```typescript
import { ConsulModule } from '@shared/consul';

@Module({
  imports: [
    ConsulModule.register({
      serviceName: 'service-b',
      servicePort: parseInt(process.env.SERVICE_PORT || '3002', 10),
      tags: ['domain:ab', 'type:tcp'],
    }),
  ],
  // ...
})
export class AppModule {}
```

### 5.2 Service Clients

**`domains/marketplace/service-clients/package.json`** - Ajouter :

```json
"dependencies": {
  "@shared/consul": "workspace:*"
}
```

**`domains/marketplace/service-clients/src/app.module.ts`** :

```typescript
import { ConsulModule } from '@shared/consul';

@Module({
  imports: [
    ConsulModule.register({
      serviceName: 'service-clients',
      servicePort: parseInt(process.env.SERVICE_PORT || '3003', 10),
      tags: ['domain:marketplace', 'type:tcp'],
    }),
    // ... ClientsModule pour RabbitMQ
  ],
  // ...
})
export class AppModule {}
```

### 5.3 Service Orders

**`domains/marketplace/service-orders/package.json`** - Ajouter :

```json
"dependencies": {
  "@shared/consul": "workspace:*"
}
```

**`domains/marketplace/service-orders/src/app.module.ts`** :

```typescript
import { ConsulModule } from '@shared/consul';

@Module({
  imports: [
    ConsulModule.register({
      serviceName: 'service-orders',
      servicePort: parseInt(process.env.SERVICE_PORT || '3004', 10),
      tags: ['domain:marketplace', 'type:rabbitmq'],
    }),
  ],
  // ...
})
export class AppModule {}
```

### ✅ Point de Contrôle 5

Démarrez tous les services et vérifiez dans Consul :

```bash
# Terminal 1
cd domains/ab/service-a
SERVICE_NAME=service-a SERVICE_PORT=3001 npm run start:dev

# Terminal 2
cd domains/ab/service-b
SERVICE_NAME=service-b SERVICE_PORT=3002 npm run start:dev

# Terminal 3
cd domains/marketplace/service-clients
SERVICE_NAME=service-clients SERVICE_PORT=3003 npm run start:dev

# Terminal 4
cd domains/marketplace/service-orders
SERVICE_NAME=service-orders SERVICE_PORT=3004 npm run start:dev
```

**Interface Consul** : [http://localhost:8500/ui/dc1/services](http://localhost:8500/ui/dc1/services)

Vous devriez voir :
- ✅ `service-a` (tags: domain:ab, type:tcp)
- ✅ `service-b` (tags: domain:ab, type:tcp)
- ✅ `service-clients` (tags: domain:marketplace, type:tcp)
- ✅ `service-orders` (tags: domain:marketplace, type:rabbitmq)

---

## 🛠️ Étape 6 : Découverte de Services dans les Gateways

### 6.1 Créer une bibliothèque de découverte

**`shared/consul/src/consul-discovery.service.ts`** :

```typescript
import { Injectable, Inject } from '@nestjs/common';
import * as Consul from 'consul';
import { CONSUL_OPTIONS } from './consul.constants';
import { ConsulModuleOptions } from './consul.interface';

@Injectable()
export class ConsulDiscoveryService {
  private consul: Consul.Consul;

  constructor(@Inject(CONSUL_OPTIONS) private options: ConsulModuleOptions) {
    this.consul = new Consul({
      host: options.consulHost || 'localhost',
      port: options.consulPort || '8500',
    });
  }

  async getServiceInstances(serviceName: string): Promise<Array<{ host: string; port: number }>> {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true,
      });

      return services.map(s => ({
        host: s.Service.Address,
        port: s.Service.Port,
      }));
    } catch (error) {
      console.error(`❌ [Consul Discovery] Error finding service ${serviceName}:`, error);
      throw error;
    }
  }

  async getServiceUrl(serviceName: string): Promise<string> {
    const instances = await this.getServiceInstances(serviceName);

    if (instances.length === 0) {
      throw new Error(`Service ${serviceName} not found in Consul`);
    }

    const instance = instances[0];
    const url = `http://${instance.host}:${instance.port}`;
    console.log(`🔍 [Consul Discovery] Found ${serviceName} at ${url}`);

    return url;
  }
}
```

**`shared/consul/src/consul.module.ts`** - Ajouter le provider :

```typescript
import { ConsulDiscoveryService } from './consul-discovery.service';

@Module({})
export class ConsulModule {
  static register(options: ConsulModuleOptions): DynamicModule {
    return {
      module: ConsulModule,
      providers: [
        { provide: CONSUL_OPTIONS, useValue: options },
        ConsulService,
        ConsulDiscoveryService, // ✅ Ajouter
      ],
      exports: [ConsulService, ConsulDiscoveryService], // ✅ Exporter
      global: false,
    };
  }

  // ... registerAsync
}
```

**`shared/consul/src/index.ts`** - Exporter :

```typescript
export * from './consul.module';
export * from './consul.service';
export * from './consul-discovery.service'; // ✅ Ajouter
export * from './consul.interface';
export * from './consul.constants';
```

### 6.2 Utiliser la découverte dans le Gateway

**`domains/ab/gateway-ab/package.json`** :

```json
"dependencies": {
  "@shared/consul": "workspace:*"
}
```

**`domains/ab/gateway-ab/src/app.module.ts`** :

```typescript
import { Module } from '@nestjs/common';
import { ConsulModule } from '@shared/consul';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConsulModule.register({
      serviceName: 'gateway-ab',
      servicePort: 3000,
      consulHost: 'localhost',
      consulPort: '8500',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**`domains/ab/gateway-ab/src/app.service.ts`** :

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConsulDiscoveryService } from '@shared/consul';

@Injectable()
export class AppService implements OnModuleInit {
  private serviceAClient: ClientProxy;
  private serviceBClient: ClientProxy;

  constructor(private consulDiscovery: ConsulDiscoveryService) {}

  async onModuleInit() {
    // Découvrir service-a
    const serviceAUrl = await this.consulDiscovery.getServiceUrl('service-a');
    const [hostA, portA] = this.parseUrl(serviceAUrl);

    this.serviceAClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: hostA, port: portA },
    });

    // Découvrir service-b
    const serviceBUrl = await this.consulDiscovery.getServiceUrl('service-b');
    const [hostB, portB] = this.parseUrl(serviceBUrl);

    this.serviceBClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: hostB, port: portB },
    });

    console.log('✅ [Gateway AB] Dynamic service discovery completed');
  }

  private parseUrl(url: string): [string, number] {
    const urlObj = new URL(url);
    return [urlObj.hostname, parseInt(urlObj.port, 10)];
  }

  getServiceA() {
    return this.serviceAClient.send({ cmd: 'get_service_a' }, {});
  }

  getServiceB() {
    return this.serviceAClient.send({ cmd: 'get_service_b' }, {});
  }
}
```

### ✅ Point de Contrôle 6

Démarrez le gateway :

```bash
cd domains/ab/gateway-ab
npm run start:dev
```

**Vérifications** :
1. Logs : `🔍 [Consul Discovery] Found service-a at http://...`
2. Logs : `✅ [Gateway AB] Dynamic service discovery completed`
3. Test :
   ```bash
   curl http://localhost:3000/a
   ```
4. Le gateway découvre et communique avec les services via Consul

---

## 🚀 Pour Aller Plus Loin

### 1. **Configuration Asynchrone avec ConfigService**

**`app.module.ts`** :

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConsulModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        serviceName: config.get('SERVICE_NAME'),
        servicePort: config.get('SERVICE_PORT'),
        consulHost: config.get('CONSUL_HOST'),
      }),
    }),
  ],
})
export class AppModule {}
```

### 2. **Load Balancing avec Round-Robin**

Modifier `ConsulDiscoveryService` :

```typescript
private currentIndex = new Map<string, number>();

async getServiceUrl(serviceName: string): Promise<string> {
  const instances = await this.getServiceInstances(serviceName);

  if (instances.length === 0) {
    throw new Error(`Service ${serviceName} not found`);
  }

  // Round-robin
  const index = this.currentIndex.get(serviceName) || 0;
  const instance = instances[index % instances.length];
  this.currentIndex.set(serviceName, index + 1);

  return `http://${instance.host}:${instance.port}`;
}
```

### 3. **Filtrage par Tags**

```typescript
async getServicesByTag(serviceName: string, tag: string) {
  const services = await this.consul.health.service({
    service: serviceName,
    tag: tag,
    passing: true,
  });
  // ...
}
```

### 4. **Cache des Services**

Ajouter un cache pour éviter d'interroger Consul à chaque requête :

```typescript
private cache = new Map<string, { instances: any[]; timestamp: number }>();
private cacheTTL = 5000; // 5 secondes

async getServiceInstances(serviceName: string) {
  const cached = this.cache.get(serviceName);
  const now = Date.now();

  if (cached && now - cached.timestamp < this.cacheTTL) {
    return cached.instances;
  }

  const instances = await this.fetchFromConsul(serviceName);
  this.cache.set(serviceName, { instances, timestamp: now });

  return instances;
}
```

---

## 📊 Comparaison : Approche avec/sans Bibliothèque

| Critère | Sans Bibliothèque | Avec `@shared/consul` |
|---------|-------------------|----------------------|
| **Lignes de code par service** | ~80 lignes | ~10 lignes |
| **Duplication** | ❌ Oui (4 fois) | ✅ Non (centralisé) |
| **Maintenance** | ❌ Difficile | ✅ Facile |
| **Cohérence** | ❌ Risque d'erreurs | ✅ Garantie |
| **Temps d'intégration** | 15 minutes | 2 minutes |
| **Autocomplete TypeScript** | ❌ Limité | ✅ Complet |

---

## 🎓 Résumé

Vous avez appris à :
- ✅ Créer une **bibliothèque partagée** dans un monorepo
- ✅ Implémenter un **Dynamic Module NestJS** réutilisable
- ✅ Configurer des **workspaces** pour partager du code
- ✅ Utiliser `workspace:*` pour les dépendances locales
- ✅ Appliquer le principe **DRY** (Don't Repeat Yourself)
- ✅ Simplifier l'intégration de Consul dans tous les services
- ✅ Créer une API claire et documentée avec TypeScript

**Avantages clés** :
- 🚀 Réduction de 90% du code dupliqué
- 🔧 Maintenance centralisée
- 📦 Réutilisabilité entre projets
- ✅ Cohérence garantie

---

## 🧪 Exercice Final

### Tâche
Créer une seconde bibliothèque `@shared/health` qui expose un endpoint `/health` standardisé pour tous les services.

**Spécifications** :
- Endpoint : `GET /health`
- Réponse :
  ```json
  {
    "status": "ok",
    "service": "service-a",
    "uptime": 12345,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
  ```

**Indice** : Créer un `HealthModule` avec un `HealthController`.

---

## 📚 Ressources

- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules)
- [NPM Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Consul Node.js Client](https://github.com/silas/node-consul)

---

**Bon courage pour l'implémentation ! 🚀**
