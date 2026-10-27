# Base mantenida de frontend

Contrato: [STD-FE-001](../../docs/diseno/base-frontend.md). Versión y fuentes compartidas: `base-manifest.json`. La plantilla contiene la composición neutral; el núcleo y kit se exportan desde sus fuentes reales, con exclusión de pruebas del producto.

C-050: versión 0.2.0 por API aditiva de paginación (`summaryMode` y nombre accesible). Se conserva el resumen predeterminado; el modo `pages` presenta el total de páginas. Los consumidores 0.1.0 se revisan y migran explícitamente; el generador no los sobrescribe. Manifiesto, paquete generado, lockfile y documentos de plantilla declaran la misma versión.

Desde la raíz del repositorio:

```text
node frontend/tools/create-starter.mjs --output <directorio-nuevo>
node frontend/tools/create-starter.mjs --check <directorio-consumidor>
```

El padre del destino debe existir. La generación rechaza un destino existente, fuentes enlazadas y archivos fuera de las raíces declaradas. No instala dependencias, no publica paquetes y no modifica la plantilla externa de referencia. La salida incluye versión, hashes, proyecto Angular y contrato de sesión configurable.

El consumidor instala mediante `npm ci`, ejecuta sus pruebas y compila. Los hashes verifican procedencia e integridad local; no sustituyen firma de distribución ni revisión de cambios. Registrar consumidores y cambios incompatibles; no reemplazar automáticamente código editado por otro producto.

Antes de cambiar versión: comprobar generación, consumidor neutral, núcleo, kit, presupuesto, seguridad estática y documentación. Mayor: contrato incompatible; menor: extensión compatible; parche: corrección compatible. Mientras 0.x, describir igualmente cualquier incompatibilidad y su migración.

## Configuración y límites del contrato

El consumidor adapta `CookieSession` en `src/app/session.ts` e inyecta `SESSION_CONFIG`. Configurar `apiPath`, endpoints de identificación/acceso/cierre, destinos internos, nombre de cookie CSRF y cabecera; `requestTimeoutMs` es opcional (10 segundos por defecto, máximo 120 segundos). Registrar HTTP con `provideCookieSessionHttp`, sin añadir un segundo proveedor que reemplace sus interceptores. El inicializador espera la identificación remota antes de resolver las rutas.

La identidad requiere `userId` entero positivo, `displayName`, `email` y una lista no vacía de códigos de perfil en mayúsculas. El acceso además exige `authenticated: true`. Cada producto restringe los perfiles en su adaptador y documenta sus guardas. El servidor mantiene autenticación, autorización por solicitud, expiración, invalidación y protección de cookies; la plantilla no implementa ese servidor ni configura cabeceras del despliegue.

`PendingChanges` compara valores serializables con un punto de partida en memoria. No usarlo para persistir datos ni credenciales. Las pantallas editables implementan `LeavesWithConfirmation`, declaran su guarda y agregan el estado de sus editores hijos. Sin cambios se sale directamente; con cambios se muestra una confirmación accesible; un guardado pendiente bloquea el abandono.

La muestra reactiva es el punto de partida para formularios nuevos. Los consumidores existentes se migran con pruebas de comportamiento, conservando reglas y límites de negocio. Las funcionalidades de Jallupacha y sus formularios no se exportan.

## Verificación y mantenimiento

`--check` verifica versión, inventario de fuentes compartidas y hashes de los archivos exportados. Un resultado distinto obliga a revisar la diferencia y documentar la migración; no determina por sí solo compatibilidad funcional. Los archivos añadidos por el consumidor fuera del inventario necesitan sus propias pruebas y revisión.

La CI entregada comprueba tipos mediante compilación, pruebas, políticas estáticas acotadas, contraste, presupuesto y auditoría de dependencias. Gitleaks revisa secretos y CodeQL produce SARIF local: el filtro falla si falta análisis o aparecen errores/hallazgos altos. Su ejecución en GitHub y las condiciones de uso de esas herramientas deben comprobarse al adoptar el proyecto; crear el archivo de CI no acredita un análisis ejecutado.

C-048 actualiza CLI/build a 22.2.4 y Vitest a 4.1.12, conserva Angular runtime/compiler 22.2.1 e incluye el override Vite 8.3.5 para corregir dependencias vulnerables de las herramientas. Mantener coherentes manifiesto, paquete raíz y ambos lockfiles; retirar el override solo después de verificar la versión resuelta, auditoría, pruebas y compilación del producto y consumidor. La auditoría se repite en cada cambio: el resultado registrado no garantiza ausencia futura de avisos.
