import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { Employee } from '../../shared/models/employee.model';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeeService],
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add employee', () => {
    const mockEmployee: Employee = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      callSign: 'JD001',
      phoneNumber: '1234567890',
      specializationId: 1,
      hireDate: new Date(),
    };

    const employeeData = {
      firstName: 'John',
      lastName: 'Doe',
      callSign: 'JD001',
      phoneNumber: '1234567890',
      specializationId: 1,
    };

    service.addEmployee(employeeData).subscribe((employee) => {
      expect(employee).toEqual(mockEmployee);
    });

    const req = httpMock.expectOne('/api/Employees/');
    expect(req.request.method).toBe('POST');
    req.flush(mockEmployee);
  });

  it('should get employees by department', () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          callSign: 'JD001',
          phoneNumber: '1234567890',
          specializationId: 1,
          hireDate: new Date(),
        },
      ],
      total: 1,
    };

    service.getEmployeesByDepartment(1).subscribe((response) => {
      expect(response.items.length).toBe(1);
      expect(response.total).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/api/Employees/') && request.params.get('departmentId') === '1');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should delete employee', () => {
    const employeeId = 1;

    service.deleteEmployee(employeeId).subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`/api/Employees/${employeeId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should handle error when adding employee', () => {
    const employeeData = {
      firstName: 'John',
      lastName: 'Doe',
      callSign: 'JD001',
      phoneNumber: '1234567890',
      specializationId: 1,
    };

    service.addEmployee(employeeData).subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
      },
    });

    const req = httpMock.expectOne('/api/Employees/');
    req.flush({ message: 'Error' }, { status: 400, statusText: 'Bad Request' });
  });
});
