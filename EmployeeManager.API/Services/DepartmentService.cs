using EmployeeManager.API.Data;
using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Services
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IPositionRepository _positionRepository;
        private readonly IEmployeeRepository _employeeRepository;
        private readonly IEquipmentRepository _equipmentRepository;
        private readonly IDepartmentPositionRepository _departmentPositionRepository;
        private readonly AppDbContext _context;

        public DepartmentService(
            IDepartmentRepository departmentRepository,
            IPositionRepository positionRepository,
            IEmployeeRepository employeeRepository,
            IEquipmentRepository equipmentRepository,
            IDepartmentPositionRepository departmentPositionRepository,
            AppDbContext context)
        {
            _departmentRepository = departmentRepository;
            _positionRepository = positionRepository;
            _employeeRepository = employeeRepository;
            _equipmentRepository = equipmentRepository;
            _departmentPositionRepository = departmentPositionRepository;
            _context = context;
        }

        private IQueryable<Department> GetDepartmentQuery()
        {
            return _context.Departments
                .Include(d => d.DepartmentPositions!)
                    .ThenInclude(dp => dp.Position)
                .Include(d => d.Employees!)
                    .ThenInclude(e => e.Position)
                .Include(d => d.Employees!)
                    .ThenInclude(e => e.Specialization)
                .Include(d => d.Equipments!)
                    .ThenInclude(e => e.Category)
                .AsNoTracking();
        }

        public async Task<IEnumerable<DepartmentDTO>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            var data = await GetDepartmentQuery()
                .OrderBy(d => d.Name)
                .Select(d => new DepartmentDTO
                {
                    Id = d.Id,
                    Name = d.Name,
                    Positions = d.DepartmentPositions!
                        .Select(dp => new PositionDTO
                        {
                            Id = dp.Position!.Id,
                            Title = dp.Position.Title
                        }).ToList(),
                    Employees = d.Employees!.Select(e => new EmployeeDTO
                    {
                        Id = e.Id,
                        FirstName = e.FirstName,
                        LastName = e.LastName,
                        CallSign = e.CallSign,
                        PhoneNumber = e.PhoneNumber,
                        DepartmentId = e.DepartmentId,
                        DepartmentName = d.Name,
                        PositionId = e.PositionId,
                        PositionName = e.Position != null ? e.Position.Title : null,
                        SpecializationId = e.SpecializationId,
                        SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                    }).ToList(),
                    Equipments = d.Equipments!
                        .Select(eq => new EquipmentDTO
                        {
                            Id = eq.Id,
                            Name = eq.Name,
                            SerialNumber = eq.SerialNumber,
                            PurchaseDate = eq.PurchaseDate,
                            Status = eq.Status,
                            Description = eq.Description,
                            CategoryId = eq.CategoryId,
                            CategoryName = eq.Category!.Name,
                            DepartmentId = eq.DepartmentId,
                            DepartmentName = d.Name,
                        }).ToList()
                })
                .ToListAsync(cancellationToken);

            return data;
        }

        public async Task<DepartmentDTO?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var reserveDept = await _departmentRepository.GetReserveDepartmentAsync(cancellationToken);

            var dep = await GetDepartmentQuery()
                .Where(d => d.Id == id)
                .FirstOrDefaultAsync(cancellationToken);

            if (dep == null)
                return null;

            // Get employees - for Reserve department, also include employees with NULL DepartmentId
            var employeesQuery = _context.Employees
                .Include(e => e.Position)
                .Include(e => e.Specialization)
                .AsQueryable();

            if (reserveDept != null && dep.Id == reserveDept.Id)
            {
                employeesQuery = employeesQuery.Where(e => e.DepartmentId == null || e.DepartmentId == dep.Id);
            }
            else
            {
                employeesQuery = employeesQuery.Where(e => e.DepartmentId == dep.Id);
            }

            var employees = await employeesQuery
                .AsNoTracking()
                .Select(e => new EmployeeDTO
                {
                    Id = e.Id,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    CallSign = e.CallSign,
                    PhoneNumber = e.PhoneNumber,
                    DepartmentId = e.DepartmentId ?? (reserveDept != null ? reserveDept.Id : null),
                    DepartmentName = dep.Name,
                    PositionId = e.PositionId,
                    PositionName = e.Position != null ? e.Position.Title : null,
                    SpecializationId = e.SpecializationId,
                    SpecializationName = e.Specialization != null ? e.Specialization.Name : null
                })
                .ToListAsync(cancellationToken);

            var depDto = new DepartmentDTO
            {
                Id = dep.Id,
                Name = dep.Name,
                Positions = (dep.DepartmentPositions ?? Enumerable.Empty<DepartmentPosition>())
                    .Select(dp => new PositionDTO
                    {
                        Id = dp.Position!.Id,
                        Title = dp.Position.Title
                    }).ToList(),
                Employees = employees,
                Equipments = (dep.Equipments ?? Enumerable.Empty<Equipment>())
                    .Select(eq => new EquipmentDTO
                    {
                        Id = eq.Id,
                        Name = eq.Name,
                        SerialNumber = eq.SerialNumber,
                        PurchaseDate = eq.PurchaseDate,
                        Status = eq.Status,
                        Description = eq.Description,
                        CategoryId = eq.CategoryId,
                        CategoryName = eq.Category!.Name,
                        DepartmentId = eq.DepartmentId,
                        DepartmentName = dep.Name,
                    }).ToList()
            };

            return depDto;
        }

        public async Task<DepartmentDTO> CreateAsync(DepartmentDTO departmentDto, CancellationToken cancellationToken = default)
        {
            var department = new Department { Name = departmentDto.Name };
            var created = await _departmentRepository.AddAsync(department, cancellationToken);
            return new DepartmentDTO { Id = created.Id, Name = created.Name };
        }

        public async Task<DepartmentDTO?> UpdateAsync(Guid id, DepartmentDTO departmentDto, CancellationToken cancellationToken = default)
        {
            var department = await _departmentRepository.GetByIdAsync(id, cancellationToken);
            if (department == null) return null;

            department.Name = departmentDto.Name;
            await _departmentRepository.UpdateAsync(department, cancellationToken);
            return new DepartmentDTO { Id = department.Id, Name = department.Name };
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var reserve = await _departmentRepository.GetReserveDepartmentAsync(cancellationToken);
            if (reserve != null && id == reserve.Id)
            {
                return false; // Cannot delete Reserve
            }

            var department = await _departmentRepository.GetByIdWithRelationsAsync(id, cancellationToken);
            if (department == null) return false;

            var reserveDept = await _departmentRepository.GetOrCreateReserveDepartmentAsync(cancellationToken);
            var unemployedPosition = await _positionRepository.GetOrCreateUnemployedPositionAsync(cancellationToken);

            // Move employees to Reserve
            if (department.Employees?.Any() == true)
            {
                foreach (var employee in department.Employees)
                {
                    employee.DepartmentId = reserveDept.Id;
                    employee.PositionId = unemployedPosition.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
            }

            // Move equipment to Reserve
            if (department.Equipments?.Any() == true)
            {
                foreach (var equipment in department.Equipments)
                {
                    equipment.DepartmentId = reserveDept.Id;
                }
                await _context.SaveChangesAsync(cancellationToken);
            }

            // Remove DepartmentPositions
            if (department.DepartmentPositions?.Any() == true)
            {
                await _departmentPositionRepository.RemoveRangeAsync(department.DepartmentPositions, cancellationToken);
                await _departmentPositionRepository.SaveChangesAsync(cancellationToken);
            }

            await _departmentRepository.DeleteAsync(department, cancellationToken);
            return true;
        }
    }
}
