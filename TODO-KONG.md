# Tutoriel : API Gateway avec Kong

## 🎯 Objectifs d'Apprentissage

Dans ce tutoriel, vous allez apprendre à :
- Comprendre le rôle d'un **API Gateway** dans une architecture microservices
- Organiser votre code en **domaines métiers** (Domain-Driven Design)
- Configurer et déployer **Kong API Gateway**
- Router les requêtes vers différentes gateways selon les domaines
- Centraliser le point d'entrée de votre architecture

## 📚 Contexte

Actuellement, votre architecture expose plusieurs gateways directement au client :
- Gateway principal sur le port 3000
- Potentiellement d'autres gateways pour différents domaines

**Problème** : Le client doit connaître tous les ports et endpoints de chaque gateway.

**Solution** : Un **API Gateway** comme Kong centralise l'accès et route les requêtes intelligemment.

## 🏗️ Architecture Cible

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ HTTP :8000
       │
┌──────▼──────────────┐
│   Kong API Gateway  │  (Port 8000)
│   (Point d'entrée   │
│    centralisé)      │
└──────┬──────────────┘
       │
       ├────/ab/*───────────────┐
       │                        │
       │                  ┌─────▼──────────┐
       │                  │  Gateway AB    │ (Port 3000)
       │                  │  (Domain AB)   │
       │                  └────────────────┘
       │
       ├────/marketplace/*──────┐
                                │
                          ┌─────▼──────────┐
                          │Gateway Market. │ (Port 3001)
                          │ (Domain Market)│
                          └────────────────┘
```

**Avantages** :
- ✅ Point d'entrée unique (`:8000`)
- ✅ Routing par domaine métier
- ✅ Possibilité d'ajouter : authentification, rate limiting, monitoring...

---

## 📋 Prérequis

- Docker et Docker Compose installés
- Connaissances de base en NestJS
- Avoir suivi le tutoriel TODO-RMQ.md (recommandé)

---

## 🛠️ Étape 1 : Réorganisation en Domaines Métiers

### Objectif
Restructurer le code pour séparer les domaines **AB** et **Marketplace**, en suivant les principes du Domain-Driven Design (DDD).

### 1.1 Créer l'arborescence des domaines

À la racine du projet, créez la structure suivante :

```bash
mkdir -p domains/ab
mkdir -p domains/marketplace
```

Votre structure cible doit ressembler à :

```
microservices-demos/
├── domains/
│   ├── ab/
│   │   ├── gateway-ab/
│   │   ├── service-a/
│   │   └── service-b/
│   └── marketplace/
│       ├── gateway-marketplace/
│       ├── service-clients/
│       └── service-orders/
├── kong.yml
├── compose.yaml
└── package.json
```

### 1.2 Déplacer les projets existants

**Domaine AB** :
```bash
# Déplacer les services A et B
mv service-a domains/ab/
mv service-b domains/ab/
```

**Domaine Marketplace** :
```bash
# Déplacer les services clients et orders
mv service-clients domains/marketplace/
mv service-orders domains/marketplace/
```

### 1.3 Créer les Gateways de domaine

Astuce: plutot que de créer de nouvelles gateways vous pouvez dupliquer / refactoriser la gateway initiale...
Penser a modifier les ports pour chaque gateway.
Par exemple port 3000 pour la gateway-ab, et port 3300 pour la gateway-marketplace

### 1.4 Configurer les `package.json` des gateways

**`domains/ab/gateway-ab/package.json`** - Modifier le `name` :

```json
{
  "name": "gateway-ab",
  "version": "1.0.0",
  ...
}
```

**`domains/marketplace/gateway-marketplace/package.json`** - Modifier le `name` :

```json
{
  "name": "gateway-marketplace",
  "version": "1.0.0",
  ...
}
```

### 1.5 Mettre à jour la configuration Turbo

**`package.json` (racine)** - Mettre à jour les workspaces :

```json
{
  "name": "microservices-demos",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "domains/ab/*",
    "domains/marketplace/*"
  ],
  "devDependencies": {
    "turbo": "^2.3.3"
  },
  "scripts": {
    "dev": "turbo run start:dev"
  }
}
```

### ✅ Point de Contrôle 1

Vérifiez que Turbo détecte bien tous les packages :

```bash
npx turbo run build --dry-run
```

Vous devriez voir :
- `gateway-ab`
- `gateway-marketplace`
- `service-a`
- `service-b`
- `service-clients`
- `service-orders`

Vérifiez que Turbo lance bien toutes les applications et que vous avez accès à la gateway-ab en direct par exemple... (http://localhost:3000/hello) 

---

## 🛠️ Étape 2 : Installation et Configuration de Kong

### 2.1 Comprendre Kong

**Kong** est un API Gateway open-source qui agit comme un proxy inversé intelligent :
- Il reçoit toutes les requêtes clients
- Il route vers les services backend selon des règles
- Il peut ajouter des plugins (auth, logging, rate limiting...)

**Mode DB-less** : Configuration via fichier YAML (idéal pour le développement).

### 2.2 Ajouter Kong au `compose.yaml`

**`compose.yaml`** - Ajouter le service Kong :

```yaml
services:
  # ... vos services existants (rabbitmq, etc.)

  kong:
    image: kong:latest
    container_name: kong
    environment:
      KONG_DATABASE: "off" # Mode DB-less (configuration via fichier)
      KONG_DECLARATIVE_CONFIG: /usr/local/kong/declarative/kong.yml
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
      KONG_PROXY_LISTEN: "0.0.0.0:8000"
    ports:
      - "8000:8000"   # Port du proxy (entrée des requêtes)
      - "8001:8001"   # Port de l'API d'administration
    volumes:
      - ./kong.yml:/usr/local/kong/declarative/kong.yml:ro
```

**Explications** :
- `KONG_DATABASE: "off"` : Pas de base de données, configuration déclarative
- `KONG_DECLARATIVE_CONFIG` : Chemin vers le fichier de configuration
- `KONG_ADMIN_LISTEN` : API d'administration (pour monitoring)
- `KONG_PROXY_LISTEN` : Port où Kong écoute les requêtes clients
- Volume : Monte le fichier `kong.yml` en lecture seule

### 2.3 Démarrer Kong

```bash
docker-compose up -d kong
```

Vérifiez que Kong est lancé :

```bash
curl http://localhost:8001
```

Vous devriez obtenir une réponse JSON avec les informations de Kong.

### ✅ Point de Contrôle 2

- ✅ Kong démarre sans erreur
- ✅ L'API d'administration répond sur `:8001`
- ✅ Le port `:8000` est prêt (proxy)

---

## 🛠️ Étape 3 : Configuration du Routage (À Compléter)

### Objectif
Configurer Kong pour router les requêtes vers les bonnes gateways selon le chemin.

### 3.1 Structure du fichier `kong.yml`

Kong utilise un fichier YAML déclaratif avec cette structure :

```yaml
_format_version: "3.0"  # Version du format de configuration
_transform: true         # Active les transformations de requêtes

services:                # Liste des services backend
  - name: __________     # Nom du service (ex: gateway-ab)
    url: __________      # URL du service backend (ex: http://host.docker.internal:3000)
    routes:              # Routes associées à ce service
      - name: __________      # Nom de la route
        paths:                # Chemins qui déclenchent cette route
          - __________        # Ex: /ab
        strip_path: true      # Retire le préfixe du path avant de transmettre
```

### 3.2 À FAIRE : Configurer le routing pour `gateway-ab`

**Objectif** : Toutes les requêtes vers `http://localhost:8000/ab/*` doivent être routées vers `gateway-ab` (port 3000).

Complétez le fichier `kong.yml` à la racine :

```yaml
_format_version: "3.0"
_transform: true

services:
  # 🎯 Service 1 : Gateway AB (Domain AB)
  - name: __________ # TODO: Nom du service (ex: gateway-ab)
    url: __________ # TODO: URL du backend (utiliser host.docker.internal pour accéder à l'hôte depuis le conteneur)
    routes:
      - name: __________ # TODO: Nom de la route
        paths:
          - __________ # TODO: Chemin (ex: /ab)
        strip_path: __________ # TODO: true ou false ? (retire /ab avant de transmettre)
```

**Indice** :
- `host.docker.internal` : Permet à Kong (dans Docker) d'accéder aux services sur votre machine hôte
- `strip_path: true` : Retire le préfixe `/ab` de l'URL avant de l'envoyer à la gateway

### 3.3 À FAIRE : Configurer le routing pour `gateway-marketplace`

**Objectif** : Toutes les requêtes vers `http://localhost:8000/marketplace/*` doivent être routées vers `gateway-marketplace` (port 3001).

Ajoutez un second service dans `kong.yml` :

```yaml
  # 🎯 Service 2 : Gateway Marketplace (Domain Marketplace)
  - name: __________ # TODO: Nom du service
    url: __________ # TODO: URL du backend (port 3001)
    routes:
      - name: __________ # TODO: Nom de la route
        paths:
          - __________ # TODO: Chemin (ex: /marketplace)
        strip_path: __________ # TODO: true ou false ?
```

### 3.4 Recharger la configuration Kong

Après modification du `kong.yml` :

```bash
docker-compose restart kong
```

### ✅ Point de Contrôle 3

Démarrez vos gateways :

```bash
# Gateway AB (port 3000)
cd domains/ab/gateway-ab
npm run start:dev

# Gateway Marketplace (port 3001)
cd domains/marketplace/gateway-marketplace
npm run start:dev
```

Testez le routing via Kong :

```bash
# Requête vers le domaine AB
curl http://localhost:8000/ab

# Requête vers le domaine Marketplace
curl http://localhost:8000/marketplace
```

**Vérifications** :
- ✅ Kong route correctement vers `gateway-ab`
- ✅ Kong route correctement vers `gateway-marketplace`
- ✅ Les logs des gateways montrent les requêtes reçues

---

## 🔍 Comprendre `strip_path`

### Avec `strip_path: true`

```
Client → http://localhost:8000/ab/services
                                  ↓ Kong retire /ab
Gateway AB → Reçoit /services
```

### Avec `strip_path: false`

```
Client → http://localhost:8000/ab/services
                                  ↓ Kong garde /ab
Gateway AB → Reçoit /ab/services
```

**Conseil** : Utilisez `strip_path: true` pour garder vos gateways agnostiques du préfixe de domaine.

---

## 🚀 Pour Aller Plus Loin (Extensions Optionnelles)

### 1. **Ajouter un plugin Rate Limiting**

Limiter le nombre de requêtes par client :

```yaml
services:
  - name: gateway-ab
    url: http://host.docker.internal:3000
    routes:
      - name: gateway-ab-route
        paths:
          - /ab
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 10  # Max 10 requêtes/minute
```

### 2. **Ajouter un plugin de Logging**

Loguer toutes les requêtes :

```yaml
plugins:
  - name: file-log
    config:
      path: /tmp/kong.log
```

### 3. **Authentification JWT**

Protéger vos APIs avec des tokens JWT :

```yaml
plugins:
  - name: jwt
```

### 4. **Monitoring avec Konga**

Installer Konga (interface graphique pour gérer Kong) :

```yaml
konga:
  image: pantsel/konga
  ports:
    - "1337:1337"
  environment:
    NODE_ENV: development
```

### 5. **Load Balancing**

Lancer plusieurs instances d'une gateway et répartir la charge :

```yaml
services:
  - name: gateway-ab
    url: http://host.docker.internal:3000
  - name: gateway-ab-2
    url: http://host.docker.internal:3002
```

---

## 📊 Comparaison : Avant / Après Kong

| Critère | Sans Kong | Avec Kong |
|---------|-----------|-----------|
| **Points d'entrée** | Multiples (`:3000`, `:3001`, ...) | Unique (`:8000`) |
| **Routing** | Géré par le client | Centralisé dans Kong |
| **Plugins** | À implémenter dans chaque gateway | Centralisés (auth, logs...) |
| **Scalabilité** | Complexe | Load balancing intégré |
| **Monitoring** | Dispersé | Centralisé via Admin API |

---

## 🎓 Résumé

Vous avez appris à :
- ✅ Organiser votre code en **domaines métiers** (DDD)
- ✅ Créer plusieurs **gateways spécialisées** par domaine
- ✅ Installer et configurer **Kong API Gateway**
- ✅ Router les requêtes selon des **paths** (`/ab`, `/marketplace`)
- ✅ Comprendre le rôle d'un **API Gateway** dans une architecture microservices

**Prochaine étape** : Explorez les plugins Kong pour ajouter de l'authentification, du monitoring, et du rate limiting !

---

## 🧪 Exercice Final : Vérification Complète

### Scénario
Le client envoie une requête pour générer une facture via Kong.

**Flux attendu** :
```
Client
  → POST http://localhost:8000/marketplace/clients/123/generate-invoice
  → Kong route vers gateway-marketplace (port 3001)
  → gateway-marketplace appelle service-clients (TCP)
  → service-clients publie dans RabbitMQ
  → service-orders consomme le message
```

### Commande de test

```bash
curl -X POST http://localhost:8000/marketplace/clients/123/generate-invoice
```

### Vérifications

1. ✅ Le client reçoit une réponse immédiate
2. ✅ Logs de Kong : Requête routée vers `gateway-marketplace`
3. ✅ Logs de `gateway-marketplace` : Requête reçue
4. ✅ Logs de `service-clients` : Message publié dans RabbitMQ
5. ✅ Logs de `service-orders` : Facture traitée
6. ✅ Interface RabbitMQ : Message traité dans la queue `invoices`

---

## 📚 Ressources

- [Documentation Kong Gateway](https://docs.konghq.com/gateway/latest/)
- [Kong Configuration Reference](https://docs.konghq.com/gateway/latest/reference/configuration/)
- [Kong Plugins Hub](https://docs.konghq.com/hub/)
- [Domain-Driven Design (DDD)](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

**Bon courage pour la mise en place ! 🚀**
