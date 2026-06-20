import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analysisAreaBoundsSchema } from "@aisstream/shared";
import type { IMarineWeatherService } from "../domain/interfaces";

const querySchema = z.object({
  south: z.coerce.number(),
  west: z.coerce.number(),
  north: z.coerce.number(),
  east: z.coerce.number()
});

type MarineWeatherRouteDependencies = {
  service: IMarineWeatherService;
};

export async function registerMarineWeatherRoute(
  app: FastifyInstance,
  dependencies: MarineWeatherRouteDependencies
): Promise<void> {
  app.get("/context/marine-weather", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Marine weather bounds are invalid." });
    }

    const bounds = analysisAreaBoundsSchema.safeParse(query.data);
    if (!bounds.success) {
      return reply.code(400).send({ error: "Marine weather bounds are invalid." });
    }

    return dependencies.service.getAreaWeather(bounds.data);
  });
}
