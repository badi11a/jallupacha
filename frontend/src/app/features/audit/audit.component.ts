import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuditApiService, AuditItem } from './audit.service';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/platform';
import {
  UiBadgeComponent,
  UiBadgeTone,
  UiBreadcrumbsComponent,
  UiMessageComponent,
  UiPanelComponent,
  UiPaginationComponent
} from '../../shared/ui';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    UiBadgeComponent,
    UiBreadcrumbsComponent,
    UiMessageComponent,
    UiPanelComponent,
    UiPaginationComponent
  ],
  styleUrl: './audit.component.css',
  templateUrl: './audit.component.html'
})
export class AuditComponent implements OnInit {
  private readonly auditApi = inject(AuditApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryLoad = new Subject<void>();
  readonly auth = inject(AuthService);

  readonly items = signal<AuditItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(25);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly expandedIds = signal<Set<number>>(new Set());

  entityType = '';
  action = '';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(switchMap(params => this.retryLoad.pipe(startWith(undefined), switchMap(() => {
      this.entityType = params.get('entityType') ?? '';
      this.action = params.get('action') ?? '';
      const page = Number(params.get('page'));
      this.page.set(Number.isSafeInteger(page) && page > 0 ? page : 1);
      this.loading.set(true); this.error.set(null); this.expandedIds.set(new Set());
      return this.auditApi.list(this.page(), this.limit(), this.entityType, this.action).pipe(
        catchError(err => { this.error.set(errorMessage(err)); return of(null); })
      );
    }))), takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      if (res) { this.items.set(res.items); this.total.set(res.total); }
      this.loading.set(false);
    });
  }

  load(): void {
    const url = this.router.createUrlTree(['/auditoria'], { queryParams: { entityType: this.entityType || null, action: this.action || null, page: this.page() === 1 ? null : this.page() } });
    if (this.router.serializeUrl(url) === this.router.url) this.retryLoad.next();
    else void this.router.navigateByUrl(url);
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  clear(): void {
    this.entityType = '';
    this.action = '';
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleDetail(id: number): void {
    const current = new Set(this.expandedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedIds.set(current);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CL', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' UTC';
    } catch {
      return dateStr;
    }
  }

  formatJson(val: string | null): string {
    if (!val) return '';
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }

  getActionTone(action: string): UiBadgeTone {
    if (action.includes('APPROVED')) return 'success';
    if (action.includes('REJECTED')) return 'danger';
    if (action.includes('SUBMITTED') || action.includes('CREATED') || action.includes('NEW_VERSION')) return 'info';
    if (action.includes('UPDATED') || action.includes('CHANGE')) return 'warning';
    return 'neutral';
  }
}
