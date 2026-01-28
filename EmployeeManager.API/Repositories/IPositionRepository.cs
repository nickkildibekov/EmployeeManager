using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public interface IPositionRepository : IRepository<Position>
    {
        Task<Position?> GetByNameAsync(string title, CancellationToken cancellationToken = default);
        Task<Position> GetOrCreateUnemployedPositionAsync(CancellationToken cancellationToken = default);
    }
}
