Deno.serve(async (req) => {
  try {
    const proxyUrl = Deno.env.get("PROXY_URL");
    
    if (!proxyUrl) {
      return Response.json({ error: 'PROXY_URL not configured' }, { status: 500 });
    }

    return Response.json({ proxyUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});