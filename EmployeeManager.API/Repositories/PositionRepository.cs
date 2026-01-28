using EmployeeManager.API.Data;
using EmployeeManager.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Repositories
{
    public class PositionRepository : Repository<Position>, IPositionRepository
    {
        public PositionRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Position?> GetByNameAsync(string title, CancellationToken cancellationToken = default)
        {
            return await _dbSet
                .FirstOrDefaultAsync(p => p.Title == title, cancellationToken);
        }

        public async Task<Position> GetOrCreateUnemployedPositionAsync(CancellationToken cancellationToken = default)
        {
            var unemployed = await _dbSet
                .FirstOrDefaultAsync(p => p.Title == "Unemployed" || p.Title == "Без Посади", cancellationToken);
            
            if (unemployed == null)
            {
                unemployed = new Position { Title = "Unemployed" };
                await AddAsync(unemployed, cancellationToken);
            }
            return unemployed;
        }
    }
}
