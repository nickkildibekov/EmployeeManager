using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IScheduleEntryRepository : IRepository<ScheduleEntry>
    {
        Task<IEnumerable<ScheduleEntry>> GetByDepartmentIdAsync(Guid departmentId, CancellationToken cancellationToken = default);
        Task<IEnumerable<ScheduleEntry>> GetByEmployeeIdAsync(Guid employeeId, CancellationToken cancellationToken = default);
    }
}
