import { buildApp } from "./app";

const server = buildApp({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
    },
  },
});

server.listen({ 
  port: 3000,
  host: '0.0.0.0' // Allow connections from outside the container
}, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  console.log(`Server is running at ${address}`);
});
