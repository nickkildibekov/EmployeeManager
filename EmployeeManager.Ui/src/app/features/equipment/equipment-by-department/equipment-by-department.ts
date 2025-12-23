import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EquipmentService } from '../equipment.service';
import { Equipment } from '../../../shared/models/equipment.model';

@Component({
  selector: 'app-equipment-by-department',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './equipment-by-department.html',
  styleUrls: ['./equipment-by-department.css'],
})
export class EquipmentByDepartmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private equipmentService = inject(EquipmentService);

  equipment = signal<Equipment[] | undefined>(undefined);
  filtered = signal<Equipment[] | undefined>(undefined);
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  search = signal('');
  isLoading = signal(false);
  error = signal('');

  // Expose Math for template
  Math = Math;

  ngOnInit(): void {
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    if (!depId) {
      this.error.set('Invalid department id');
      return;
    }

    this.loadEquipment(depId);
  }

  private loadEquipment(depId: number) {
    this.isLoading.set(true);
    this.equipmentService
      .getEquipmentByDepartment(depId, this.page(), this.pageSize(), this.search())
      .subscribe({
        next: (res) => {
          this.equipment.set(res.items);
          this.total.set(res.total);
          this.applyFilter();
        },
        error: (err: Error) => {
          console.error(err);
          this.error.set(err.message);
        },
        complete: () => this.isLoading.set(false),
      });
  }

  applyFilter() {
    const list = this.equipment() || [];
    const term = this.search().trim().toLowerCase();
    let filtered = list;
    if (term) filtered = list.filter((x) => x.name.toLowerCase().includes(term));
    this.total.set(filtered.length);
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    this.filtered.set(filtered.slice(start, end));
  }

  onSearch(term: string) {
    this.search.set(term);
    this.page.set(1);
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    if (depId) this.loadEquipment(depId);
  }

  changePage(page: number) {
    this.page.set(page);
    this.applyFilter();
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

  onAdd(payload: any) {
    const depId = Number(this.route.snapshot.paramMap.get('id'));
    const createPayload = { ...payload, departmentId: depId };
    this.equipmentService.addEquipment(createPayload).subscribe({
      next: () => this.loadEquipment(depId),
      error: (err: Error) => this.error.set(err.message),
    });
  }
}
