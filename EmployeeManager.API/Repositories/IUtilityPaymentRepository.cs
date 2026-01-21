using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IUtilityPaymentRepository : IRepository<UtilityPayment>
    {
        Task<UtilityPayment?> GetLatestByDepartmentAndTypeAsync(
            Guid departmentId, 
            PaymentType paymentType, 
            CancellationToken cancellationToken = default);
        
        Task<IEnumerable<UtilityPayment>> GetByDepartmentAsync(
            Guid departmentId, 
            CancellationToken cancellationToken = default);
        
        Task<IEnumerable<UtilityPayment>> GetByTypeAsync(
            PaymentType paymentType, 
            CancellationToken cancellationToken = default);
    }
}
