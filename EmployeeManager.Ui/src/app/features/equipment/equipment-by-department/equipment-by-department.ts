import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EquipmentService } from '../equipment.service';
import { Equipment } from '../../../shared/models/equipment.model';
import { EquipmentCreationPayload } from '../../../shared/models/payloads';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader';

@Component({
  selector: 'app-equipment-by-department',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent],
  templateUrl: './equipment-by-department.html',
  styleUrls: ['./equipment-by-department.css'],
})
export class EquipmentByDepartmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private equipmentService = inject(EquipmentService);
  
  private searchSubject = new Subject<string>();

  equipment = signal<Equipment[] | undefined>(undefined);
  filtered = signal<Equipment[] | undefined>(undefined);
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  search = signal('');
  statusFilter = signal<'all' | 'operational' | 'out_of_service'>('all');
  isLoading = signal(false);
  error = signal('');

  // Expose Math for template
  Math = Math;

  ngOnInit(): void {
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    if (!depId || isNaN(depId)) {
      this.error.set('Invalid department id');
      return;
    }

    this.loadEquipment(depId);
    
    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(term => {
        this.search.set(term);
        this.page.set(1);
        this.loadEquipment(depId);
      });
  }

  private loadEquipment(depId: number) {
    this.isLoading.set(true);
    const isWorkParam =
      this.statusFilter() === 'all' ? null : this.statusFilter() === 'operational' ? true : false;
    this.equipmentService
      .getEquipmentByDepartment(depId, this.page(), this.pageSize(), this.search(), isWorkParam)
      .subscribe({
        next: (res) => {
          this.equipment.set(res.items);
          this.filtered.set(res.items);
          this.total.set(res.total);
        },
        error: (err: Error) => {
          console.error(err);
          this.error.set(err.message);
        },
        complete: () => this.isLoading.set(false),
      });
  }

  applyFilter() {
    // Server-side filtering now; keep method for compatibility
    const list = this.equipment() || [];
    this.filtered.set(list);
  }

  onSearch(term: string) {
    this.searchSubject.next(term);
  }

  changePage(page: number) {
    this.page.set(page);
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    if (depId) this.loadEquipment(depId);
  }

  onStatusChange(value: string) {
    this.statusFilter.set(value as 'all' | 'operational' | 'out_of_service');
    this.page.set(1);
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    if (depId) this.loadEquipment(depId);
  }

  onDelete(eqId: number) {
    this.equipmentService.deleteEquipment(eqId).subscribe({
      next: () => {
        const depId = Number(this.route.snapshot.paramMap.get('id'));
        if (depId) this.loadEquipment(depId);
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  onAdd(payload: Omit<EquipmentCreationPayload, 'departmentId'>) {
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    const createPayload: EquipmentCreationPayload = { ...payload, departmentId: depId };
    this.equipmentService.addEquipment(createPayload).subscribe({
      next: () => this.loadEquipment(depId),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  onEquipmentSelected(eqId: number) {
    this.router.navigate(['/equipment', eqId]);
  }
}
