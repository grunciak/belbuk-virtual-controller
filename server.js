const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const app = express();
const PORT = process.env.PORT || 4000;

// Losowe, ale stałe na czas działania instancji ID sterownika
const CONTROLLER_ID = "VC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

const typeDefs = `#graphql
  type Token {
    mainToken: String!
    refreshToken: String!
  }

  type ConfigInput { id: Int!, name: String! }
  type ConfigOutput { id: Int!, name: String! }
  type ConfigReader { id: Int!, name: String! }
  type ConfigZone { id: Int!, name: String! }
  type ConfigPortal { id: Int!, name: String! }

  type Configuration {
    site: String!
    inputs: [ConfigInput!]!
    outputs: [ConfigOutput!]!
    readers: [ConfigReader!]!
    zones: [ConfigZone!]!
    portals: [ConfigPortal!]!
  }

  type Query {
    getAuthToken(login: String!, password: String!): Token!
    refreshAuthToken: Token!
    configuration: Configuration!
    echo: String!
  }
`;

const resolvers = {
  Query: {
    getAuthToken: (_, { login, password }) => {
      console.log(`Próba logowania → ${login} : ${password}`);
      return {
        mainToken: "belbuk-fake-jwt-1234567890",
        refreshToken: "refresh-9876543210"
      };
    },

    refreshAuthToken: () => ({
      mainToken: "belbuk-fake-jwt-1234567890",
      refreshToken: "refresh-9876543210"
    }),

    configuration: () => {
      console.log("Belbuk pobrał konfigurację");
      return {
        site: CONTROLLER_ID,
        inputs: [{ id: 1, name: "Wejście 1" }],
        outputs: [{ id: 1, name: "Wyjście 1" }],
        readers: [{ id: 1, name: "Czytnik wejściowy" }],
        zones: [{ id: 1, name: "Strefa główna" }],
        portals: [{ id: 1, name: "Drzwi główne" }]
      };
    },

    echo: () => `Wirtualny sterownik działa – ${CONTROLLER_ID}`
  }
};

async function start() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(cors());
  app.use(express.json());

  // Belbuk lubi oba adresy
  app.use('/graphql', expressMiddleware(server));
  app.use('/api/graphql.php', expressMiddleware(server));

  app.get('/', (req, res) => {
    res.json({
      status: "OK",
      controllerId: CONTROLLER_ID,
      info: "Wirtualny sterownik Belbuk – gotowy do pracy"
    });
  });

  app.listen(PORT, () => {
    console.log(`\nSterownik uruchomiony`);
    console.log(`ID sterownika: ${CONTROLLER_ID}`);
    console.log(`Adres do Belbuka → https://twoja-aplikacja.up.railway.app/api/graphql.php\n`);
  });
}

start();
