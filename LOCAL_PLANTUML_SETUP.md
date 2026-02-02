# Local PlantUML Rendering Setup

This guide shows you how to render PlantUML diagrams locally instead of using the public `plantuml.com` server. Local rendering improves privacy, speed, and reliability.

## Option 1: Docker PlantUML Server (Recommended)

The easiest method using Docker.

### Setup

```bash
# Pull and run the official PlantUML server
docker run -d -p 8080:8080 plantuml/plantuml-server:jetty

# Or with a custom port
docker run -d -p 9000:8080 plantuml/plantuml-server:jetty
```

### Configure Extension

1. Open the extension options (right-click extension icon → Options)
2. Go to the **PlantUML** tab
3. Change the server URL to: `http://localhost:8080/plantuml`
4. Click **Save Settings**

### Verify

Visit `http://localhost:8080` in your browser to see the PlantUML server interface.

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3'
services:
  plantuml:
    image: plantuml/plantuml-server:jetty
    ports:
      - "8080:8080"
    restart: unless-stopped
```

Run: `docker-compose up -d`

---

## Option 2: Java PlantUML Server

If you have Java installed and prefer not to use Docker.

### Prerequisites

- Java 11 or higher
- Download PlantUML JAR from: https://plantuml.com/download

### Setup

```bash
# Download the PlantUML JAR
wget https://github.com/plantuml/plantuml/releases/download/v1.2024.0/plantuml.jar

# Run as a server
java -jar plantuml.jar -picoweb:8080
```

### Configure Extension

Set server URL to: `http://localhost:8080/plantuml`

---

## Option 3: Node.js PlantUML Server

Lightweight Node.js-based server.

### Setup

```bash
# Install globally
npm install -g node-plantuml

# Run the server
plantuml-server -p 8080
```

### Alternative: plantuml-server package

```bash
npm install -g plantuml-server
plantuml-server --port 8080
```

### Configure Extension

Set server URL to: `http://localhost:8080`

---

## Option 4: Kroki (Multi-Diagram Support)

Kroki supports PlantUML, Mermaid, GraphViz, and many other formats.

### Docker Setup

```bash
docker run -d -p 8000:8000 yuzutech/kroki
```

### Configure Extension

Set server URL to: `http://localhost:8000/plantuml`

Kroki URL format: `http://localhost:8000/{diagram-type}/{output-format}/{encoded-text}`

---

## Troubleshooting

### CORS Issues

If you get CORS errors in the browser console, you may need to configure the server to allow cross-origin requests.

**For Docker PlantUML Server:**
The official image should work out of the box with the extension.

**For custom setups:**
Ensure your server sends appropriate CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST
```

### Connection Issues

1. **Server not reachable**: Verify the server is running:
   ```bash
   curl http://localhost:8080/plantuml/svg/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000
   ```

2. **Wrong URL**: Ensure the server URL in extension settings matches your setup

3. **Port conflicts**: If port 8080 is in use, change to another port (e.g., 9000)

### Clear Cache

After changing the server URL, clear the diagram cache:
1. Open extension options
2. Click **Clear Diagram Cache** button
3. Reload any pages with PlantUML diagrams

---

## Performance Tips

1. **Increase cache TTL**: The extension caches diagrams for 24 hours. Adjust in `src/content.js` if needed.

2. **Use PNG for complex diagrams**: SVG can be slow for very large diagrams. In extension options, change format to `png`.

3. **Run server locally**: Local servers are much faster than the public server.

4. **Docker resource limits**: If using Docker Desktop, increase memory allocation for better performance.

---

## Security Considerations

### Why Local Rendering?

- **Privacy**: Your diagram code never leaves your machine
- **Security**: No external dependencies for sensitive diagrams
- **Reliability**: Not dependent on external service availability
- **Speed**: Lower latency, especially for many diagrams

### Network Configuration

If you only access local pages (file://, localhost), the extension works offline with a local PlantUML server.

For remote pages, the browser requires the server to support HTTPS or be on localhost.

---

## Comparison

| Method | Pros | Cons |
|--------|------|------|
| **Docker** | Easy setup, isolated, official image | Requires Docker |
| **Java JAR** | No Docker needed, official tool | Requires Java, manual updates |
| **Node.js** | Lightweight, npm-based | Not official, may lag behind |
| **Kroki** | Multiple diagram formats | Heavier, more complex |

**Recommendation**: Use Docker for the best balance of ease and reliability.

---

## Advanced: Custom Server Configuration

### Environment Variables (Docker)

```bash
docker run -d \
  -p 8080:8080 \
  -e PLANTUML_LIMIT_SIZE=8192 \
  plantuml/plantuml-server:jetty
```

### Persistent Cache (Docker Volume)

```bash
docker run -d \
  -p 8080:8080 \
  -v plantuml-cache:/tmp \
  plantuml/plantuml-server:jetty
```

### Custom Graphviz

For advanced PlantUML features requiring Graphviz:

```dockerfile
FROM plantuml/plantuml-server:jetty
RUN apt-get update && apt-get install -y graphviz
```

---

## Testing Your Setup

After configuring a local server:

1. **Test the server directly**:
   Visit `http://localhost:8080` in your browser

2. **Test with extension**:
   - Browse to a page with PlantUML code
   - Hover over a code block
   - Open browser DevTools → Network tab
   - Verify requests go to localhost, not plantuml.com

3. **Test different formats**:
   - Try both SVG and PNG formats in extension settings
   - Ensure both render correctly

---

## Getting Help

If you encounter issues:

1. Check the browser console for errors (F12 → Console)
2. Verify the server is accessible: `curl http://localhost:8080/plantuml/txt/Syp9J4vLqBLJSCfFKeYEpYWjAa5G00`
3. Check extension logs: console filter `[Hover-Extension]`
4. Clear browser cache and extension cache

For more information:
- PlantUML Server: https://plantuml.com/server
- Docker Image: https://hub.docker.com/r/plantuml/plantuml-server
- Kroki: https://kroki.io/
