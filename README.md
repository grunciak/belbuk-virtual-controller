# Belbuk Virtual Controller

Symulator fizycznego sterownika dla systemu Belbuk. Serwuje dane przez GraphQL API zgodne ze schematem rzeczywistego sterownika.

## Szybki start

### Opcja 1: Docker (zalecane)

```bash
docker-compose up -d
```

### Opcja 2: Node.js

```bash
npm install
npm start
```

## Endpointy

| Endpoint | URL |
|----------|-----|
| GraphQL API | http://localhost:4000/graphql |
| GraphQL Subscriptions | ws://localhost:4000/graphql |
| Health Check | http://localhost:4000/health |

## Dane logowania

```
Login: admin
Hasło: admin
```

## Przykładowe zapytania

### Pobranie tokena autoryzacji

```graphql
query {
  getAuthToken(login: "admin", password: "admin") {
    mainToken
    refreshToken
  }
}
```

### Pobranie konfiguracji

```graphql
query {
  configuration {
    site
    zones { id, name }
    portals { id, name }
    inputs { id, name }
    outputs { id, name }
  }
}
```

### Odczyt punktów pomiarowych

```graphql
query {
  resource {
    groups {
      id
      name
      points {
        id
        name
        type
        value { type, value }
      }
    }
  }
}
```

### Sterowanie strefą

```graphql
mutation {
  controlZone(zone: 1, operator: 1)
}
```

### Odblokowanie przejścia

```graphql
mutation {
  releasePortal(portal: 1, operator: 1)
}
```

### Subskrypcja zdarzeń

```graphql
subscription {
  events {
    id
    dateTime
    trigger { type, template }
    reason { id, name }
    user { id, name }
  }
}
```

## Struktura obiektu testowego

### Strefy alarmowe
- **Strefa 1** - Strefa dzienna (PIR hol, kontaktron drzwi główne)
- **Strefa 2** - Strefa nocna (PIR korytarz, biura, okna)
- **Strefa 3** - Strefa 24h (panika, czujniki dymu)

### Przejścia kontroli dostępu
- **Portal 1** - Wejście główne (czytnik wej/wyj, RTE, elektrozamek)
- **Portal 2** - Drzwi techniczne (tylko wejście)
- **Portal 3** - Biuro kierownika

### Użytkownicy
| ID | Nazwa | Karta | PIN | Dostęp |
|----|-------|-------|-----|--------|
| 1 | Administrator | 1234567890 | 1234 | Pełny |
| 2 | Jan Kowalski | 0987654321 | 5678 | Pracowniczy |
| 3 | Anna Nowak | 1122334455 | 9012 | Pracowniczy |
| 4 | Serwisant | 5566778899 | 0000 | Techniczny |

## Symulacja

Kontroler automatycznie:
- Aktualizuje wartości punktów środowiskowych co 10 sekund
- Generuje losowe zdarzenia dostępu co 30-60 sekund
- Symuluje trend dobowy temperatury
- Symuluje zużycie akumulatora przy braku zasilania

## Rejestracja w Belbuk Data Broker

Użyj mutacji `createController` w Data Brokerze:

```graphql
mutation {
  createController(input: {
    name: "Wirtualny kontroler testowy"
    apiUrl: "http://localhost:4000/graphql"
    subscriptionUrl: "ws://localhost:4000/graphql"
    apiUser: "admin"
    apiPassword: "admin"
    active: true
    activeSubscription: true
    activeRequest: true
    globalControllerIdentifier: "VC-2024-BELBUK-001"
  }) {
    id
    name
  }
}
```

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| PORT | 4000 | Port serwera |
| JWT_SECRET | (wbudowany) | Klucz do podpisywania tokenów |
