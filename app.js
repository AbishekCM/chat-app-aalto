import { Application, Router } from "oak";
import { Client } from "postgres";
import { configure, renderFile } from "eta";

// Initialize the database client with connection parameters
const client = new Client({
    user: Deno.env.get("DB_USER"),
    password: Deno.env.get("DB_PASSWORD"),
    database: Deno.env.get("DB_NAME"),
    hostname: Deno.env.get("DB_HOST"),
    port: Number(Deno.env.get("DB_PORT")),
    tls: {
      enforce: false // Render.com doesn't need enforced TLS for internal connections
    }
  });
  

// Connect to the database
await client.connect();

await client.queryArray(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender TEXT NOT NULL,
      message TEXT NOT NULL
    );
  `);

// Configure Eta to use the views directory for templates
configure({
  views: `${Deno.cwd()}/views`
});

// Create the Deno Oak server and router
const app = new Application();
const router = new Router();

// Home route (GET request)
router.get("/", async (context) => {
  // Fetch the 5 most recent messages
  const result = await client.queryObject(`
    SELECT sender, message FROM messages
    ORDER BY id DESC
    LIMIT 5
  `);

  // If no rows are returned, assign an empty array
  const messages =   result.rows || [];

  // Render the homepage with the messages and form
  context.response.body = await renderFile("index.eta", { messages });
});

// Handle message submission (POST request)
router.post("/", async (context) => {
  // Get form data from the request
  const body = context.request.body({ type: "form" });
  const formData = await body.value;
  
  const sender = formData.get("sender");
  const message = formData.get("message");

  

  // Insert the new message into the database
  /* await client.queryArray(`
    INSERT INTO messages (sender, message) VALUES ($1, $2)
  `, sender, message); */

  await client.queryArray(`
    INSERT INTO messages (sender, message) VALUES ('${sender}', '${message}')
  `);
  
  // Redirect to the homepage (POST/Redirect/GET pattern)
  context.response.redirect("/", 303);
});

// Middleware to serve static files (for CSS, images, etc.)
app.use(async (context, next) => {
  await next();
  context.response.headers.set("Content-Type", "text/html");
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
console.log("Server running on http://localhost:8000");
const PORT = Deno.env.get("PORT") || 8000;
await app.listen({ port: Number(PORT) });
