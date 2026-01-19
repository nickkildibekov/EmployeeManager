using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IDepartmentPositionRepository
    {
        Task<IEnumerable<DepartmentPosition>> GetByDepartmentIdAsync(Guid departmentId, CancellationToken cancellationToken = default);
        Task<IEnumerable<DepartmentPosition>> GetByPositionIdAsync(Guid positionId, CancellationToken cancellationToken = default);
        Task AddAsync(DepartmentPosition entity, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<DepartmentPosition> entities, CancellationToken cancellationToken = default);
        Task RemoveRangeAsync(IEnumerable<DepartmentPosition> entities, CancellationToken cancellationToken = default);
        Task SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
