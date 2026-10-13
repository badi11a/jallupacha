-- Privilegios de sistema de la cuenta de ejecución. Los aplica un operador autorizado
-- (DBA) una sola vez por ambiente; no los aplica `db:grant` ni el backend.
-- Los permisos sobre objetos de la aplicación están únicamente en grant-runtime.sql.
DEFINE app_user = JALLUPACHA_APP

GRANT CREATE SESSION TO &&app_user;

UNDEFINE app_user
