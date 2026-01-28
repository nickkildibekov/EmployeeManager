using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class EmployeeRepository : Repository<Employee>, IEmployeeRepository
    {
        public EmployeeRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Employee>> GetByDepartmentIdAsync(Guid? departmentId, CancellationToken cancellationToken = default)
        {
            if (departmentId == null)
                return await _dbSet.Where(e => e.DepartmentId == null).ToListAsync(cancellationToken);
            
            return await _dbSet.Where(e => e.DepartmentId == departmentId).ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<Employee>> GetByPositionIdAsync(Guid? positionId, CancellationToken cancellationToken = default)
        {
            if (positionId == null)
                return await _dbSet.Where(e => e.PositionId == null).ToListAsync(cancellationToken);
            
            return await _dbSet.Where(e => e.PositionId == positionId).ToListAsync(cancellationToken);
        }
    }
}
