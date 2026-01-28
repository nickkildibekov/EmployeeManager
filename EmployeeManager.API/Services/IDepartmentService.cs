using EmployeeManager.API.DTO;

namespace EmployeeManager.API.Services
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentDTO>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<DepartmentDTO?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<DepartmentDTO> CreateAsync(DepartmentDTO departmentDto, CancellationToken cancellationToken = default);
        Task<DepartmentDTO?> UpdateAsync(Guid id, DepartmentDTO departmentDto, CancellationToken cancellationToken = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
