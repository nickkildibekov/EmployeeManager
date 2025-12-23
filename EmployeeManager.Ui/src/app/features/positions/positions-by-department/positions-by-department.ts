import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PositionService } from '../position.service';
import { PositionListComponent } from '../position-list/position-list';
import { Position } from '../../../shared/models/position.model';

@Component({
  selector: 'app-positions-by-department',
  standalone: true,
  imports: [CommonModule, PositionListComponent],
  templateUrl: './positions-by-department.html',
  styleUrls: ['./positions-by-department.css'],
})
export class PositionsByDepartmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private positionService = inject(PositionService);

  positions = signal<Position[] | undefined>(undefined);
  filtered = signal<Position[] | undefined>(undefined);
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  search = signal('');
  isLoading = signal(false);
  error = signal('');

  // Expose Math for template
  Math = Math;

  ngOnInit(): void {
    const depId = Number(this.route.snapshot.paramMap.get('id')) || Number(this.route.snapshot.paramMap.get('depId'));
    if (!depId) {
      this.error.set('Invalid department id');
      return;
    }

    this.loadPositions(depId);
  }

  private loadPositions(depId: number) {
    this.isLoading.set(true);
    this.positionService.getPositionsByDepartmentId(depId).subscribe({
      next: (p) => {
        this.positions.set(p);
        this.applyFilter();
      },
      error: (err: Error) => this.error.set(err.message),
      complete: () => this.isLoading.set(false),
    });
  }

  applyFilter() {
    const list = this.positions() || [];
    const term = this.search().trim().toLowerCase();
    let filtered = list;
    if (term) filtered = list.filter((x) => x.title.toLowerCase().includes(term));
    this.total.set(filtered.length);
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    this.filtered.set(filtered.slice(start, end));
  }

  onSearch(term: string) {
    this.search.set(term);
    this.page.set(1);
    this.applyFilter();
  }

  changePage(page: number) {
    this.page.set(page);
    this.applyFilter();
  }
}
