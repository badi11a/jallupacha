import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiDialogService, UiMessageComponent } from './shared/ui';
import { MvpV14Api, MapFamily, MapMacroprocess } from './mvp-v14-api.service';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const DESCRIPTIONS: Record<string, string> = {
  'Planificación y Gestión Estratégica': 'Define el rumbo institucional y orienta la planificación, seguimiento y desarrollo de la entidad.',
  'Aseguramiento Institucional de la Calidad': 'Promueve el aseguramiento de la calidad, la evaluación institucional y los procesos de acreditación.',
  'Relaciones y Comunicaciones Corporativas': 'Gestiona la identidad institucional, el posicionamiento y la comunicación con sus públicos de interés.',
  'Gobierno Digital y Tecnologías': 'Impulsa la modernización digital, gobierno de datos y soporte tecnológico de la institución.',
  'Gestión Jurídica y Cumplimiento Normativo': 'Resguarda la legalidad institucional, los actos oficiales y el cumplimiento normativo aplicable.',
  'Docencia y Formación de Pregrado y Postgrado': 'Acompaña la trayectoria formativa integral y el desarrollo técnico y profesional de los participantes.',
  'Investigación, Innovación y Creación': 'Promueve la generación de conocimiento científico, tecnológico, transferencia e innovación.',
  'Vinculación con el Medio y Extensión': 'Articula a la institución con el entorno mediante vinculación social y colaboración territorial.',
  'Gestión de Personas y Desarrollo del Talento': 'Gestiona el bienestar, desarrollo profesional y trayectoria de las personas que integran la organización.',
  'Gestión Financiera y Presupuestaria': 'Administra con probidad y sostenibilidad los recursos presupuestarios, contables y financieros institucionales.',
  'Gestión de Infraestructura, Campus y Operaciones': 'Administra y mantiene los espacios físicos, servicios generales y operaciones para el funcionamiento de la entidad.'
};

@Component({
  selector: 'app-process-map',
  imports: [RouterLink, UiMessageComponent],
  templateUrl: './mvp-v14-demo.component.html',
  styleUrl: './mvp-v14-demo.component.css'
})
export class MvpV14DemoComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  private readonly dialogs = inject(UiDialogService);
  readonly map = signal<MapFamily[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter = signal('');
  readonly selectedFamily = signal<number | null>(null);

  filteredMap(): MapFamily[] {
    const term = normalize(this.filter());
    return this.map()
      .filter(family => this.selectedFamily() === null || family.id === this.selectedFamily())
      .map(family => ({ ...family, macroprocesses: family.macroprocesses.filter(macro => !term || normalize(`${macro.code} ${macro.name}`).includes(term)) }))
      .filter(family => family.macroprocesses.length > 0);
  }

  familyTone(family: MapFamily): string {
    const name = normalize(family.name);
    return name === 'misionales' ? 'mission' : name === 'de apoyo' ? 'support' : 'strategic';
  }

  macroDescription(macro: MapMacroprocess): string {
    return (macro as { description?: string }).description || DESCRIPTIONS[macro.name] || 'Orientación y desarrollo de los procesos institucionales asociados.';
  }

  processCount(macro: MapMacroprocess): number { return macro.processTypes.reduce((sum, type) => sum + type.processes.length, 0); }
  totalCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.reduce((count, macro) => count + this.processCount(macro), 0), 0); }
  typeCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.reduce((count, macro) => count + macro.processTypes.length, 0), 0); }
  macroCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.length, 0); }
  visibleCount(): number { return this.filteredMap().reduce((sum, family) => sum + family.macroprocesses.length, 0); }

  help(): void {
    void this.dialogs.confirm({ title: 'Cómo explorar el mapa',
      message: 'Busca un macroproceso por código o nombre, o filtra por su clasificación. Selecciona una tarjeta para consultar sus tipos y procesos. Desde allí puedes abrir cada ficha. Para buscar un proceso directamente, utiliza Buscar procesos.',
      confirmLabel: 'Entendido', cancelLabel: 'Cerrar' });
  }

  ngOnInit(): void {
    this.api.map().subscribe({
      next: response => { this.map.set(response.macroprocessTypes); this.loading.set(false); },
      error: () => { this.error.set('No fue posible cargar el mapa. Intenta nuevamente más tarde.'); this.loading.set(false); }
    });
  }
}
