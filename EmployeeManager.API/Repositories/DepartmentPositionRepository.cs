using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class DepartmentPositionRepository : IDepartmentPositionRepository
    {
        private readonly AppDbContext _context;
        private readonly DbSet<DepartmentPosition> _dbSet;

        public DepartmentPositionRepository(AppDbContext context)
        {
            _context = context;
            _dbSet = context.Set<DepartmentPosition>();
        }

        public async Task<IEnumerable<DepartmentPosition>> GetByDepartmentIdAsync(Guid departmentId, CancellationToken cancellationToken = default)
        {
            return await _dbSet.Where(dp => dp.DepartmentId == departmentId).ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<DepartmentPosition>> GetByPositionIdAsync(Guid positionId, CancellationToken cancellationToken = default)
        {
            return await _dbSet.Where(dp => dp.PositionId == positionId).ToListAsync(cancellationToken);
        }

        public async Task AddAsync(DepartmentPosition entity, CancellationToken cancellationToken = default)
        {
            await _dbSet.AddAsync(entity, cancellationToken);
        }

        public async Task AddRangeAsync(IEnumerable<DepartmentPosition> entities, CancellationToken cancellationToken = default)
        {
            await _dbSet.AddRangeAsync(entities, cancellationToken);
        }

        public async Task RemoveRangeAsync(IEnumerable<DepartmentPosition> entities, CancellationToken cancellationToken = default)
        {
            _dbSet.RemoveRange(entities);
        }

        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
