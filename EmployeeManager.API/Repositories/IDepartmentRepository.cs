using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IDepartmentRepository : IRepository<Department>
    {
        Task<Department?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
        Task<Department?> GetByIdWithRelationsAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Department?> GetReserveDepartmentAsync(CancellationToken cancellationToken = default);
        Task<Department> GetOrCreateReserveDepartmentAsync(CancellationToken cancellationToken = default);
    }
}
