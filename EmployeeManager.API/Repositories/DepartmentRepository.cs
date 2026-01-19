using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class DepartmentRepository : Repository<Department>, IDepartmentRepository
    {
        public DepartmentRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Department?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .FirstOrDefaultAsync(d => d.Name == name, cancellationToken);
        }

        public async Task<Department?> GetByIdWithRelationsAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .Include(d => d.Employees)
                .Include(d => d.Equipments)
                .Include(d => d.DepartmentPositions)
                .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        }

        public async Task<Department?> GetReserveDepartmentAsync(CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .FirstOrDefaultAsync(
                    d => d.Name == "Reserve" || d.Name == "Резерв" || d.Name == "Global Reserve",
                    cancellationToken);
        }

        public async Task<Department> GetOrCreateReserveDepartmentAsync(CancellationToken cancellationToken = default)
        {
            var reserve = await GetReserveDepartmentAsync(cancellationToken);
            if (reserve == null)
            {
                reserve = new Department { Name = "Reserve" };
                await AddAsync(reserve, cancellationToken);
            }
            return reserve;
        }
    }
}
