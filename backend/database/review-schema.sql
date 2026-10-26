-- Revisión de estructura del base de esquema (solo lectura).
-- Ejecutar conectado como propietario del esquema, por ejemplo PROCESOS en QA.

SET PAGESIZE 200
SET LINESIZE 220
SET LONG 20000

PROMPT === Tablas del base de esquema ===
SELECT table_name, num_rows, last_analyzed
  FROM user_tables
 WHERE table_name IN (
   'MACROPROCESS_TYPE', 'MACROPROCESS', 'PROCESS_TYPE', 'ORGANIZATIONAL_UNIT',
   'PROCESS', 'PROCESS_VERSION', 'PROCESS_UNIT', 'PROCESS_RISK', 'PROCESS_RELATION'
 )
 ORDER BY table_name;

PROMPT === Columnas y nulabilidad ===
SELECT table_name, column_id, column_name, data_type, data_length, nullable, data_default
  FROM user_tab_columns
 WHERE table_name IN (
   'MACROPROCESS_TYPE', 'MACROPROCESS', 'PROCESS_TYPE', 'ORGANIZATIONAL_UNIT',
   'PROCESS', 'PROCESS_VERSION', 'PROCESS_UNIT', 'PROCESS_RISK', 'PROCESS_RELATION'
 )
 ORDER BY table_name, column_id;

PROMPT === Restricciones ===
SELECT c.table_name, c.constraint_name, c.constraint_type, c.status,
       LISTAGG(cc.column_name, ', ') WITHIN GROUP (ORDER BY cc.position) AS columns
  FROM user_constraints c
  LEFT JOIN user_cons_columns cc
    ON cc.constraint_name = c.constraint_name
   AND cc.table_name = c.table_name
 WHERE c.table_name IN (
   'MACROPROCESS_TYPE', 'MACROPROCESS', 'PROCESS_TYPE', 'ORGANIZATIONAL_UNIT',
   'PROCESS', 'PROCESS_VERSION', 'PROCESS_UNIT', 'PROCESS_RISK', 'PROCESS_RELATION'
 )
 GROUP BY c.table_name, c.constraint_name, c.constraint_type, c.status
 ORDER BY c.table_name, c.constraint_type, c.constraint_name;

PROMPT === Índices ===
SELECT i.table_name, i.index_name, i.uniqueness,
       LISTAGG(ic.column_name, ', ') WITHIN GROUP (ORDER BY ic.column_position) AS columns
  FROM user_indexes i
  JOIN user_ind_columns ic
    ON ic.index_name = i.index_name
   AND ic.table_name = i.table_name
 WHERE i.table_name IN (
   'MACROPROCESS_TYPE', 'MACROPROCESS', 'PROCESS_TYPE', 'ORGANIZATIONAL_UNIT',
   'PROCESS', 'PROCESS_VERSION', 'PROCESS_UNIT', 'PROCESS_RISK', 'PROCESS_RELATION'
 )
 GROUP BY i.table_name, i.index_name, i.uniqueness
 ORDER BY i.table_name, i.index_name;

PROMPT === Secuencias y triggers de identificadores ===
SELECT sequence_name, last_number, increment_by
  FROM user_sequences
 WHERE sequence_name IN (
   'PROCESS_CODE_SEQ', 'MPT_ID_SEQ', 'MP_ID_SEQ', 'PT_ID_SEQ', 'OU_ID_SEQ',
   'PR_ID_SEQ', 'PV_ID_SEQ', 'RK_ID_SEQ', 'RL_ID_SEQ'
 )
 ORDER BY sequence_name;

SELECT trigger_name, table_name, status, triggering_event, trigger_type
  FROM user_triggers
 WHERE trigger_name IN (
   'MPT_ID_BI', 'MP_ID_BI', 'PT_ID_BI', 'OU_ID_BI',
   'PR_ID_BI', 'PV_ID_BI', 'RK_ID_BI', 'RL_ID_BI'
 )
 ORDER BY table_name, trigger_name;
