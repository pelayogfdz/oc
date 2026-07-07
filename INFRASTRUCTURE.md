# Documentación de Infraestructura y Operaciones de Caanma 🌐

Este documento detalla la arquitectura de sistemas, la topología de red, el esquema de persistencia y las guías operativas diseñadas para la administración autónoma del servidor de Caanma en Hetzner Cloud.

---

## 1. Diagrama de la Arquitectura de Docker Compose

El sistema se ejecuta por completo de forma aislada dentro de un espacio de red de Docker (`caanma_default`). Nginx actúa como el único punto de entrada de tráfico desde la red pública (puertos 80/443).

```mermaid
graph TD
    Client[Clientes Web] -->|HTTPS:443| Proxy[nginx-proxy]
    Proxy -->|HTTP:3000| NextApp[nextjs-app]
    Proxy -->|HTTP:3001| WAWorker[whatsapp-worker]
    NextApp -->|Prisma| PGDb[(postgres-db)]
    WAWorker -->|Prisma| PGDb

    subgraph Observabilidad
        Prom[Prometheus] -->|Scrape| NextApp
        Prom -->|Scrape| NodeExp[Node Exporter (Host Metrics)]
        Prom -->|Scrape| Cadvisor[cAdvisor (Docker Metrics)]
        Loki[Loki (Log Server)] <-- Promtail[Promtail (Logs Agent)]
        Promtail -->|Lees logs| DockerSock[(docker.sock)]
        Grafana[Grafana] -->|Query| Prom
        Grafana -->|Query| Loki
    end
```

---

## 2. Inventario de Servicios y Puertos

| Servicio | Imagen | Nombre Contenedor | Puerto Interno | Puerto Host | Descripción / Rol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **reverse-proxy** | `nginx:alpine` | `caanma-proxy` | `80`, `443` | `80`, `443` | Proxy inverso y terminación SSL (Let's Encrypt). |
| **nextjs-app** | `caanma-nextjs-app` | `caanma-web` | `3000` | `127.0.0.1:3000` | Servidor Next.js (React y APIs). |
| **whatsapp-worker** | `caanma-whatsapp-worker` | `caanma-whatsapp` | `3001` | `127.0.0.1:3001` | Bot / worker de mensajería (WhatsApp-Web.js). |
| **postgres-db** | `postgres:17-alpine` | `caanma-postgres` | `5432` | `127.0.0.1:5432` | Base de datos local (PostgreSQL 17). |
| **redis-cache** | `redis:7-alpine` | `caanma-redis` | `6379` | `127.0.0.1:6379` | Caché en memoria y base de datos de sesiones. |
| **prometheus** | `prom/prometheus` | `caanma-prometheus` | `9090` | `127.0.0.1:9090` | Servidor de base de datos de métricas de rendimiento. |
| **grafana** | `grafana/grafana` | `caanma-grafana` | `3000` | `127.0.0.1:3002` | Panel visual de métricas e infraestructura. |
| **node-exporter** | `prom/node-exporter` | `caanma-node-exporter` | `9100` | *N/A* | Colector de métricas físicas de hardware del host. |
| **cadvisor** | `gcr.io/cadvisor/cadvisor` | `caanma-cadvisor` | `8080` | *N/A* | Colector de métricas de contenedores Docker individuales. |
| **loki** | `grafana/loki` | `caanma-loki` | `3100` | `127.0.0.1:3100` | Agregador de logs distribuidos de contenedores. |
| **promtail** | `grafana/promtail` | `caanma-promtail` | `9080` | *N/A* | Colector local de logs que envía datos a Loki. |

> [!NOTE]
> Todos los puertos del host (excepto Nginx 80/443) están limitados a responder únicamente en `127.0.0.1` por motivos de seguridad. Para acceder a Grafana (`3002`) o Prometheus (`9090`) desde tu máquina local, debes usar un túnel SSH:
> `ssh -L 3002:localhost:3002 -L 9090:localhost:9090 root@5.78.138.167`

---

## 3. Persistencia de Datos (Volúmenes)

| Volumen Docker | Ruta en el Contenedor | Tipo de Datos |
| :--- | :--- | :--- |
| `postgres_data` | `/var/lib/postgresql/data` | Datos físicos de las 8 bases de datos PostgreSQL. |
| `redis_data` | `/data` | Caché y datos en caliente de Redis. |
| `whatsapp_session_cache` | `/app/.wwebjs_cache` | Archivos de autenticación local del cliente de WhatsApp. |
| `prometheus_data` | `/prometheus` | Series temporales y base de datos métrica. |
| `grafana_data` | `/var/lib/grafana` | Dashboards guardados y configuraciones de usuario. |

---

## 4. Manual de Operaciones para Agentes de IA 🤖

Todas las tareas de mantenimiento, monitoreo y despliegue del servidor se realizan de forma unificada mediante el script de control central `/opt/caanma/scratch/agent_control.sh`.

### A. Consultar la Salud General del Servidor
Muestra el consumo de CPU/RAM/Disco en tiempo real, así como el estatus y consumo de cada contenedor Docker:
```bash
/opt/caanma/scratch/agent_control.sh status
```

### B. Desplegar una Nueva Versión de la Aplicación
El comando descarga los últimos cambios del repositorio de Git, re-construye las imágenes del frontend/worker de WhatsApp, actualiza el stack y ejecuta las migraciones de Prisma de forma segura:
```bash
/opt/caanma/scratch/agent_control.sh deploy
```

### C. Gestionar Contenedores (Reiniciar/Logs)
- **Reiniciar un contenedor específico**:
  ```bash
  /opt/caanma/scratch/agent_control.sh restart nextjs-app
  ```
- **Reiniciar todo el stack**:
  ```bash
  /opt/caanma/scratch/agent_control.sh restart
  ```
- **Ver logs de un servicio (últimas 100 líneas)**:
  ```bash
  /opt/caanma/scratch/agent_control.sh logs whatsapp-worker
  ```

### D. Respaldos (Backups) y Recuperación de Desastres
- **Crear un respaldo manual**:
  ```bash
  /opt/caanma/scratch/agent_control.sh backup
  ```
  *Nota: Las copias de seguridad de bases de datos y configuraciones se guardan en `/root/backups/caanma_backup_YYYYMMDD_HHMMSS.tar.gz`. El script elimina de forma automática respaldos con más de 7 días de antigüedad.*

- **Restaurar un respaldo**:
  ```bash
  /opt/caanma/scratch/agent_control.sh restore /root/backups/caanma_backup_archivo.tar.gz
  ```

---

## 5. Plan de Rollback (Reversibilidad DNS)
En caso de fallo crítico irrecuperable en el servidor de Hetzner, el rollback se realiza a nivel DNS:
1. Ir al administrador de DNS de `caanma.com` (Cloudflare/GoDaddy).
2. Revertir el valor del registro **A** apuntándolo de vuelta a la IP de AWS Lightsail: `18.222.99.200`.
3. Esto reconectará inmediatamente a los clientes al servidor antiguo sin pérdida de continuidad.
