-- ÚNICA fuente de permisos sobre objetos de la aplicación para la cuenta de ejecución.
-- Se aplica con `npm run db:grant` (cuenta propietaria; verifica faltantes y excesos) y
-- `db:reset:local`. Las migraciones NO otorgan permisos: toda tabla o secuencia nueva
-- debe añadirse aquí en el mismo cambio. Solo líneas GRANT <privilegios> ON <OBJETO> TO &&app_user;
-- (una por objeto). Privilegios de sistema: ver grant-system.sql.
-- Las migraciones 1740000000003, 04 y 05 ya aplicadas otorgaron AUDIT, PROCESS*, RISK_* con los
-- mismos privilegios declarados abajo; no se modifican.
DEFINE app_user = JALLUPACHA_APP

-- Identidad, perfiles y sesión
GRANT SELECT ON APP_USER TO &&app_user;
GRANT SELECT ON USER_IDENTITY TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON LOCAL_CREDENTIAL TO &&app_user;
GRANT SELECT ON APP_PROFILE TO &&app_user;
GRANT SELECT, INSERT, DELETE ON USER_PROFILE TO &&app_user;
GRANT SELECT ON DEMO_IDENTITY TO &&app_user;
GRANT SELECT, UPDATE ON ADMIN_CONTROL TO &&app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON APP_SESSION TO &&app_user;

-- Catálogos y macroprocesos
GRANT SELECT ON MACROPROCESS_TYPE TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON MACROPROCESS TO &&app_user;
GRANT SELECT ON MACROPROCESS_CODE_SEQ TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON PROCESS_TYPE TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON ORGANIZATIONAL_UNIT TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON RISK_TYPE TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON RISK_LEVEL TO &&app_user;

-- Procesos y versiones
GRANT SELECT, INSERT, UPDATE ON PROCESS TO &&app_user;
GRANT SELECT, INSERT, UPDATE ON PROCESS_VERSION TO &&app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON PROCESS_UNIT TO &&app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON PROCESS_RELATION TO &&app_user;
GRANT SELECT ON PROCESS_CODE_SEQ TO &&app_user;

-- Riesgos
GRANT SELECT, INSERT ON PROCESS_RISK TO &&app_user;

-- Auditoría y eventos de seguridad (sin UPDATE/DELETE sobre auditoría)
GRANT SELECT, INSERT ON AUDIT TO &&app_user;
GRANT SELECT, INSERT ON SECURITY_EVENT TO &&app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON SECURITY_EVENT_IP TO &&app_user;

UNDEFINE app_user
