

/** Campos de la ficha (REQ-06): clave de API, columna, máximo de caracteres y etiqueta para mensajes. */
export const FICHA_FIELDS = [
  ['elaborator', 'ELABORATOR', 250, 'Elaborador'],
  ['responsible', 'RESPONSIBLE', 250, 'Responsable'],
  ['name', 'NAME', 250, 'Nombre'],
  ['alias', 'ALIAS', 250, 'Alias'],
  ['businessArea', 'BUSINESS_AREA', 250, 'Área de negocio'],
  ['subprocessType', 'SUBPROCESS_TYPE', 250, 'Tipo de subproceso'],
  ['criticality', 'CRITICALITY', 250, 'Criticidad'],
  ['automationLevel', 'AUTOMATION_LEVEL', 250, 'Grado de automatización'],
  ['periodicity', 'PERIODICITY', 250, 'Periodicidad'],
  ['description', 'DESCRIPTION', 4000, 'Descripción'],
  ['objective', 'OBJECTIVE', 4000, 'Objetivo'],
  ['scope', 'SCOPE', 4000, 'Alcance'],
  ['inputs', 'INPUTS', 4000, 'Entradas'],
  ['outputs', 'OUTPUTS', 4000, 'Salidas'],
  ['suppliers', 'SUPPLIERS', 4000, 'Proveedores'],
  ['clients', 'CLIENTS', 4000, 'Clientes'],
  ['involvedParties', 'INVOLVED_PARTIES', 4000, 'Involucrados'],
  ['documents', 'DOCUMENTS', 4000, 'Documentos'],
  ['systemsUsed', 'SYSTEMS_USED', 4000, 'Sistemas utilizados'],
  ['indicators', 'INDICATORS', 4000, 'Indicadores'],
  ['improvementOpportunities', 'IMPROVEMENT_OPPORTUNITIES', 4000, 'Oportunidades de mejora'],
  ['startsWhen', 'STARTS_WHEN', 4000, 'Cuándo inicia'],
  ['endsWhen', 'ENDS_WHEN', 4000, 'Cuándo termina'],
  ['developmentPlan', 'DEVELOPMENT_PLAN', 4000, 'Plan de desarrollo'],
  ['operation', 'OPERATION', 4000, 'Operación del proceso'],
  ['design', 'DESIGN', 4000, 'Diseño del proceso'],
  ['validation', 'VALIDATION', 4000, 'Validación del proceso'],
  ['bpmnModelReference', 'BPMN_MODEL_REFERENCE', 4000, 'Modelo del proceso (BPMN)']
] as const;

export const PROCESS_KEYS = [
  'macroprocessId', 'processTypeId', 'parentProcessId', 'responsibleUnitId', 'participants', 'risks',
  ...FICHA_FIELDS.map(([key]) => key)
];


export interface UnitAssociation { unitId: number; role: 'RESPONSABLE' | 'PARTICIPANTE'; unitFunction: string | null }
