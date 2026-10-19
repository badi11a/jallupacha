-- Revisión de carga e integridad del MVP v14 (solo lectura).
-- Ejecutar conectado como propietario del esquema, por ejemplo PROCESOS en QA.

SET PAGESIZE 200
SET LINESIZE 240
SET LONG 20000

PROMPT === Conteos de la carga inicial ===
SELECT 'MACROPROCESS_TYPE' AS object_name, COUNT(*) AS rows_count FROM macroprocess_type
UNION ALL SELECT 'MACROPROCESS', COUNT(*) FROM macroprocess
UNION ALL SELECT 'PROCESS_TYPE', COUNT(*) FROM process_type
UNION ALL SELECT 'ORGANIZATIONAL_UNIT', COUNT(*) FROM organizational_unit
UNION ALL SELECT 'PROCESS', COUNT(*) FROM process
UNION ALL SELECT 'PROCESS_VERSION', COUNT(*) FROM process_version
UNION ALL SELECT 'PROCESS_UNIT', COUNT(*) FROM process_unit
UNION ALL SELECT 'PROCESS_RISK', COUNT(*) FROM process_risk
UNION ALL SELECT 'PROCESS_RELATION', COUNT(*) FROM process_relation
ORDER BY object_name;

PROMPT === Mapa de procesos ===
SELECT mt.name AS macroprocess_type,
       m.code AS macroprocess_code,
       m.name AS macroprocess,
       pt.name AS process_type,
       p.code AS process_code,
       pv.name AS process_name,
       pv.status
  FROM macroprocess_type mt
  JOIN macroprocess m ON m.macroprocess_type_id = mt.id
  LEFT JOIN process_type pt ON pt.macroprocess_id = m.id
  LEFT JOIN process_version pv ON pv.macroprocess_id = m.id AND pv.process_type_id = pt.id
  LEFT JOIN process p ON p.current_version_id = pv.id
 ORDER BY mt.sort_order, m.sort_order, pt.name, p.code;

PROMPT === Fichas sin unidad responsable activa ===
SELECT p.code, pv.name
  FROM process p
  JOIN process_version pv ON pv.id = p.current_version_id
 WHERE NOT EXISTS (
   SELECT 1
     FROM process_unit pu
     JOIN organizational_unit u ON u.id = pu.unit_id
    WHERE pu.process_id = p.id
      AND pu.role = 'RESPONSABLE'
      AND u.is_active = 1
 )
 ORDER BY p.code;

PROMPT === Riesgos por proceso ===
SELECT p.code, pv.name AS process_name, COUNT(r.id) AS risks_count
  FROM process p
  JOIN process_version pv ON pv.id = p.current_version_id
  LEFT JOIN process_risk r ON r.process_id = p.id
 GROUP BY p.code, pv.name
 ORDER BY p.code;

PROMPT === Relaciones de procesos ===
SELECT origin.code AS origin_code,
       destination.code AS destination_code,
       relation.relation_type,
       relation.description
  FROM process_relation relation
  JOIN process origin ON origin.id = relation.origin_process_id
  JOIN process destination ON destination.id = relation.destination_process_id
 ORDER BY origin.code, relation.relation_type, destination.code;
