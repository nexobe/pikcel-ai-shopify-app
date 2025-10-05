/**
 * Health Check Endpoint
 *
 * This endpoint is used by DigitalOcean App Platform to verify the app is running.
 * Returns a 200 status code when the app is healthy.
 *
 * Route: GET /healthz
 */

import type { LoaderFunctionArgs } from "@react-router/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // You can add additional health checks here, such as:
  // - Database connectivity check
  // - External service checks
  // - Memory usage checks

  // For now, just return OK if the server is responding
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// Optional: Add a more detailed health check with JSON response
// Uncomment and customize as needed:
/*
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    return new Response(JSON.stringify(health), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: error.message,
    }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
*/
