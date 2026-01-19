import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EquipmentService } from './equipment.service';
import { Equipment } from '../../shared/models/equipment.model';
import { EquipmentCategory } from '../../shared/models/equipmentCategory.model';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EquipmentService, ErrorHandlerService],
    });
    service = TestBed.inject(EquipmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all equipment', () => {
    const mockEquipment: Equipment[] = [
      {
        id: 1,
        name: 'Laptop',
        description: 'Dell Laptop',
        categoryId: 1,
        purchaseDate: new Date().toISOString(),
        status: 'Used',
        measurement: 'Unit',
        amount: 1,
      },
    ];

    service.getAllEquipment().subscribe((equipment) => {
      expect(equipment.length).toBe(1);
      expect(equipment[0].name).toBe('Laptop');
    });

    const req = httpMock.expectOne('/api/Equipment/');
    expect(req.request.method).toBe('GET');
    req.flush(mockEquipment);
  });

  it('should get equipment by department', () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          name: 'Laptop',
          description: 'Dell Laptop',
          categoryId: 1,
          purchaseDate: new Date().toISOString(),
          status: 'Used',
          measurement: 'Unit',
          amount: 1,
        },
      ],
      total: 1,
    };

    service.getEquipmentByDepartment(1).subscribe((response) => {
      expect(response.items.length).toBe(1);
      expect(response.total).toBe(1);
    });

    const req = httpMock.expectOne((request) => request.url.includes('/api/Equipment/') && request.params.get('departmentId') === '1');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should create equipment', () => {
    const mockEquipment: Equipment = {
      id: 1,
      name: 'Laptop',
      description: 'Dell Laptop',
      categoryId: 1,
      purchaseDate: new Date().toISOString(),
      status: 'Used',
      measurement: 'Unit',
      amount: 1,
    };

    const equipmentData = {
      name: 'Laptop',
      description: 'Dell Laptop',
      categoryId: 1,
      purchaseDate: new Date().toISOString(),
      status: 'Used',
      measurement: 'Unit',
      amount: 1,
    };

    service.addEquipment(equipmentData).subscribe((equipment) => {
      expect(equipment).toEqual(mockEquipment);
    });

    const req = httpMock.expectOne('/api/Equipment/');
    expect(req.request.method).toBe('POST');
    req.flush(mockEquipment);
  });

  it('should get all categories', () => {
    const mockCategories: EquipmentCategory[] = [
      { id: 1, name: 'Computers', description: 'Computer equipment' },
    ];

    service.getAllCategories().subscribe((categories) => {
      expect(categories.length).toBe(1);
      expect(categories[0].name).toBe('Computers');
    });

    const req = httpMock.expectOne('/api/EquipmentCategories/');
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);
  });

  it('should delete equipment', () => {
    const equipmentId = 1;

    service.deleteEquipment(equipmentId).subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`/api/Equipment/${equipmentId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
