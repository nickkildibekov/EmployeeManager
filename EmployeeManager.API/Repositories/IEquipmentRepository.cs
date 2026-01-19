using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IEquipmentRepository : IRepository<Equipment>
    {
        Task<IEnumerable<Equipment>> GetByDepartmentIdAsync(Guid? departmentId, CancellationToken cancellationToken = default);
        Task<IEnumerable<Equipment>> GetByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken = default);
        Task<bool> ExistsBySerialNumberAsync(string serialNumber, CancellationToken cancellationToken = default);
    }
}
