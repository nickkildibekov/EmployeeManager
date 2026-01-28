using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class ScheduleEntryRepository : Repository<ScheduleEntry>, IScheduleEntryRepository
    {
        public ScheduleEntryRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<ScheduleEntry>> GetByDepartmentIdAsync(Guid departmentId, CancellationToken cancellationToken = default)
        {
            return await _dbSet.Where(s => s.DepartmentId == departmentId).ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<ScheduleEntry>> GetByEmployeeIdAsync(Guid employeeId, CancellationToken cancellationToken = default)
        {
            return await _dbSet.Where(s => s.EmployeeId == employeeId).ToListAsync(cancellationToken);
        }
    }
}
