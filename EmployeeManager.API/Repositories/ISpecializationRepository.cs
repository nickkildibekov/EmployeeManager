using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface ISpecializationRepository : IRepository<Specialization>
    {
        Task<Specialization?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    }
}
