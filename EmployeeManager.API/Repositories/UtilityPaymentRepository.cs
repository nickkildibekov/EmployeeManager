using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class UtilityPaymentRepository : Repository<UtilityPayment>, IUtilityPaymentRepository
    {
        public UtilityPaymentRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<UtilityPayment?> GetLatestByDepartmentAndTypeAsync(
            Guid departmentId, 
            PaymentType paymentType, 
            CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .Where(p => p.DepartmentId == departmentId && p.PaymentType == paymentType)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<IEnumerable<UtilityPayment>> GetByDepartmentAsync(
            Guid departmentId, 
            CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .Where(p => p.DepartmentId == departmentId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<UtilityPayment>> GetByTypeAsync(
            PaymentType paymentType, 
            CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .Where(p => p.PaymentType == paymentType)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync(cancellationToken);
        }
    }
}
