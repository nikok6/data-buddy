import Fastify from "fastify";
import { ApiResponse } from "./types";
import routes from "./routes";

export const buildApp = (opts = {}) => {
  const app = Fastify(opts);

  app.get("/", async (_request, _reply) => {
    return { success: true } as ApiResponse<null>;
  });

  app.register(routes);

  return app;
};

// TODO: fix integration test
// TODO: add unit test
// TODO: add API / service to get, insert subscriber, data plan, usage, user
// TODO: add authentication and authorization
// TODO: decide between query or params, check middleware compatibility
