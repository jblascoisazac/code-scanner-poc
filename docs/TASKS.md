# Plan de desarrollo – code-scanner-poc

**GitHub Projects – Sprint 2 Semanas**  
**Tiempo total:** **85 h** → **Javier**  
**Duración:** **2 semanas** (~42.5 h/semana) → **buffer 12 %**

## Tareas

| ID      | Tarea                                                                                                                                                                                            | Estimación | Esfuerzo | Prioridad |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | --------- |
| **T01** | Setup repo                                                                                                                                                                                       | **8 h**    | Bajo     | Alta      |
| **T02** | Detección HID (VID 0C2E, caché path, reconexión poll 1s)                                                                                                                                         | **8 h**    | Alto     | Alta      |
| **T03** | Lectura HID ASCII + buffer por `\r` (0x0D)                                                                                                                                                       | **6 h**    | Alto     | Alta      |
| **T04** | Parsing 1D (Code128 + EAN/UPC) + validación checksum                                                                                                                                             | **9 h**    | Alto     | Alta      |
| **T05** | Emisión robusta a MIP Zeo: HTTP POST con cola persistente, reintentos exponenciales, timeout, autenticación OAuth 2.0, creación de endpoint en MIP                                               | **13 h**   | Alto     | Alta      |
| **T06** | Implementar observabilidad con OpenTelemetry (OTEL): métricas (lecturas/s, errores, latencia), trazas de escaneo → evento MIP Zeo, integración con stack Grafana de MIP Zeo (exporter OTLP/HTTP) | **6 h**    | Medio    | Alta      |
| **T07** | Tests críticos (mock HID, parsing, reintentos, fallos de red)                                                                                                                                    | **8 h**    | Alto     | Alta      |
| **T08** | Scripts de servicio (Windows NSSM + Linux systemd)                                                                                                                                               | **4 h**    | Medio    | Alta      |
| **T09** | Documentación (README, .env.example, instalación, configuración MIP Zeo)                                                                                                                         | **4 h**    | Medio    | Alta      |
| **T12** | Puesta en producción en 10–15 puestos: despliegue automatizado, configuración por equipo (JSON/ENV), instalación remota, verificación en campo, informe de rollout                               | **15 h**   | Alto     | Alta      |

## Distribución de tiempo (2 semanas)

| Rol        | Horas totales | Horas/semana |
| ---------- | ------------- | ------------ |
| **Javier** | **85 h**      | **42.5 h**   |
| **Total**  | **85 h**      | **42.5 h**   |

> **Desglose Javier (85 h):**
>
> - **8 h** → T01 (setup avanzado + automatización)
> - **13 h** → T05 (emisión robusta a MIP Zeo)
> - **39 h** → T02–T04, T06–T09 (desarrollo técnico)
> - **15 h** → T12 (despliegue en producción)
> - **10 h** → Buffer (12 %) para imprevistos, pruebas en campo, ajustes MIP Zeo
