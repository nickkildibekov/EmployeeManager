import { Component, signal } from '@angular/core';
import { DepartmentListComponent } from './features/departments/department-list/department-list';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('EmployeeManager.Ui');

  isEditing = signal(true);

  toggleEdit(): void {
    this.isEditing.update((val) => !val);
  }
}
