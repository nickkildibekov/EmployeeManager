using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class EquipmentRepository : Repository<Equipment>, IEquipmentRepository
    {
        public EquipmentRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Equipment>> GetByDepartmentIdAsync(Guid? departmentId, CancellationToken cancellationToken = default)
        {
            if (departmentId == null)
                return await _dbSet.Where(e => e.DepartmentId == null).ToListAsync(cancellationToken);
            
            return await _dbSet.Where(e => e.DepartmentId == departmentId).ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<Equipment>> GetByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken = default)
        {
            return await _dbSet.Where(e => e.CategoryId == categoryId).ToListAsync(cancellationToken);
        }

        public async Task<bool> ExistsBySerialNumberAsync(string serialNumber, CancellationToken cancellationToken = default)
        {
            return await _dbSet.AnyAsync(e => e.SerialNumber == serialNumber, cancellationToken);
        }
    }
}
