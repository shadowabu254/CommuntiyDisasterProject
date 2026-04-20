import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const spec = YAML.load(path.join(__dirname, "openapi.yaml"));

export function mountSwagger(app) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
