using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IEmployeeRepository : IRepository<Employee>
    {
        Task<IEnumerable<Employee>> GetByDepartmentIdAsync(Guid? departmentId, CancellationToken cancellationToken = default);
        Task<IEnumerable<Employee>> GetByPositionIdAsync(Guid? positionId, CancellationToken cancellationToken = default);
    }
}
